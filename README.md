# 📈 Stock Lead-Lag Analysis Dashboard

A professional Streamlit application for analyzing lead-lag relationships between stocks using real-time data from Yahoo Finance. Discover which stocks lead or lag the market, analyze causal relationships, and identify trading opportunities through quantitative analysis.

## Features

### Core Functionality
- **Real-Time Data Fetching**
  - Yahoo Finance API integration
  - Support for any stock ticker (stocks, ETFs, indices)
  - Multiple time periods (1mo to max history)
  - Quick presets for popular stock combinations
  - Sample data generation for testing

- **Stationarity Testing**
  - Augmented Dickey-Fuller (ADF) tests
  - Automatic detection of unit roots
  - Critical value reporting

- **Cross-Correlation Analysis**
  - Calculate cross-correlations at multiple lags
  - Automatic optimal lag detection
  - Interactive visualization of correlation functions
  - Identifies which variable leads/lags

- **Granger Causality Testing**
  - Tests for predictive relationships between variables
  - Multi-lag testing with automatic optimal lag selection
  - Interactive network graph visualization
  - Statistical significance testing (p < 0.05)

- **Lead-Lag Heatmaps**
  - Comprehensive pairwise relationship matrix
  - Visual identification of lead-lag patterns
  - Multiple lag range analysis

- **Rolling Correlation Analysis**
  - Time-varying correlation patterns
  - Configurable rolling window
  - Identifies regime changes and structural breaks

### Professional Features
- Dark theme optimized for financial analysis
- Custom color scheme (BTC: Orange, ISM: Blue, M2: Green)
- Interactive Plotly visualizations
- Export functionality for all results
- Real-time parameter adjustment
- Comprehensive error handling

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. Clone or download this repository

2. Install required packages:
```bash
pip install -r requirements.txt
```

## Security

### 🔒 API Keys & Secrets

**Current Status: No API keys required!**

This app uses **Yahoo Finance (yfinance)**, which is completely free and doesn't require any API keys or authentication. You can deploy and use it immediately without any configuration.

### Future Extensibility

The app is built with security-first infrastructure for adding premium data providers:

- **Secrets Management**: Uses Streamlit secrets or environment variables
- **No Hardcoded Keys**: All sensitive data accessed via `get_config()` function
- **Git Protection**: `.streamlit/secrets.toml` is in `.gitignore`
- **Documentation**: See `SECURITY.md` and `.streamlit/secrets.toml.example`

### Best Practices

✅ **DO:**
- Use Streamlit Cloud secrets for deployed apps
- Use `.streamlit/secrets.toml` for local development
- Keep secrets out of version control

❌ **DON'T:**
- Hardcode API keys in source code
- Commit `.streamlit/secrets.toml` to git
- Share API keys publicly

For detailed security guidelines, see **[SECURITY.md](SECURITY.md)**

## Deploy to Web (FREE)

### Streamlit Community Cloud (Recommended - 100% Free)

Deploy your app to the web in under 2 minutes:

1. **Visit Streamlit Community Cloud**
   - Go to: https://share.streamlit.io/
   - Click "Sign in with GitHub"

2. **Deploy Your App**
   - Click "New app"
   - Repository: `cmdenter/blank-app`
   - Branch: `claude/create-lead-lag-app-011CUYL969KFG5L3DEBvxQ1T`
   - Main file: `lead_lag_app.py`
   - Click "Deploy"

3. **Your app will be live at:**
   `https://[your-custom-name].streamlit.app`

**Free tier includes:**
- Unlimited public apps
- Auto-updates from GitHub
- 1 GB RAM per app
- Custom subdomain
- SSL/HTTPS included

The app is pre-configured with optimal settings in `.streamlit/config.toml` for immediate deployment.

## Usage

### Quick Start

1. Run the application:
```bash
streamlit run lead_lag_app.py
```

