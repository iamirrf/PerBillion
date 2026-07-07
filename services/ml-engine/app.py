"""
PerBillion ML Engine - Institutional-Grade Stock Forecasting
Production-ready classical time series modeling with automated hyperparameter tuning
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
import sys
from datetime import date, datetime

import numpy as np

try:
    import pandas as pd
except Exception:  # pragma: no cover
    pd = None
from forecasting.forecast_service import ForecastService
from forecasting.diagnostics import DiagnosticsEngine
from forecasting.validation import ValidationService

# Ensure log directory exists even when /app is bind-mounted
os.makedirs('/app/logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/app/logs/ml-engine.log')
    ]
)

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize services
forecast_service = ForecastService()
diagnostics_engine = DiagnosticsEngine()
validation_service = ValidationService()


def _json_safe(obj):
    if isinstance(obj, dict):
        return {str(k): _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if pd is not None:
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        if isinstance(obj, pd.Timedelta):
            return str(obj)
        if isinstance(obj, pd.Period):
            return str(obj)
        if isinstance(obj, (pd.Series, pd.Index)):
            return [_json_safe(v) for v in obj.tolist()]
        if isinstance(obj, pd.DataFrame):
            return [{str(k): _json_safe(v) for k, v in row.items()} for row in obj.to_dict(orient='records')]
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.generic):
        return _json_safe(obj.item())
    # Fallbacks for other numeric/scalar-like objects (e.g., some statsmodels results)
    if hasattr(obj, 'item') and callable(getattr(obj, 'item')):
        try:
            return _json_safe(obj.item())
        except Exception:
            pass
    if hasattr(obj, 'tolist') and callable(getattr(obj, 'tolist')):
        try:
            return _json_safe(obj.tolist())
        except Exception:
            pass
    return obj


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'PerBillion ML Engine',
        'version': '1.0.0'
    }), 200


@app.route('/api/forecast', methods=['POST'])
def create_forecast():
    """
    Create a new forecast using automated model selection and hyperparameter tuning
    
    Request body:
    {
        "ticker": "AAPL",
        "data": [[date, price], ...],
        "forecast_horizon": 12,
        "model_type": "auto" | "ARIMA" | "SARIMA" | "SARIMAX" | "HOLT_WINTERS",
        "exogenous_data": [[date, var1, var2], ...] (optional),
        "advanced_config": {
            "preprocessing": {
                "handle_weekends": "business_days" | "forward_fill" | "interpolate",
                "outlier_method": "zscore" | "iqr" | "none",
                "outlier_threshold": 3.0,
                "smooth_data": false
            },
            "tuning": {
                "max_p": 5,
                "max_q": 5,
                "max_d": 2,
                "max_P": 2,
                "max_Q": 2,
                "max_D": 1,
                "seasonal_periods": [52],
                "enable_auto_tuning": true
            }
        } (optional),
        "manual_params": {
            "arima_order": [p, d, q],
            "seasonal_order": [P, D, Q, s],
            "smoothing_level": float,
            "smoothing_trend": float,
            "smoothing_seasonal": float
        } (optional - skips auto-tuning if provided)
    }
    """
    try:
        data = request.get_json()
        
        # Validate request
        validation_result = validation_service.validate_forecast_request(data)
        if not validation_result['valid']:
            return jsonify({
                'error': 'Validation failed',
                'details': validation_result['errors']
            }), 400
        
        # Run diagnostics
        logger.info(f"Running diagnostics for {data['ticker']}")
        diagnostics = diagnostics_engine.run_full_diagnostics(
            data['data'],
            data.get('exogenous_data')
        )
        diagnostics = _json_safe(diagnostics)
        
        # Check if data is suitable for modeling
        if not diagnostics['suitable_for_modeling']:
            return jsonify({
                'error': 'Data unsuitable for modeling',
                'diagnostics': diagnostics,
                'recommendation': diagnostics.get('recommendation')
            }), 400
        
        # Create forecast
        logger.info(f"Creating forecast for {data['ticker']} with model {data.get('model_type', 'auto')}")
        forecast_result = forecast_service.create_forecast(
            ticker=data['ticker'],
            historical_data=data['data'],
            forecast_horizon=data.get('forecast_horizon', 12),
            model_type=data.get('model_type', 'auto'),
            exogenous_data=data.get('exogenous_data'),
            advanced_config=data.get('advanced_config'),
            manual_params=data.get('manual_params'),
            diagnostics=diagnostics
        )

        forecast_result = _json_safe(forecast_result)
        
        if forecast_result.get('status') == 'failed':
            # Return a structured failure response with HTTP 200 so callers can
            # persist the error details without treating it as a transport failure.
            return jsonify(forecast_result), 200
        
        return jsonify(forecast_result), 200
        
    except Exception as e:
        logger.error(f"Error in create_forecast: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@app.route('/api/diagnostics', methods=['POST'])
def run_diagnostics():
    """
    Run comprehensive diagnostics on time series data
    
    Request body:
    {
        "data": [[date, price], ...],
        "exogenous_data": [[date, var1, var2], ...] (optional)
    }
    """
    try:
        data = request.get_json()
        
        if 'data' not in data or not data['data']:
            return jsonify({'error': 'Missing or empty data field'}), 400
        
        diagnostics = diagnostics_engine.run_full_diagnostics(
            data['data'],
            data.get('exogenous_data')
        )
        return jsonify(_json_safe(diagnostics)), 200
        
    except Exception as e:
        logger.error(f"Error in run_diagnostics: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Diagnostics failed',
            'details': str(e)
        }), 500


@app.route('/api/validate', methods=['POST'])
def validate_data():
    """
    Validate forecast request data
    
    Request body: Same as /api/forecast
    """
    try:
        data = request.get_json()
        validation_result = validation_service.validate_forecast_request(data)
        
        return jsonify(validation_result), 200
        
    except Exception as e:
        logger.error(f"Error in validate_data: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Validation failed',
            'details': str(e)
        }), 500


@app.route('/api/models', methods=['GET'])
def list_models():
    """List available forecasting models and their requirements"""
    return jsonify({
        'models': [
            {
                'name': 'ARIMA',
                'description': 'AutoRegressive Integrated Moving Average',
                'min_data_points': 50,
                'supports_seasonality': False,
                'supports_exogenous': False
            },
            {
                'name': 'SARIMA',
                'description': 'Seasonal ARIMA',
                'min_data_points': 104,  # 2 years of weekly data
                'supports_seasonality': True,
                'supports_exogenous': False,
                'valid_seasonal_periods': [4, 13, 26, 52]
            },
            {
                'name': 'SARIMAX',
                'description': 'Seasonal ARIMA with eXogenous variables',
                'min_data_points': 104,
                'supports_seasonality': True,
                'supports_exogenous': True,
                'valid_seasonal_periods': [4, 13, 26, 52]
            },
            {
                'name': 'HOLT_WINTERS_ADDITIVE',
                'description': 'Holt-Winters Exponential Smoothing (Additive)',
                'min_data_points': 104,
                'supports_seasonality': True,
                'supports_exogenous': False,
                'valid_seasonal_periods': [4, 13, 26, 52]
            },
            {
                'name': 'HOLT_WINTERS_MULTIPLICATIVE',
                'description': 'Holt-Winters Exponential Smoothing (Multiplicative)',
                'min_data_points': 104,
                'supports_seasonality': True,
                'supports_exogenous': False,
                'valid_seasonal_periods': [4, 13, 26, 52],
                'note': 'Requires strictly positive data'
            },
            {
                'name': 'HOLT_WINTERS_DAMPED',
                'description': 'Holt-Winters with Damped Trend',
                'min_data_points': 104,
                'supports_seasonality': True,
                'supports_exogenous': False,
                'valid_seasonal_periods': [4, 13, 26, 52]
            }
        ],
        'auto_selection': {
            'description': 'Automated model selection with hyperparameter tuning',
            'strategy': 'Multi-stage search with AICc screening, rolling-origin CV, and composite scoring'
        }
    }), 200


if __name__ == '__main__':
    import os
    os.makedirs('/app/logs', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=False)
