# Polymarket BTC Probability Tracker

A real-time tracker for Bitcoin price prediction markets on Polymarket, featuring probability distribution visualization with normal curve representation and comprehensive historical tracking.

## Features

### Real-Time Tracking
- **Live Market Data**: Fetches active BTC-related markets from Polymarket
- **Probability Distribution**: Visualizes the probability distribution as a normal curve
- **Real-time Stats**: Shows bullish/bearish probabilities and market sentiment
- **Auto-refresh**: Updates every 30 seconds automatically
- **Responsive Design**: Beautiful gradient UI with real-time market cards

### Historical Evolution
- **Persistent Storage**: Stores up to 90 days of historical data in browser localStorage
- **Time-Series Charts**: Track how probabilities change over time
- **Distribution Evolution**: See how the normal curve shifts across different time periods
- **Multiple Time Ranges**: View data for 24 hours, 7 days, 30 days, or all time
- **Historical Stats**: Average bullish/bearish probabilities and data point counts
- **Data Export**: Export historical data as CSV for external analysis
- **Clear History**: Option to reset and start fresh

## How It Works

1. **Data Collection**: Queries Polymarket's CLOB API for active Bitcoin markets
2. **Probability Calculation**: Analyzes market odds to determine bullish vs bearish sentiment
3. **Distribution Modeling**: Generates a normal distribution curve based on aggregate market probabilities
4. **Historical Storage**: Saves each data point with timestamp to browser localStorage
5. **Visualization**: Multiple charts showing current state and historical evolution

## Usage

Simply open `index.html` in a web browser:

```bash
cd polymarket-btc-tracker
open index.html
```

Or use a local server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## What You'll See

### Current Data Section
- **Bullish Probability**: Aggregate probability of upward price movement
- **Bearish Probability**: Aggregate probability of downward price movement
- **Market Sentiment**: Overall market direction (Bullish/Bearish/Neutral)
- **Active Markets**: Number of markets being tracked
- **Current Distribution Curve**: Normal curve showing probability density across price movements

### Historical Evolution Section
- **Time Range Controls**: Switch between 24h, 7d, 30d, or all-time views
- **Historical Stats**:
  - Data Points Collected: Total number of snapshots
  - Tracking Since: When data collection started
  - Average Bullish/Bearish: Mean probabilities over selected time range
- **Probability Evolution Chart**: Line chart showing how bullish/bearish probabilities change over time
- **Distribution Curve Evolution**: Overlay of multiple distribution curves from different time periods
  - Green curves indicate bullish sentiment at that time
  - Red curves indicate bearish sentiment at that time
  - Opacity indicates age (newer = more opaque)
- **Export Data**: Download CSV with all data points
- **Clear History**: Reset all historical data

### Active Markets List
- List of current BTC prediction markets with their odds

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

### Historical Data Structure

Each data point contains:
```javascript
{
  timestamp: 1700000000000,  // Unix timestamp
  bullish: 0.65,             // Bullish probability (0-1)
  bearish: 0.35,             // Bearish probability (0-1)
  marketCount: 8,            // Number of markets analyzed
  sentiment: 0.30            // Net sentiment (bullish - bearish)
}
```

### Data Storage

- Uses browser `localStorage` for persistence
- Automatically cleans data older than 90 days
- Data survives page refreshes and browser restarts
- Storage key: `polymarket_btc_history`

### API Integration

Uses Polymarket's CLOB (Central Limit Order Book) API:
- Endpoint: `https://clob.polymarket.com/markets`
- Filters for active BTC-related markets
- Parses outcome prices to calculate probabilities

### CSV Export Format

Exported CSV includes:
- Timestamp (Unix)
- Date (ISO 8601)
- Bullish Probability
- Bearish Probability
- Sentiment
- Market Count

## Demo Mode

If the API is unavailable (CORS or network issues), the app automatically switches to demo mode with sample market data. Historical tracking still works in demo mode.

## Browser Compatibility

Requires:
- Modern web browser with ES6 support
- localStorage support
- fetch API support
- Chart.js (loaded via CDN)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Data Privacy

All data is stored locally in your browser. No data is sent to external servers except the Polymarket API requests for market data.

## Use Cases

- **Traders**: Monitor market sentiment trends over time
- **Researchers**: Export data for quantitative analysis
- **Enthusiasts**: Track how BTC prediction markets evolve
- **Developers**: Example of real-time data visualization with historical tracking

## Future Enhancements

Potential additions:
- Multiple cryptocurrency support
- Advanced statistical analysis
- Correlation with actual BTC price
- Alerts for sentiment shifts
- Compare multiple time periods side-by-side

## License

MIT
