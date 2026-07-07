"""
Comprehensive Diagnostics Engine
Stationarity, Seasonality, and Data Quality Testing
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tsa.seasonal import STL, seasonal_decompose
from statsmodels.graphics.tsaplots import acf, pacf
from scipy import signal
from scipy.stats import normaltest, jarque_bera
import logging

logger = logging.getLogger(__name__)


class DiagnosticsEngine:
    """
    Institutional-grade diagnostics for time series data
    No shortcuts, no silent failures
    """
    
    def __init__(self):
        self.valid_seasonal_periods = [4, 13, 26, 52]  # Monthly, Quarterly, Bi-annual, Annual (weekly data)
    
    def run_full_diagnostics(self, data, exogenous_data=None):
        """
        Run complete diagnostic suite
        
        Args:
            data: List of [date, price] pairs
            exogenous_data: Optional list of [date, var1, var2, ...] pairs
            
        Returns:
            dict with comprehensive diagnostics
        """
        try:
            # Convert to pandas series
            df = pd.DataFrame(data, columns=['date', 'price'])
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date').sort_index()
            series = df['price']
            
            # Run all diagnostic tests
            diagnostics = {
                'data_quality': self._check_data_quality(series),
                'stationarity': self._test_stationarity(series),
                'seasonality': self._detect_seasonality(series),
                'normality': self._test_normality(series),
                'autocorrelation': self._analyze_autocorrelation(series),
                'spectral_analysis': self._spectral_analysis(series),
                'suitable_for_modeling': False,
                'recommendation': None,
                'warnings': []
            }
            
            # Test exogenous variables if provided
            if exogenous_data is not None:
                diagnostics['exogenous_validation'] = self._validate_exogenous(series, exogenous_data)
            
            # Determine if data is suitable for modeling
            diagnostics.update(self._evaluate_suitability(diagnostics))
            
            return diagnostics
            
        except Exception as e:
            logger.error(f"Diagnostics failed: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'suitable_for_modeling': False
            }
    
    def _check_data_quality(self, series):
        """Check for missing values, outliers, and data consistency"""
        quality = {
            'n_observations': len(series),
            'missing_values': int(series.isna().sum()),
            'missing_percentage': float(series.isna().sum() / len(series) * 100),
            'zero_values': int((series == 0).sum()),
            'negative_values': int((series < 0).sum()),
            'duplicates': int(series.index.duplicated().sum())
        }
        
        # Detect outliers using IQR method
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        outlier_mask = (series < (Q1 - 3 * IQR)) | (series > (Q3 + 3 * IQR))
        quality['outliers'] = int(outlier_mask.sum())
        quality['outlier_percentage'] = float(outlier_mask.sum() / len(series) * 100)
        
        # Check temporal consistency
        freq_counts = series.index.to_series().diff().value_counts()
        quality['temporal_consistency'] = len(freq_counts) == 1
        quality['inferred_frequency'] = str(pd.infer_freq(series.index)) if pd.infer_freq(series.index) else 'irregular'
        
        quality['quality_score'] = self._calculate_quality_score(quality)
        
        return quality
    
    def _calculate_quality_score(self, quality):
        """Calculate overall data quality score (0-100)"""
        score = 100.0
        
        # Penalize missing values
        score -= quality['missing_percentage'] * 2
        
        # Penalize excessive outliers
        if quality['outlier_percentage'] > 5:
            score -= (quality['outlier_percentage'] - 5) * 1.5
        
        # Penalize irregular frequency
        if not quality['temporal_consistency']:
            score -= 10
        
        # Penalize insufficient data
        if quality['n_observations'] < 50:
            score -= 30
        elif quality['n_observations'] < 100:
            score -= 15
        
        return max(0, min(100, score))
    
    def _test_stationarity(self, series):
        """
        Comprehensive stationarity testing using ADF and KPSS
        No single test is conclusive - use both
        """
        stationarity = {}
        
        # Augmented Dickey-Fuller test
        # H0: Unit root exists (non-stationary)
        try:
            adf_result = adfuller(series.dropna(), autolag='AIC')
            stationarity['adf'] = {
                'statistic': float(adf_result[0]),
                'pvalue': float(adf_result[1]),
                'usedlag': int(adf_result[2]),
                'nobs': int(adf_result[3]),
                'critical_values': {k: float(v) for k, v in adf_result[4].items()},
                'conclusion': 'stationary' if adf_result[1] < 0.05 else 'non-stationary'
            }
        except Exception as e:
            logger.warning(f"ADF test failed: {str(e)}")
            stationarity['adf'] = {'error': str(e)}
        
        # KPSS test
        # H0: Series is stationary
        try:
            kpss_result = kpss(series.dropna(), regression='ct', nlags='auto')
            stationarity['kpss'] = {
                'statistic': float(kpss_result[0]),
                'pvalue': float(kpss_result[1]),
                'lags': int(kpss_result[2]),
                'critical_values': {k: float(v) for k, v in kpss_result[3].items()},
                'conclusion': 'non-stationary' if kpss_result[1] < 0.05 else 'stationary'
            }
        except Exception as e:
            logger.warning(f"KPSS test failed: {str(e)}")
            stationarity['kpss'] = {'error': str(e)}
        
        # Combined conclusion
        if 'error' not in stationarity['adf'] and 'error' not in stationarity['kpss']:
            adf_stationary = stationarity['adf']['conclusion'] == 'stationary'
            kpss_stationary = stationarity['kpss']['conclusion'] == 'stationary'
            
            if adf_stationary and kpss_stationary:
                stationarity['combined_conclusion'] = 'stationary'
            elif not adf_stationary and not kpss_stationary:
                stationarity['combined_conclusion'] = 'non-stationary'
            else:
                stationarity['combined_conclusion'] = 'difference-stationary'  # Trend stationary
        
        # Test first difference
        series_diff = series.diff().dropna()
        try:
            adf_diff = adfuller(series_diff, autolag='AIC')
            stationarity['first_difference_adf_pvalue'] = float(adf_diff[1])
            stationarity['differencing_required'] = adf_diff[1] < 0.05
        except:
            stationarity['differencing_required'] = None
        
        return stationarity
    
    def _detect_seasonality(self, series):
        """
        Multi-method seasonality detection
        - STL decomposition
        - ACF analysis
        - Spectral analysis
        """
        seasonality = {
            'detected': False,
            'periods': [],
            'strength': 0.0,
            'method': None
        }
        
        if len(series) < 104:  # Need at least 2 years of weekly data
            seasonality['note'] = 'Insufficient data for robust seasonality detection'
            return seasonality
        
        # STL decomposition for each candidate period
        stl_results = []
        for period in self.valid_seasonal_periods:
            if len(series) >= 2 * period:
                try:
                    stl = STL(series, period=period, robust=True)
                    result = stl.fit()
                    
                    # Calculate strength of seasonality
                    seasonal_var = np.var(result.seasonal)
                    residual_var = np.var(result.resid)
                    strength = seasonal_var / (seasonal_var + residual_var) if (seasonal_var + residual_var) > 0 else 0
                    
                    stl_results.append({
                        'period': period,
                        'strength': float(strength),
                        'seasonal_variance': float(seasonal_var),
                        'residual_variance': float(residual_var)
                    })
                except Exception as e:
                    logger.warning(f"STL decomposition failed for period {period}: {str(e)}")
        
        seasonality['stl_analysis'] = stl_results
        
        # Find strongest seasonal component
        if stl_results:
            strongest = max(stl_results, key=lambda x: x['strength'])
            if strongest['strength'] > 0.3:  # Threshold for significant seasonality
                seasonality['detected'] = True
                seasonality['periods'] = [strongest['period']]
                seasonality['strength'] = strongest['strength']
                seasonality['method'] = 'STL'
        
        # ACF-based seasonality check
        try:
            acf_values = acf(series, nlags=min(52, len(series) // 2), fft=True)
            seasonality['acf_peaks'] = []
            
            for period in self.valid_seasonal_periods:
                if period < len(acf_values):
                    # Check if ACF at seasonal lag is significant
                    if abs(acf_values[period]) > 2 / np.sqrt(len(series)):
                        seasonality['acf_peaks'].append({
                            'period': period,
                            'acf_value': float(acf_values[period])
                        })
        except Exception as e:
            logger.warning(f"ACF seasonality check failed: {str(e)}")
        
        return seasonality
    
    def _spectral_analysis(self, series):
        """
        Frequency domain analysis using periodogram
        Identifies dominant frequencies in the data
        """
        try:
            # Remove trend and mean
            detrended = signal.detrend(series.dropna().values)
            
            # Compute periodogram
            frequencies, power = signal.periodogram(detrended)
            
            # Convert frequencies to periods
            periods = 1 / frequencies[1:]  # Skip DC component
            power = power[1:]
            
            # Find peaks in the periodogram
            peak_indices = signal.find_peaks(power, height=np.mean(power))[0]
            
            peaks = []
            for idx in peak_indices:
                period = periods[idx]
                # Only consider periods in valid range
                if 4 <= period <= 52:
                    peaks.append({
                        'period': float(period),
                        'power': float(power[idx]),
                        'frequency': float(frequencies[idx + 1])
                    })
            
            # Sort by power
            peaks = sorted(peaks, key=lambda x: x['power'], reverse=True)[:5]
            
            return {
                'dominant_periods': peaks,
                'analysis_successful': True
            }
            
        except Exception as e:
            logger.warning(f"Spectral analysis failed: {str(e)}")
            return {
                'analysis_successful': False,
                'error': str(e)
            }
    
    def _test_normality(self, series):
        """Test residuals for normality (important for confidence intervals)"""
        try:
            # Jarque-Bera test
            jb_stat, jb_pvalue = jarque_bera(series.dropna())
            
            # Normal test (D'Agostino and Pearson)
            nt_stat, nt_pvalue = normaltest(series.dropna())
            
            return {
                'jarque_bera': {
                    'statistic': float(jb_stat),
                    'pvalue': float(jb_pvalue),
                    'is_normal': jb_pvalue > 0.05
                },
                'normaltest': {
                    'statistic': float(nt_stat),
                    'pvalue': float(nt_pvalue),
                    'is_normal': nt_pvalue > 0.05
                },
                'skewness': float(series.skew()),
                'kurtosis': float(series.kurtosis())
            }
        except Exception as e:
            logger.warning(f"Normality tests failed: {str(e)}")
            return {'error': str(e)}
    
    def _analyze_autocorrelation(self, series):
        """Compute ACF and PACF for model order selection"""
        try:
            max_lags = min(40, len(series) // 2)
            
            acf_values = acf(series.dropna(), nlags=max_lags, fft=True)
            pacf_values = pacf(series.dropna(), nlags=max_lags)
            
            # Find significant lags (beyond 95% confidence interval)
            ci = 1.96 / np.sqrt(len(series))
            
            significant_acf = [int(i) for i, val in enumerate(acf_values[1:], 1) if abs(val) > ci]
            significant_pacf = [int(i) for i, val in enumerate(pacf_values[1:], 1) if abs(val) > ci]
            
            return {
                'acf': acf_values.tolist(),
                'pacf': pacf_values.tolist(),
                'significant_acf_lags': significant_acf[:10],  # Top 10
                'significant_pacf_lags': significant_pacf[:10],
                'max_lags_computed': max_lags
            }
        except Exception as e:
            logger.warning(f"Autocorrelation analysis failed: {str(e)}")
            return {'error': str(e)}
    
    def _validate_exogenous(self, series, exogenous_data):
        """
        Validate exogenous variables for SARIMAX
        Check for multicollinearity, stationarity, and relevance
        """
        try:
            exog_df = pd.DataFrame(exogenous_data)
            exog_df.columns = ['date'] + [f'exog_{i}' for i in range(len(exog_df.columns) - 1)]
            exog_df['date'] = pd.to_datetime(exog_df['date'])
            exog_df = exog_df.set_index('date').sort_index()
            
            # Align with main series
            exog_df = exog_df.reindex(series.index)
            
            validation = {
                'n_variables': len(exog_df.columns),
                'missing_percentage': float(exog_df.isna().sum().sum() / (len(exog_df) * len(exog_df.columns)) * 100),
                'variables': []
            }
            
            # Check each variable
            for col in exog_df.columns:
                var_info = {
                    'name': col,
                    'correlation_with_target': float(series.corr(exog_df[col])),
                    'stationarity': None
                }
                
                # Test stationarity
                try:
                    adf_result = adfuller(exog_df[col].dropna(), autolag='AIC')
                    var_info['stationarity'] = 'stationary' if adf_result[1] < 0.05 else 'non-stationary'
                    var_info['adf_pvalue'] = float(adf_result[1])
                except:
                    var_info['stationarity'] = 'unknown'
                
                validation['variables'].append(var_info)
            
            # Check multicollinearity
            if len(exog_df.columns) > 1:
                corr_matrix = exog_df.corr()
                max_corr = corr_matrix.abs().where(~np.eye(len(corr_matrix), dtype=bool)).max().max()
                validation['max_intercorrelation'] = float(max_corr)
                validation['multicollinearity_warning'] = max_corr > 0.9
            
            return validation
            
        except Exception as e:
            logger.warning(f"Exogenous validation failed: {str(e)}")
            return {'error': str(e)}
    
    def _evaluate_suitability(self, diagnostics):
        """
        Determine if data is suitable for modeling
        Strict requirements - no silent failures
        """
        suitable = True
        warnings = []
        recommendation = None
        
        # Check data quality
        quality = diagnostics['data_quality']
        if quality['quality_score'] < 50:
            suitable = False
            warnings.append("Data quality too low for reliable modeling")
            recommendation = "Clean data: handle missing values, outliers, and ensure temporal consistency"
        
        if quality['n_observations'] < 50:
            suitable = False
            warnings.append("Insufficient data (minimum 50 observations required)")
            recommendation = "Collect more historical data before forecasting"
        
        if quality['missing_percentage'] > 10:
            warnings.append("High percentage of missing values may affect forecast accuracy")
        
        # Check for seasonality detection issues
        if 'seasonality' in diagnostics:
            if diagnostics['seasonality'].get('note'):
                warnings.append(diagnostics['seasonality']['note'])
        
        return {
            'suitable_for_modeling': suitable,
            'warnings': warnings,
            'recommendation': recommendation
        }
