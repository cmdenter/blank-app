# BTC EMA Crossover Trading Strategy Web App

A simple web application that fetches real-time Bitcoin (BTC) price data and implements a 20 EMA and 50 EMA crossover trading strategy.

## Features

- Real-time BTC price data from Binance API
- Interactive candlestick chart with EMA indicators
- Automatic buy/sell signal generation based on EMA crossover
- Configurable time intervals (1m, 5m, 15m, 1h, 4h, 1d)
- Visual markers for buy and sell signals
- Recent trading signals table
- Current position tracking (LONG/FLAT)

## Trading Strategy

**20/50 EMA Crossover Strategy:**
- **BUY Signal**: When the 20 EMA crosses above the 50 EMA (bullish crossover)
- **SELL Signal**: When the 20 EMA crosses below the 50 EMA (bearish crossover)

This is a trend-following strategy that aims to capture medium-term price movements.

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the Streamlit app:
```bash
streamlit run streamlit_app.py
```

The app will open in your default web browser at `http://localhost:8501`

## Configuration

Use the sidebar to configure:
- **Time Interval**: Choose between 1m, 5m, 15m, 1h, 4h, or 1d
- **Number of Candles**: Adjust the amount of historical data to display (50-500)

## Data Source

Price data is fetched from the Binance public API, which doesn't require authentication.

## Disclaimer

This application is for educational purposes only. It is NOT financial advice. Always do your own research before making any trading decisions.

## License

See LICENSE file for details.
