import math
import unittest

import pandas as pd

from forecasting.forecast_service import ForecastService
from forecasting.preprocessing import DataPreprocessor


class WeeklyForecastTest(unittest.TestCase):
    def test_four_week_request_has_four_weekly_predictions(self):
        dates = pd.date_range('2024-01-05', periods=110, freq='W-FRI')
        weekly_prices = [
            [date.isoformat(), 100 + index * 0.15 + math.sin(index / 5)]
            for index, date in enumerate(dates)
            if index != 30
        ]

        processed = DataPreprocessor().preprocess(
            weekly_prices, {'handle_weekends': 'business_days'}
        )
        series = processed['series']
        self.assertEqual(len(series), 110)
        self.assertEqual(pd.infer_freq(series.index), 'W-FRI')
        self.assertEqual(series.iloc[30], series.iloc[29])

        result = ForecastService()._generate_forecast(
            series, {'best_parameters': (0, 1, 0)}, 4
        )
        forecast_dates = pd.to_datetime(result['dates'])
        self.assertEqual(len(result['predictions']), 4)
        self.assertEqual(len(result['historical_data']['dates']), 110)
        self.assertEqual(forecast_dates[0], dates[-1] + pd.Timedelta(weeks=1))
        self.assertTrue(all(date.dayofweek == 4 for date in forecast_dates))
        self.assertTrue(all(
            gap == pd.Timedelta(weeks=1)
            for gap in forecast_dates[1:] - forecast_dates[:-1]
        ))


if __name__ == '__main__':
    unittest.main()
