"""
Validation Service
Strict input validation with no silent failures
"""

import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ValidationService:
    """
    Comprehensive request validation
    Fail fast with clear error messages
    """
    
    def __init__(self):
        self.valid_model_types = [
            'auto', 'ARIMA', 'SARIMA', 'SARIMAX',
            'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'
        ]
        self.min_data_points = {
            'ARIMA': 50,
            'SARIMA': 104,
            'SARIMAX': 104,
            'HOLT_WINTERS_ADDITIVE': 104,
            'HOLT_WINTERS_MULTIPLICATIVE': 104,
            'HOLT_WINTERS_DAMPED': 104
        }
        self.valid_seasonal_periods = [4, 13, 26, 52]
    
    def validate_forecast_request(self, request_data: dict) -> dict:
        """
        Validate complete forecast request
        
        Returns:
            dict with 'valid' boolean and 'errors' list
        """
        errors = []
        
        # Required fields
        if 'ticker' not in request_data:
            errors.append("Missing required field: ticker")
        elif not isinstance(request_data['ticker'], str):
            errors.append("ticker must be a string")
        elif not request_data['ticker'].strip():
            errors.append("ticker cannot be empty")
        
        if 'data' not in request_data:
            errors.append("Missing required field: data")
        else:
            data_errors = self._validate_time_series_data(request_data['data'])
            errors.extend(data_errors)
        
        # Optional fields validation
        if 'model_type' in request_data:
            if request_data['model_type'] not in self.valid_model_types:
                errors.append(
                    f"Invalid model_type: {request_data['model_type']}. "
                    f"Must be one of: {', '.join(self.valid_model_types)}"
                )
            else:
                # Check data requirements for specific model
                model_type = request_data['model_type']
                if model_type != 'auto' and 'data' in request_data:
                    n_points = len(request_data['data'])
                    min_required = self.min_data_points.get(model_type, 50)
                    if n_points < min_required:
                        errors.append(
                            f"{model_type} requires at least {min_required} data points, "
                            f"but only {n_points} provided"
                        )
        
        if 'forecast_horizon' in request_data:
            horizon = request_data['forecast_horizon']
            if not isinstance(horizon, int):
                errors.append("forecast_horizon must be an integer")
            elif horizon < 1:
                errors.append("forecast_horizon must be at least 1")
            elif horizon > 52:
                errors.append("forecast_horizon cannot exceed 52 weeks")
        
        if 'exogenous_data' in request_data and request_data['exogenous_data'] is not None:
            exog_errors = self._validate_exogenous_data(
                request_data['data'], request_data['exogenous_data']
            )
            errors.extend(exog_errors)
        
        if 'advanced_config' in request_data:
            config_errors = self._validate_advanced_config(request_data['advanced_config'])
            errors.extend(config_errors)
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _validate_time_series_data(self, data: list) -> list:
        """Validate time series data format and quality"""
        errors = []
        
        if not isinstance(data, list):
            errors.append("data must be a list")
            return errors
        
        if len(data) == 0:
            errors.append("data cannot be empty")
            return errors
        
        # Check format: each element should be [date, price]
        for i, point in enumerate(data):
            if not isinstance(point, (list, tuple)):
                errors.append(f"data[{i}] must be a list or tuple")
                continue
            
            if len(point) != 2:
                errors.append(f"data[{i}] must have exactly 2 elements [date, price]")
                continue
            
            # Validate date
            try:
                pd.to_datetime(point[0])
            except Exception:
                errors.append(f"data[{i}][0] is not a valid date: {point[0]}")
            
            # Validate price
            try:
                price = float(point[1])
                if price < 0:
                    errors.append(f"data[{i}][1] price cannot be negative: {price}")
                if not np.isfinite(price):
                    errors.append(f"data[{i}][1] price must be finite: {price}")
            except (ValueError, TypeError):
                errors.append(f"data[{i}][1] is not a valid number: {point[1]}")
        
        # Check for duplicate dates
        if len(errors) == 0:  # Only if no format errors
            try:
                dates = [pd.to_datetime(point[0]) for point in data]
                if len(dates) != len(set(dates)):
                    errors.append("Duplicate dates found in data")
            except:
                pass  # Already reported format error
        
        return errors
    
    def _validate_exogenous_data(self, main_data: list, exog_data: list) -> list:
        """Validate exogenous variables data"""
        errors = []
        
        if not isinstance(exog_data, list):
            errors.append("exogenous_data must be a list")
            return errors
        
        if len(exog_data) == 0:
            errors.append("exogenous_data cannot be empty")
            return errors
        
        # Check format
        n_vars = None
        for i, point in enumerate(exog_data):
            if not isinstance(point, (list, tuple)):
                errors.append(f"exogenous_data[{i}] must be a list or tuple")
                continue
            
            if n_vars is None:
                n_vars = len(point) - 1  # First element is date
                if n_vars < 1:
                    errors.append("exogenous_data must have at least one variable (plus date)")
                    return errors
            
            if len(point) != n_vars + 1:
                errors.append(
                    f"exogenous_data[{i}] has inconsistent number of variables: "
                    f"expected {n_vars + 1}, got {len(point)}"
                )
                continue
            
            # Validate date
            try:
                pd.to_datetime(point[0])
            except Exception:
                errors.append(f"exogenous_data[{i}][0] is not a valid date: {point[0]}")
            
            # Validate variables
            for j in range(1, len(point)):
                try:
                    value = float(point[j])
                    if not np.isfinite(value):
                        errors.append(
                            f"exogenous_data[{i}][{j}] must be finite: {value}"
                        )
                except (ValueError, TypeError):
                    errors.append(
                        f"exogenous_data[{i}][{j}] is not a valid number: {point[j]}"
                    )
        
        # Check alignment with main data
        if len(errors) == 0:
            try:
                main_dates = set(pd.to_datetime(point[0]) for point in main_data)
                exog_dates = set(pd.to_datetime(point[0]) for point in exog_data)
                
                if not main_dates.issubset(exog_dates):
                    missing = main_dates - exog_dates
                    errors.append(
                        f"exogenous_data missing dates present in main data: {len(missing)} dates"
                    )
            except:
                pass  # Already reported format error
        
        return errors
    
    def _validate_advanced_config(self, config: dict) -> list:
        """Validate advanced configuration options"""
        errors = []
        
        if not isinstance(config, dict):
            errors.append("advanced_config must be a dictionary")
            return errors
        
        # Validate seasonal_periods
        if 'seasonal_periods' in config:
            periods = config['seasonal_periods']
            if not isinstance(periods, list):
                errors.append("seasonal_periods must be a list")
            else:
                for p in periods:
                    if not isinstance(p, int):
                        errors.append(f"seasonal_periods must contain integers, got: {p}")
                    elif p not in self.valid_seasonal_periods:
                        errors.append(
                            f"Invalid seasonal period: {p}. "
                            f"Must be one of: {self.valid_seasonal_periods}"
                        )
        
        # Validate hyperparameter bounds
        int_params = ['max_p', 'max_q', 'max_d', 'max_P', 'max_Q', 'max_D']
        for param in int_params:
            if param in config:
                value = config[param]
                if not isinstance(value, int):
                    errors.append(f"{param} must be an integer")
                elif value < 0:
                    errors.append(f"{param} must be non-negative")
                elif value > 10:
                    errors.append(f"{param} cannot exceed 10 (complexity limit)")
        
        return errors


# Import numpy for validation
import numpy as np
