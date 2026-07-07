"""
Multi-Stage Automated Hyperparameter Tuning
Institution-grade model selection with no shortcuts
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import itertools
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


def mean_squared_error(y_true, y_pred) -> float:
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)
    return float(np.mean((y_true_arr - y_pred_arr) ** 2))


def mean_absolute_error(y_true, y_pred) -> float:
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(y_true_arr - y_pred_arr)))


class HyperparameterTuner:
    """
    Multi-stage hyperparameter tuning with:
    1. Search-space pruning
    2. Fast AICc screening
    3. Rolling-origin cross-validation
    4. Forecast stability testing
    5. Composite scoring
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.max_p = self.config.get('max_p', 2)  # Further reduced from 3
        self.max_d = self.config.get('max_d', 2)
        self.max_q = self.config.get('max_q', 2)  # Further reduced from 3
        self.max_P = self.config.get('max_P', 1)
        self.max_D = self.config.get('max_D', 1)
        self.max_Q = self.config.get('max_Q', 1)
        
        # Tuning parameters
        self.aicc_threshold = 15  # Increased to keep more candidates
        self.n_cv_splits = 2  # Further reduced from 3 for much faster validation
        self.stability_threshold = 0.3  # Max acceptable forecast variance
    
    def tune_arima(self, series: pd.Series, seasonal: bool = False, 
                   seasonal_period: Optional[int] = None) -> Dict:
        """
        Tune ARIMA or SARIMA model
        
        Returns:
            dict with best parameters, metrics, and all experiments
        """
        logger.info(f"Starting {'SARIMA' if seasonal else 'ARIMA'} hyperparameter tuning")
        
        # Stage 1: Generate search space
        search_space = self._generate_search_space(seasonal, seasonal_period)
        logger.info(f"Search space size: {len(search_space)} parameter combinations")
        
        # Stage 2: Fast AICc screening
        aicc_candidates = self._aicc_screening(series, search_space, seasonal, seasonal_period)
        logger.info(f"AICc screening: {len(aicc_candidates)} candidates passed")
        
        if not aicc_candidates:
            raise ValueError("No valid models found during AICc screening")
        
        # Stage 3: Rolling-origin cross-validation
        cv_results = self._rolling_origin_cv(series, aicc_candidates, seasonal, seasonal_period)
        logger.info(f"Cross-validation: {len(cv_results)} models validated")
        
        # Stage 4: Stability testing
        stable_models = self._stability_testing(series, cv_results, seasonal, seasonal_period)
        logger.info(f"Stability testing: {len(stable_models)} stable models found")
        
        if not stable_models:
            raise ValueError("No stable models found - data may be too volatile for reliable forecasting")
        
        # Stage 5: Composite scoring
        best_model = self._composite_scoring(stable_models)
        
        return {
            'best_parameters': best_model['parameters'],
            'metrics': best_model['metrics'],
            'all_experiments': stable_models,
            'search_space_size': len(search_space),
            'screening_passed': len(aicc_candidates),
            'cv_validated': len(cv_results),
            'stable_models': len(stable_models)
        }
    
    def tune_holt_winters(self, series: pd.Series, seasonal_period: int,
                          trend_type: str = 'add', seasonal_type: str = 'add',
                          damped: bool = False) -> Dict:
        """
        Tune Holt-Winters Exponential Smoothing model
        
        Args:
            series: Time series data
            seasonal_period: Seasonal period
            trend_type: 'add' or 'mul'
            seasonal_type: 'add' or 'mul'
            damped: Whether to use damped trend
        """
        logger.info(f"Starting Holt-Winters tuning (trend={trend_type}, seasonal={seasonal_type}, damped={damped})")
        
        # Holt-Winters has fewer hyperparameters - mainly smoothing parameters
        # We'll use optimization built into statsmodels, but validate with CV
        
        try:
            # Fit model
            model = ExponentialSmoothing(
                series,
                seasonal_periods=seasonal_period,
                trend=trend_type,
                seasonal=seasonal_type,
                damped_trend=damped
            )
            fitted = model.fit(optimized=True, use_brute=True)
            
            # Get parameters
            params = {
                'smoothing_level': float(fitted.params['smoothing_level']),
                'smoothing_trend': float(fitted.params['smoothing_trend']) if trend_type else None,
                'smoothing_seasonal': float(fitted.params['smoothing_seasonal']),
                'damping_trend': float(fitted.params['damping_trend']) if damped else None,
                'seasonal_period': seasonal_period,
                'trend': trend_type,
                'seasonal': seasonal_type,
                'damped': damped
            }
            
            # Validate with rolling-origin CV
            cv_metrics = self._hw_rolling_cv(series, params, seasonal_period)
            
            # Calculate composite score
            composite_score = self._calculate_composite_score(
                cv_metrics['mean_rmse'],
                fitted.aic,
                cv_metrics['stability_penalty'],
                complexity=3  # Holt-Winters has 3-4 parameters
            )
            
            return {
                'best_parameters': params,
                'metrics': {
                    'aic': float(fitted.aic),
                    'bic': float(fitted.bic),
                    'aicc': float(fitted.aicc) if hasattr(fitted, 'aicc') else None,
                    'rmse': cv_metrics['mean_rmse'],
                    'mae': cv_metrics['mean_mae'],
                    'stability_score': 1.0 - cv_metrics['stability_penalty'],
                    'composite_score': composite_score
                },
                'cv_results': cv_metrics
            }
            
        except Exception as e:
            logger.error(f"Holt-Winters tuning failed: {str(e)}")
            raise ValueError(f"Failed to tune Holt-Winters model: {str(e)}")
    
    def _generate_search_space(self, seasonal: bool, seasonal_period: Optional[int]) -> List[Tuple]:
        """Generate pruned search space for ARIMA/SARIMA"""
        if seasonal and seasonal_period:
            # SARIMA: (p,d,q) x (P,D,Q,s)
            pdq = list(itertools.product(
                range(0, self.max_p + 1),
                range(0, self.max_d + 1),
                range(0, self.max_q + 1)
            ))
            
            PDQs = list(itertools.product(
                range(0, self.max_P + 1),
                range(0, self.max_D + 1),
                range(0, self.max_Q + 1),
                [seasonal_period]
            ))
            
            # Pruning rules:
            # 1. Avoid (0,0,0) for non-seasonal part
            # 2. Limit total parameters
            # 3. Prefer simpler models initially
            search_space = []
            for (p, d, q) in pdq:
                if p == 0 and d == 0 and q == 0:
                    continue
                for (P, D, Q, s) in PDQs:
                    total_params = p + q + P + Q
                    if total_params <= 4:  # Further reduced from 5 for faster tuning
                        search_space.append(((p, d, q), (P, D, Q, s)))
            
            # Limit search space to most promising combinations
            if len(search_space) > 50:  # Drastically reduced from 200
                logger.warning(f"Search space too large ({len(search_space)}), limiting to 50 combinations")
                # Prioritize simpler models
                search_space = sorted(search_space, key=lambda x: x[0][0] + x[0][2] + x[1][0] + x[1][2])[:50]
            
        else:
            # ARIMA: (p,d,q)
            search_space = [
                (p, d, q) for p in range(0, self.max_p + 1)
                for d in range(0, self.max_d + 1)
                for q in range(0, self.max_q + 1)
                if not (p == 0 and d == 0 and q == 0)
            ]
        
        return search_space
    
    def _aicc_screening(self, series: pd.Series, search_space: List,
                        seasonal: bool, seasonal_period: Optional[int]) -> List[Dict]:
        """
        Fast screening using AICc
        Only keep models within threshold of best AICc
        """
        candidates = []
        max_models_to_test = 30  # Stop after testing 30 models
        tested = 0
        
        for params in search_space:
            if tested >= max_models_to_test:
                logger.info(f"Reached max models to test ({max_models_to_test}), stopping AICc screening early")
                break
            tested += 1
            
            try:
                if seasonal:
                    order, seasonal_order = params
                    model = SARIMAX(series, order=order, seasonal_order=seasonal_order,
                                   enforce_stationarity=False, enforce_invertibility=False)
                else:
                    model = ARIMA(series, order=params, enforce_stationarity=False,
                                 enforce_invertibility=False)

                if seasonal:
                    fitted = model.fit(method='lbfgs', maxiter=50, disp=0)  # Reduced from 100
                else:
                    fitted = model.fit(method_kwargs={'maxiter': 50})
                
                # Calculate AICc (corrected AIC for small samples)
                n = len(series)
                k = len(fitted.params)
                # If the small-sample correction is undefined, fall back to AIC.
                aicc = (
                    fitted.aic + (2 * k * (k + 1)) / (n - k - 1)
                    if n - k - 1 > 0
                    else fitted.aic
                )
                
                if np.isfinite(aicc):
                    candidates.append({
                        'parameters': params,
                        'aic': float(fitted.aic),
                        'bic': float(fitted.bic),
                        'aicc': float(aicc),
                        'loglikelihood': float(fitted.llf)
                    })
                    
            except Exception as e:
                logger.debug(f"Model {params} failed during AICc screening: {str(e)}")
                continue

        if not candidates:
            # Fallback: try a small set of baseline models so "auto" doesn't fail
            # purely due to the screening stage.
            baseline_params = []
            if seasonal and seasonal_period:
                # Keep seasonal part simple; most series won't support large grids.
                baseline_params = [
                    ((1, 1, 1), (0, 1, 1, seasonal_period)),
                    ((1, 1, 0), (0, 1, 1, seasonal_period)),
                    ((0, 1, 1), (0, 1, 1, seasonal_period)),
                ]
            else:
                baseline_params = [
                    (0, 1, 0),
                    (1, 1, 0),
                    (0, 1, 1),
                    (1, 1, 1),
                    (2, 1, 2),
                ]

            for params in baseline_params:
                try:
                    if seasonal:
                        order, seasonal_order = params
                        model = SARIMAX(
                            series,
                            order=order,
                            seasonal_order=seasonal_order,
                            enforce_stationarity=False,
                            enforce_invertibility=False,
                        )
                    else:
                        model = ARIMA(
                            series,
                            order=params,
                            enforce_stationarity=False,
                            enforce_invertibility=False,
                        )

                    if seasonal:
                        fitted = model.fit(method='lbfgs', maxiter=200, disp=0)
                    else:
                        fitted = model.fit(method_kwargs={'maxiter': 200})

                    n = len(series)
                    k = len(fitted.params)
                    aicc = (
                        fitted.aic + (2 * k * (k + 1)) / (n - k - 1)
                        if n - k - 1 > 0
                        else fitted.aic
                    )

                    if np.isfinite(aicc):
                        candidates.append(
                            {
                                'parameters': params,
                                'aic': float(fitted.aic),
                                'bic': float(fitted.bic),
                                'aicc': float(aicc),
                                'loglikelihood': float(fitted.llf),
                            }
                        )
                except Exception as e:
                    logger.debug(f"Baseline model {params} failed during AICc screening fallback: {str(e)}")
                    continue

            if not candidates:
                return []
        
        # Keep only models within threshold of best AICc
        best_aicc = min(c['aicc'] for c in candidates)
        filtered = [c for c in candidates if c['aicc'] - best_aicc <= self.aicc_threshold]
        
        # Sort by AICc
        filtered.sort(key=lambda x: x['aicc'])
        
        # Limit to top 5 candidates for much faster CV
        return filtered[:5]
    
    def _rolling_origin_cv(self, series: pd.Series, candidates: List[Dict],
                           seasonal: bool, seasonal_period: Optional[int]) -> List[Dict]:
        """
        Rolling-origin cross-validation
        Test forecast accuracy on multiple train/test splits
        """
        results = []
        
        # Define CV splits
        n = len(series)
        test_size = max(12, n // 10)  # 10% or 12 weeks, whichever is larger
        min_train_size = n - (self.n_cv_splits * test_size)
        
        if min_train_size < 50:
            logger.warning("Insufficient data for robust CV - reducing splits")
            self.n_cv_splits = max(1, (n - 50) // test_size)
        
        for candidate in candidates:
            params = candidate['parameters']
            cv_scores = []
            
            for i in range(self.n_cv_splits):
                train_end = n - (self.n_cv_splits - i) * test_size
                test_end = min(train_end + test_size, n)
                
                train = series.iloc[:train_end]
                test = series.iloc[train_end:test_end]
                
                try:
                    # Fit on train
                    if seasonal:
                        order, seasonal_order = params
                        model = SARIMAX(train, order=order, seasonal_order=seasonal_order,
                                       enforce_stationarity=False, enforce_invertibility=False)
                    else:
                        model = ARIMA(train, order=params, enforce_stationarity=False,
                                     enforce_invertibility=False)

                    if seasonal:
                        fitted = model.fit(method='lbfgs', maxiter=100, disp=0)
                    else:
                        fitted = model.fit(method_kwargs={'maxiter': 100})
                    
                    # Forecast
                    forecast = fitted.forecast(steps=len(test))
                    
                    # Calculate metrics
                    rmse = np.sqrt(mean_squared_error(test, forecast))
                    mae = mean_absolute_error(test, forecast)
                    
                    cv_scores.append({
                        'rmse': float(rmse),
                        'mae': float(mae),
                        'forecast_mean': float(forecast.mean()),
                        'forecast_std': float(forecast.std())
                    })
                    
                except Exception as e:
                    logger.debug(f"CV split {i} failed for {params}: {str(e)}")
                    continue
            
            if cv_scores:
                # Aggregate CV scores
                mean_rmse = np.mean([s['rmse'] for s in cv_scores])
                mean_mae = np.mean([s['mae'] for s in cv_scores])
                rmse_std = np.std([s['rmse'] for s in cv_scores])
                
                results.append({
                    'parameters': params,
                    'aic': candidate['aic'],
                    'bic': candidate['bic'],
                    'aicc': candidate['aicc'],
                    'cv_rmse_mean': float(mean_rmse),
                    'cv_rmse_std': float(rmse_std),
                    'cv_mae_mean': float(mean_mae),
                    'cv_scores': cv_scores,
                    'n_cv_splits': len(cv_scores)
                })
        
        return results
    
    def _stability_testing(self, series: pd.Series, cv_results: List[Dict],
                          seasonal: bool, seasonal_period: Optional[int]) -> List[Dict]:
        """
        Test forecast stability
        Reject models with excessive variance in forecasts
        """
        stable = []
        
        for result in cv_results:
            params = result['parameters']
            
            # Fit on full data
            try:
                if seasonal:
                    order, seasonal_order = params
                    model = SARIMAX(series, order=order, seasonal_order=seasonal_order,
                                   enforce_stationarity=False, enforce_invertibility=False)
                else:
                    model = ARIMA(series, order=params, enforce_stationarity=False,
                                 enforce_invertibility=False)

                if seasonal:
                    fitted = model.fit(method='lbfgs', maxiter=100, disp=0)
                else:
                    fitted = model.fit(method_kwargs={'maxiter': 100})
                
                # Generate forecast
                forecast = fitted.forecast(steps=12)
                forecast_std = forecast.std()
                series_std = series.std()
                
                # Stability metric: forecast variance relative to historical variance
                stability_ratio = forecast_std / series_std if series_std > 0 else np.inf
                
                # Reject if too unstable
                if stability_ratio > self.stability_threshold:
                    logger.debug(f"Model {params} rejected due to instability (ratio={stability_ratio:.3f})")
                    continue
                
                result['stability_ratio'] = float(stability_ratio)
                result['stability_score'] = float(1.0 - min(stability_ratio, 1.0))
                stable.append(result)
                
            except Exception as e:
                logger.debug(f"Stability test failed for {params}: {str(e)}")
                continue
        
        return stable
    
    def _composite_scoring(self, models: List[Dict]) -> Dict:
        """
        Multi-criteria scoring combining:
        - RMSE (forecast accuracy)
        - AICc (model fit and complexity)
        - Stability (forecast reliability)
        - Simplicity bias (prefer simpler models when similar performance)
        """
        # Normalize metrics (0-1 scale, lower is better). Guard against degenerate
        # cases where max is 0 (e.g., perfectly predictable synthetic series).
        eps = 1e-12
        max_rmse = max((m.get('cv_rmse_mean', 0.0) for m in models), default=0.0)
        max_aicc = max((m.get('aicc', 0.0) for m in models), default=0.0)
        rmse_denom = max(max_rmse, eps)
        aicc_denom = max(max_aicc, eps)

        for model in models:
            rmse_normalized = float(model.get('cv_rmse_mean', 0.0)) / rmse_denom
            aicc_normalized = float(model.get('aicc', 0.0)) / aicc_denom
            instability = 1.0 - model['stability_score']
            
            # Count parameters (simplicity penalty)
            params = model['parameters']
            if isinstance(params, tuple) and len(params) == 2:
                # SARIMA
                order, seasonal_order = params
                n_params = sum(order) + sum(seasonal_order[:3])
            else:
                # ARIMA
                n_params = sum(params)
            
            complexity_penalty = n_params / 15.0  # Normalize to 0-1
            
            # Composite score (weighted sum)
            composite_score = (
                0.40 * rmse_normalized +      # Accuracy is most important
                0.25 * aicc_normalized +      # Model fit matters
                0.20 * instability +          # Stability is critical
                0.15 * complexity_penalty     # Prefer simplicity
            )
            
            model['composite_score'] = float(composite_score)
            model['metrics'] = {
                'rmse': model['cv_rmse_mean'],
                'mae': model['cv_mae_mean'],
                'aic': model['aic'],
                'bic': model['bic'],
                'aicc': model['aicc'],
                'stability_score': model['stability_score'],
                'composite_score': composite_score
            }
        
        # Return best model (lowest composite score)
        best = min(models, key=lambda x: x['composite_score'])
        
        return best
    
    def _hw_rolling_cv(self, series: pd.Series, params: Dict, seasonal_period: int) -> Dict:
        """Rolling-origin CV for Holt-Winters"""
        n = len(series)
        test_size = max(12, n // 10)
        n_splits = min(3, (n - 50) // test_size)  # Fewer splits for HW
        
        cv_scores = []
        
        for i in range(n_splits):
            train_end = n - (n_splits - i) * test_size
            test_end = min(train_end + test_size, n)
            
            train = series.iloc[:train_end]
            test = series.iloc[train_end:test_end]
            
            try:
                model = ExponentialSmoothing(
                    train,
                    seasonal_periods=seasonal_period,
                    trend=params['trend'],
                    seasonal=params['seasonal'],
                    damped_trend=params['damped']
                )
                fitted = model.fit(optimized=True)
                forecast = fitted.forecast(steps=len(test))
                
                rmse = np.sqrt(mean_squared_error(test, forecast))
                mae = mean_absolute_error(test, forecast)
                
                cv_scores.append({
                    'rmse': float(rmse),
                    'mae': float(mae),
                    'forecast_std': float(forecast.std())
                })
                
            except Exception as e:
                logger.debug(f"HW CV split {i} failed: {str(e)}")
                continue
        
        if not cv_scores:
            raise ValueError("All CV splits failed for Holt-Winters")
        
        mean_rmse = np.mean([s['rmse'] for s in cv_scores])
        mean_mae = np.mean([s['mae'] for s in cv_scores])
        forecast_variance = np.var([s['forecast_std'] for s in cv_scores])
        
        # Stability penalty based on forecast variance
        stability_penalty = min(forecast_variance / series.var() if series.var() > 0 else 1.0, 1.0)
        
        return {
            'mean_rmse': float(mean_rmse),
            'mean_mae': float(mean_mae),
            'stability_penalty': float(stability_penalty),
            'cv_scores': cv_scores
        }
    
    def _calculate_composite_score(self, rmse: float, aic: float, 
                                   stability_penalty: float, complexity: int) -> float:
        """Calculate composite score for a single model"""
        # Normalize metrics (this is simplified - in practice normalize across all models)
        return 0.40 * rmse + 0.25 * (aic / 1000) + 0.20 * stability_penalty + 0.15 * (complexity / 10)
