import React, { useState } from 'react';

const ForecastDashboard: React.FC = () => {
  const [ticker, setTicker] = useState('AAPL');
  const [message, setMessage] = useState('');

  const handleTest = () => {
    setMessage(`Testing with ticker: ${ticker}`);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #1e293b, #1e40af, #1e293b)',
      padding: '20px',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #2563eb, #1e40af)',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>PerBillion</h1>
        <p style={{ marginTop: '4px', color: '#bfdbfe' }}>Advanced Stock Forecasting Platform</p>
      </div>

      {/* Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Stock Selection
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '8px'
          }}>
            Stock Ticker Symbol
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL, TSLA, MSFT"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          />
        </div>

        <button
          onClick={handleTest}
          style={{
            width: '100%',
            background: 'linear-gradient(to right, #3b82f6, #2563eb)',
            color: 'white',
            fontWeight: 'bold',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          Test Button
        </button>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#dbeafe',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            color: '#1e40af',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        margin: '20px auto',
        color: '#1f2937'
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Frequently Asked Questions
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
            What models are available?
          </h4>
          <p style={{ color: '#4b5563' }}>
            PerBillion uses five advanced time series forecasting models: ARIMA, SARIMA, SARIMAX, Holt-Winters, and a Hybrid model that combines all four.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
            How accurate are the forecasts?
          </h4>
          <p style={{ color: '#4b5563' }}>
            Accuracy varies by stock and market conditions. Check the metrics table to see model performance. Higher accuracy percentages indicate better performance.
          </p>
        </div>

        <div>
          <h4 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
            What do the confidence intervals mean?
          </h4>
          <p style={{ color: '#4b5563' }}>
            The shaded area represents 95% confidence intervals - there's a 95% probability that the actual future price will fall within this range.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        color: '#9ca3af'
      }}>
        <p>© 2025 PerBillion. All rights reserved. Institution-grade forecasting made accessible.</p>
      </div>
    </div>
  );
};

export default ForecastDashboard;