2. Open your browser to the URL shown (typically http://localhost:8501)

3. Enter stock tickers:
   - **Choose Quick Presets**: Tech Giants, Market Indices, Banks, Energy, etc.
   - **Custom Tickers**: Enter any valid Yahoo Finance symbols (e.g., `AAPL,MSFT,GOOGL`)
   - **Sample Data**: Generate synthetic data for testing

4. Select time period (1 month to max history)

5. Click "Fetch Data" and start analyzing!

### Supported Tickers

Any valid Yahoo Finance symbol works:
- **Stocks**: `AAPL`, `MSFT`, `TSLA`, `GOOGL`, `NVDA`, `AMD`, etc.
- **ETFs**: `SPY`, `QQQ`, `DIA`, `IWM`, `XLE`, `XLF`, `XLK`, etc.
- **Indices**: `^GSPC` (S&P 500), `^DJI` (Dow Jones), `^IXIC` (NASDAQ)
- **International**: `BABA`, `TSM`, `NIO`, etc.

### Example Analyses

**Tech Sector Leadership:**
```
AAPL, MSFT, NVDA, AMD
```

**Market Index Relationships:**
```
SPY, QQQ, DIA, IWM
```

**Sector Rotation:**
```
XLE, XLF, XLK, XLV
```
(Energy, Finance, Tech, Healthcare ETFs)

**Individual vs Market:**
```
TSLA, AAPL, SPY
```

### Configuration Parameters

Adjust these in the sidebar:
- **Max Lag (Cross-Correlation)**: 10-200 days (default: 100)
- **Max Lag (Granger)**: 1-20 days (default: 10)
- **Rolling Window**: 10-100 days (default: 30)

## Analysis Tabs

### 1. Stationarity Tests
- Runs Augmented Dickey-Fuller tests on all variables
- Reports test statistics and p-values
- Indicates whether each series is stationary
- Provides recommendations for differencing if needed

### 2. Cross-Correlation
- Select two variables to analyze
- Shows correlation across all lags
- Highlights optimal lag with maximum correlation
- Indicates lead-lag direction and magnitude

### 3. Granger Causality
- Tests all pairwise causality relationships
- Shows results in tabular format
- Visualizes significant relationships in network graph
- Reports optimal lag for each relationship

### 4. Lead-Lag Heatmap
- Matrix view of all pairwise relationships
- Shows correlation functions for each pair
- Enables quick comparison across all combinations
- Diagonal shows variable labels

### 5. Rolling Correlations
- Time-varying correlation between all pairs
- Useful for identifying regime changes
- Shows evolution of relationships over time
- Configurable window size

## Interpreting Results

### Cross-Correlation
- **Positive Lag**: Variable 1 leads Variable 2
- **Negative Lag**: Variable 2 leads Variable 1
- **Zero Lag**: Variables move contemporaneously
- **Correlation Magnitude**: Strength of relationship

### Granger Causality
- **p-value < 0.05**: Significant causality relationship
- **Optimal Lag**: How many periods ahead Variable X predicts Variable Y
- **Network Graph**: Arrows show direction of causality

### Stationarity
- **Stationary (p < 0.05)**: Series has constant mean/variance
- **Non-stationary (p >= 0.05)**: Consider differencing or detrending

## Technical Details

### Statistical Methods
- **ADF Test**: Tests for unit root (non-stationarity)
- **Cross-Correlation**: Pearson correlation at different lags
- **Granger Causality**: F-test for predictive power
- **Rolling Correlation**: Moving window Pearson correlation

### Dependencies
- `streamlit`: Web application framework
- `pandas`: Data manipulation
- `numpy`: Numerical computations
- `plotly`: Interactive visualizations
- `scipy`: Statistical functions
- `statsmodels`: Time series analysis
- `networkx`: Network graph visualization
- `yfinance`: Yahoo Finance API for real-time stock data

## Export Options

Download results:
1. **Time Series Data**: Processed data in CSV format
2. **Granger Results**: Causality test results in CSV format

## Troubleshooting

### Common Issues

**"Error fetching data"**
- Check if ticker symbols are valid (try them on finance.yahoo.com first)
- Some international stocks may require country suffix (e.g., `0700.HK` for Tencent)
- Network issues: retry after a moment

**"Could not compute Granger causality"**
- May indicate insufficient data points
- Try reducing max lag parameter
- Check for missing values

**High p-values in tests**
- May indicate weak relationships
- Consider differencing non-stationary series
- Try different lag ranges

### Performance Optimization
- Large datasets (>1000 points): Reduce max lag parameters
- Slow rendering: Close unused tabs
- Memory issues: Use smaller rolling windows

## Best Practices

1. **Check Stationarity First**: Always run ADF tests before other analyses
2. **Use Returns for Stocks**: Stock prices are usually non-stationary; consider using returns (percent changes)
3. **Start with Cross-Correlation**: Identify lead-lag structure first
4. **Validate with Granger**: Use Granger tests to confirm causality
5. **Monitor Rolling Correlations**: Watch for regime changes and structural breaks
6. **Compare Similar Assets**: Best results when analyzing stocks in similar sectors or size
7. **Longer Periods**: Use 1-2 years of data minimum for reliable statistical tests

## Use Cases

- **Pairs Trading**: Identify stocks with strong lead-lag relationships
- **Sector Rotation**: Analyze which sectors lead market movements
- **Market Leadership**: Determine if individual stocks lead or follow indices
- **Risk Management**: Understand correlation breakdowns during market stress
- **Trading Strategies**: Develop predictive models based on causality
- **Portfolio Construction**: Build portfolios with diversified lead-lag profiles
- **Market Timing**: Use leading indicators to anticipate market moves
- **ETF Analysis**: Compare sector ETF relationships and momentum

## Contributing

Suggestions and improvements welcome! This is a professional tool for quantitative analysis.

## License

MIT License - Free to use and modify

## Author

Built with Claude Code for professional quantitative analysis

## Version

1.0.0 - Initial Release

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the sample data generation code
3. Ensure all dependencies are installed correctly
