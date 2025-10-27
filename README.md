# 📊 Lead-Lag Analysis Dashboard

A professional Streamlit application for analyzing lead-lag relationships between financial time series data. Specifically designed for analyzing relationships between Bitcoin (BTC), ISM Manufacturing Index, and M2 Money Supply (Liquidity).

## Features

### Core Functionality
- **Data Input**
  - CSV file upload support
  - Sample data generation with realistic lead-lag relationships

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

3. Choose your data source:
   - **Upload CSV**: Upload your own data file
   - **Generate Sample Data**: Create synthetic data with realistic patterns

### Data Format

If uploading your own CSV file, ensure it has these columns:
- `Date` - Timestamp (parseable by pandas)
- `BTC` - Bitcoin price or returns
- `ISM` - ISM Index values
- `M2` - M2 Money Supply or liquidity metric

Example:
```csv
Date,BTC,ISM,M2
2023-01-01,30000,52.5,100.2
2023-01-02,30500,52.6,100.3
...
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

## Export Options

Download results:
1. **Time Series Data**: Processed data in CSV format
2. **Granger Results**: Causality test results in CSV format

## Troubleshooting

### Common Issues

**"Data must contain columns: Date, BTC, ISM, M2"**
- Ensure your CSV has exactly these column names
- Check for typos or extra spaces

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
2. **Difference if Needed**: Non-stationary series should be differenced
3. **Start with Cross-Correlation**: Identify lead-lag structure first
4. **Validate with Granger**: Use Granger tests to confirm causality
5. **Monitor Rolling Correlations**: Watch for regime changes

## Use Cases

- Cryptocurrency market analysis
- Economic indicator relationships
- Liquidity impact studies
- Trading strategy development
- Risk factor identification
- Market timing research

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
