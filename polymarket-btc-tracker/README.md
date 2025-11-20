# Polymarket BTC Probability Tracker

A real-time tracker for Bitcoin price prediction markets on Polymarket, featuring probability distribution visualization with normal curve representation.

## Features

- **Live Market Data**: Fetches active BTC-related markets from Polymarket
- **Probability Distribution**: Visualizes the probability distribution as a normal curve
- **Real-time Stats**: Shows bullish/bearish probabilities and market sentiment
- **Auto-refresh**: Updates every 30 seconds automatically
- **Responsive Design**: Beautiful gradient UI with real-time market cards

## How It Works

1. **Data Collection**: Queries Polymarket's CLOB API for active Bitcoin markets
2. **Probability Calculation**: Analyzes market odds to determine bullish vs bearish sentiment
3. **Distribution Modeling**: Generates a normal distribution curve based on aggregate market probabilities
4. **Visualization**: Displays the curve using Chart.js showing upside/downside distribution

## Usage

Simply open `index.html` in a web browser:

```bash
open index.html
```

Or use a local server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## What You'll See

- **Bullish Probability**: Aggregate probability of upward price movement
- **Bearish Probability**: Aggregate probability of downward price movement
- **Market Sentiment**: Overall market direction (Bullish/Bearish/Neutral)
- **Distribution Curve**: Normal curve showing probability density across price movements
- **Active Markets**: List of current BTC prediction markets with their odds

## Technical Details

### Normal Distribution Curve

The curve is generated using the normal distribution formula:

```
f(x) = (1 / (σ√(2π))) * e^(-(x-μ)²/(2σ²))
```

Where:
- μ (mean) = shifts based on bullish/bearish sentiment (-50 to +50)
- σ (standard deviation) = 20 (controls curve width)
- x = price movement percentage (-100% to +100%)

### API Integration

Uses Polymarket's CLOB (Central Limit Order Book) API:
- Endpoint: `https://clob.polymarket.com/markets`
- Filters for active BTC-related markets
- Parses outcome prices to calculate probabilities

## Demo Mode

If the API is unavailable (CORS or network issues), the app automatically switches to demo mode with sample market data.

## Dependencies

- Chart.js (loaded via CDN)
- Modern web browser with fetch API support

## License

MIT
