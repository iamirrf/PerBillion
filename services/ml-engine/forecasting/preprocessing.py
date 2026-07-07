"""
Advanced Data Preprocessing Module
Handles missing data, weekend gaps, outliers, and data quality issues
"""

import numpy as np
import pandas as pd
from scipy import interpolate
from scipy.stats import zscore
import logging

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """
    Professional-grade data preprocessing for time series forecasting
    Handles all data quality issues systematically
    """
    
    def __init__(self):
        self.preprocessing_log = []
    
    def preprocess(self, data: list, config: dict = None) -> dict:
        """
        Complete preprocessing pipeline
        
        Args:
            data: List of [date, price] pairs
            config: Optional preprocessing configuration
                {
                    'handle_weekends': 'forward_fill' | 'interpolate' | 'business_days',
                    'outlier_method': 'zscore' | 'iqr' | 'none',
                    'outlier_threshold': float (default 3.0 for zscore, 1.5 for IQR),
                    'fill_missing': 'forward_fill' | 'backward_fill' | 'interpolate' | 'mean',
                    'smooth_data': bool,
                    'smooth_window': int
                }
        
        Returns:
            {
                'series': pd.Series (cleaned and preprocessed),
                'original_series': pd.Series (before preprocessing),
                'preprocessing_log': list of actions taken,
                'quality_metrics': dict of quality indicators
            }
        """
        config = config or {}
        self.preprocessing_log = []
        
        # Convert to DataFrame
        df = pd.DataFrame(data, columns=['date', 'price'])
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').drop_duplicates(subset=['date'])
        df = df.set_index('date')
        
        original_series = df['price'].copy()
        series = df['price'].copy()
        
        initial_count = len(series)
        self._log(f"Initial data: {initial_count} observations")
        
        # 1. Handle duplicates (already done above)
        
        # 2. Detect and handle missing dates (especially weekends)
        series = self._handle_missing_dates(
            series, 
            method=config.get('handle_weekends', 'business_days')
        )
        
        # 3. Handle missing values
        series = self._handle_missing_values(
            series,
            method=config.get('fill_missing', 'interpolate')
        )
        
        # 4. Detect and handle outliers
        if config.get('outlier_method', 'zscore') != 'none':
            series = self._handle_outliers(
                series,
                method=config.get('outlier_method', 'zscore'),
                threshold=config.get('outlier_threshold', 3.0)
            )
        
        # 5. Optional smoothing
        if config.get('smooth_data', False):
            series = self._smooth_series(
                series,
                window=config.get('smooth_window', 5)
            )
        
        # 6. Ensure no infinite or NaN values remain
        series = series.replace([np.inf, -np.inf], np.nan)
        if series.isna().any():
            self._log(f"Filling remaining {series.isna().sum()} NaN values with interpolation")
            series = series.interpolate(method='linear', limit_direction='both')
        
        # Calculate quality metrics
        quality_metrics = self._calculate_quality_metrics(original_series, series)
        
        return {
            'series': series,
            'original_series': original_series,
            'preprocessing_log': self.preprocessing_log,
            'quality_metrics': quality_metrics
        }
    
    def _handle_missing_dates(self, series: pd.Series, method: str = 'business_days') -> pd.Series:
        """
        Handle missing dates, especially weekends and holidays
        
        Methods:
        - 'business_days': Convert to business day frequency (M-F)
        - 'forward_fill': Fill all missing dates with forward fill
        - 'interpolate': Fill all missing dates with interpolation
        """
        if len(series) == 0:
            return series
        
        if method == 'business_days':
            # Resample to business days only
            original_freq = pd.infer_freq(series.index)
            
            if original_freq is None or 'B' not in original_freq:
                # Create business day range
                date_range = pd.bdate_range(
                    start=series.index.min(),
                    end=series.index.max(),
                    freq='B'
                )
                
                # Reindex to business days
                series_bd = series.reindex(date_range)
                
                # Forward fill missing business days
                series_bd = series_bd.fillna(method='ffill')
                
                missing_after = series_bd.isna().sum()
                if missing_after > 0:
                    # Backward fill any remaining at start
                    series_bd = series_bd.fillna(method='bfill')
                
                filled_count = len(series_bd) - len(series)
                if filled_count > 0:
                    self._log(f"Converted to business days: filled {filled_count} weekend/holiday gaps")
                
                return series_bd
            else:
                self._log("Data already on business day frequency")
                return series
        
        elif method == 'forward_fill':
            # Fill all calendar days
            full_range = pd.date_range(
                start=series.index.min(),
                end=series.index.max(),
                freq='D'
            )
            series_full = series.reindex(full_range)
            series_full = series_full.fillna(method='ffill')
            
            filled_count = series_full.isna().sum()
            if filled_count > 0:
                series_full = series_full.fillna(method='bfill')
            
            self._log(f"Forward filled {len(series_full) - len(series)} missing dates")
            return series_full
        
        elif method == 'interpolate':
            # Fill all calendar days with interpolation
            full_range = pd.date_range(
                start=series.index.min(),
                end=series.index.max(),
                freq='D'
            )
            series_full = series.reindex(full_range)
            series_full = series_full.interpolate(method='linear')
            
            filled_count = len(series_full) - len(series)
            self._log(f"Interpolated {filled_count} missing dates")
            return series_full
        
        return series
    
    def _handle_missing_values(self, series: pd.Series, method: str = 'interpolate') -> pd.Series:
        """Handle missing values within the series"""
        missing_count = series.isna().sum()
        
        if missing_count == 0:
            return series
        
        self._log(f"Found {missing_count} missing values")
        
        if method == 'forward_fill':
            series = series.fillna(method='ffill').fillna(method='bfill')
            self._log(f"Applied forward fill for missing values")
        
        elif method == 'backward_fill':
            series = series.fillna(method='bfill').fillna(method='ffill')
            self._log(f"Applied backward fill for missing values")
        
        elif method == 'interpolate':
            series = series.interpolate(method='linear', limit_direction='both')
            self._log(f"Applied linear interpolation for missing values")
        
        elif method == 'mean':
            mean_val = series.mean()
            series = series.fillna(mean_val)
            self._log(f"Filled missing values with mean: {mean_val:.2f}")
        
        return series
    
    def _handle_outliers(self, series: pd.Series, method: str = 'zscore', 
                        threshold: float = 3.0) -> pd.Series:
        """
        Detect and handle outliers
        
        Methods:
        - 'zscore': Use z-score (standard deviations from mean)
        - 'iqr': Use Interquartile Range
        """
        if method == 'zscore':
            z_scores = np.abs(zscore(series, nan_policy='omit'))
            outliers = z_scores > threshold
            outlier_count = outliers.sum()
            
            if outlier_count > 0:
                self._log(f"Detected {outlier_count} outliers using z-score (threshold={threshold})")
                
                # Replace outliers with interpolation
                series_clean = series.copy()
                series_clean[outliers] = np.nan
                series_clean = series_clean.interpolate(method='linear')
                
                self._log(f"Replaced outliers with interpolated values")
                return series_clean
        
        elif method == 'iqr':
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - threshold * IQR
            upper_bound = Q3 + threshold * IQR
            
            outliers = (series < lower_bound) | (series > upper_bound)
            outlier_count = outliers.sum()
            
            if outlier_count > 0:
                self._log(f"Detected {outlier_count} outliers using IQR (threshold={threshold})")
                
                # Replace outliers with interpolation
                series_clean = series.copy()
                series_clean[outliers] = np.nan
                series_clean = series_clean.interpolate(method='linear')
                
                self._log(f"Replaced outliers with interpolated values")
                return series_clean
        
        return series
    
    def _smooth_series(self, series: pd.Series, window: int = 5) -> pd.Series:
        """Apply rolling average smoothing"""
        if window > 1 and len(series) > window:
            smoothed = series.rolling(window=window, center=True).mean()
            
            # Fill edges
            smoothed = smoothed.fillna(method='bfill').fillna(method='ffill')
            
            self._log(f"Applied {window}-period rolling average smoothing")
            return smoothed
        
        return series
    
    def _calculate_quality_metrics(self, original: pd.Series, processed: pd.Series) -> dict:
        """Calculate data quality metrics"""
        
        return {
            'original_count': len(original),
            'processed_count': len(processed),
            'original_missing': original.isna().sum(),
            'processed_missing': processed.isna().sum(),
            'mean_original': float(original.mean()) if len(original) > 0 else 0,
            'mean_processed': float(processed.mean()) if len(processed) > 0 else 0,
            'std_original': float(original.std()) if len(original) > 0 else 0,
            'std_processed': float(processed.std()) if len(processed) > 0 else 0,
            'preprocessing_applied': len(self.preprocessing_log) > 0
        }
    
    def _log(self, message: str):
        """Add entry to preprocessing log"""
        logger.info(f"[Preprocessing] {message}")
        self.preprocessing_log.append(message)
