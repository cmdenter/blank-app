"""
Stock Lead-Lag Analysis Application
Professional Streamlit app for analyzing lead-lag relationships between stock time series
Uses Yahoo Finance for real-time data

Security: All sensitive configurations are managed through Streamlit secrets or environment variables.
No API keys are hardcoded in the source code.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import networkx as nx
from statsmodels.tsa.stattools import grangercausalitytests, adfuller
from scipy import stats
from scipy.signal import correlate
import yfinance as yf
import io
import os
from datetime import datetime, timedelta

# Security: Load configuration from Streamlit secrets or environment variables
# Note: yfinance is a free library and doesn't require API keys
# This infrastructure is here for future extensibility (e.g., paid data providers)
def get_config(key, default=None):
    """Safely get configuration from Streamlit secrets or environment variables"""
    # Try Streamlit secrets first (for cloud deployment)
    if hasattr(st, 'secrets') and key in st.secrets:
        return st.secrets[key]
    # Fall back to environment variables (for local development)
    return os.environ.get(key, default)

# Page configuration
st.set_page_config(
    page_title="Stock Lead-Lag Analysis",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Color palette for stocks
COLOR_PALETTE = [
    '#F7931A', '#4169E1', '#32CD32', '#FF6B6B', '#9D4EDD',
    '#FCA311', '#06FFA5', '#FF006E', '#8338EC', '#3A86FF'
]

# Custom CSS for professional styling
st.markdown("""
    <style>
    .main {
        background-color: #0E1117;
    }
    .stAlert {
        background-color: #1E2127;
    }
    h1, h2, h3 {
        color: #FAFAFA;
        font-weight: 600;
    }
    .metric-card {
        background-color: #1E2127;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
    }
    </style>
""", unsafe_allow_html=True)


@st.cache_data(ttl=3600)
def fetch_stock_data(tickers, period="1y", interval="1d"):
    """Fetch stock data from Yahoo Finance"""
    try:
        data = yf.download(tickers, period=period, interval=interval, progress=False)

        # Handle single vs multiple tickers
        if len(tickers) == 1:
            df = pd.DataFrame({
                'Date': data.index,
                tickers[0]: data['Close'].values
            })
        else:
            # Get close prices for multiple tickers
            df = pd.DataFrame({'Date': data.index})
            for ticker in tickers:
                if ('Close', ticker) in data.columns:
                    df[ticker] = data['Close'][ticker].values
                else:
                    df[ticker] = data['Close'].values

        df = df.reset_index(drop=True)
        return df, None
    except Exception as e:
        return None, str(e)


def generate_sample_data(tickers, n_points=252):
    """Generate sample data with realistic lead-lag relationships"""
    np.random.seed(42)
    dates = pd.date_range(end=datetime.now(), periods=n_points, freq='D')

    df = pd.DataFrame({'Date': dates})

    # Generate correlated random walks for stocks
    base_trend = np.cumsum(np.random.randn(n_points) * 0.02) + 100

    for i, ticker in enumerate(tickers):
        # Each stock has a different lag relationship
        lag = i * 5
        trend = np.roll(base_trend, lag)
        volatility = 5 + i * 2
        df[ticker] = trend + np.random.randn(n_points) * volatility

    return df


def calculate_adf_test(series, name):
    """Perform Augmented Dickey-Fuller test for stationarity"""
    result = adfuller(series.dropna(), autolag='AIC')

    return {
        'variable': name,
        'adf_statistic': result[0],
        'p_value': result[1],
        'critical_values': result[4],
        'is_stationary': result[1] < 0.05
    }


def calculate_cross_correlation(x, y, max_lag=100):
    """Calculate cross-correlation between two series"""
    x_norm = (x - np.mean(x)) / (np.std(x) * len(x))
    y_norm = (y - np.mean(y)) / np.std(y)

    correlation = correlate(x_norm, y_norm, mode='full', method='auto')
    lags = np.arange(-len(x) + 1, len(x))

    # Limit to max_lag
    center = len(lags) // 2
    lag_range = slice(center - max_lag, center + max_lag + 1)

    return lags[lag_range], correlation[lag_range]


def find_optimal_lag(lags, correlations):
    """Find the lag with maximum absolute correlation"""
    max_idx = np.argmax(np.abs(correlations))
    return lags[max_idx], correlations[max_idx]


def granger_causality_test(data, variables, max_lag=10):
    """Perform Granger causality tests for all variable pairs"""
    results = []

    for var1 in variables:
        for var2 in variables:
            if var1 != var2:
                try:
                    test_data = data[[var2, var1]].dropna()
                    if len(test_data) < max_lag + 10:
                        continue

                    gc_result = grangercausalitytests(test_data, max_lag, verbose=False)

                    # Get p-values for all lags
                    p_values = [gc_result[lag][0]['ssr_ftest'][1] for lag in range(1, max_lag + 1)]
                    min_p_value = min(p_values)
                    optimal_lag = p_values.index(min_p_value) + 1

                    results.append({
                        'cause': var1,
                        'effect': var2,
                        'p_value': min_p_value,
                        'optimal_lag': optimal_lag,
                        'significant': min_p_value < 0.05
                    })
                except Exception as e:
                    st.warning(f"Could not compute Granger causality from {var1} to {var2}: {str(e)}")

    return pd.DataFrame(results)


def get_color_map(variables):
    """Create a color map for the given variables"""
    return {var: COLOR_PALETTE[i % len(COLOR_PALETTE)] for i, var in enumerate(variables)}


def plot_time_series(data, variables, color_map):
    """Create interactive time series plot"""
    n_vars = len(variables)
    fig = make_subplots(
        rows=n_vars, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.05,
        subplot_titles=tuple(variables)
    )

    for i, var in enumerate(variables):
        fig.add_trace(
            go.Scatter(x=data['Date'], y=data[var], name=var,
                       line=dict(color=color_map[var], width=2)),
            row=i+1, col=1
        )

    fig.update_layout(
        height=200 * n_vars,
        showlegend=True,
        template='plotly_dark',
        title_text="Time Series Data",
        hovermode='x unified'
    )

    return fig


def plot_cross_correlation(lags, correlations, var1, var2):
    """Plot cross-correlation function"""
    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=lags,
        y=correlations,
        marker_color=['#32CD32' if c > 0 else '#FF6B6B' for c in correlations],
        name='Cross-correlation'
    ))

    optimal_lag, optimal_corr = find_optimal_lag(lags, correlations)

    fig.add_vline(x=optimal_lag, line_dash="dash", line_color="yellow",
                  annotation_text=f"Optimal Lag: {optimal_lag}")

    fig.update_layout(
        title=f"Cross-Correlation: {var1} vs {var2}",
        xaxis_title="Lag (days)",
        yaxis_title="Correlation",
        template='plotly_dark',
        height=400
    )

    return fig, optimal_lag, optimal_corr


def plot_granger_network(granger_results, color_map):
    """Create network graph of Granger causality relationships"""
    # Filter significant relationships
    sig_results = granger_results[granger_results['significant']]

    if len(sig_results) == 0:
        st.warning("No significant Granger causality relationships found.")
        return None

    # Create directed graph
    G = nx.DiGraph()

    for _, row in sig_results.iterrows():
        G.add_edge(row['cause'], row['effect'],
                   weight=1 - row['p_value'],
                   lag=row['optimal_lag'])

    # Position nodes
    pos = nx.spring_layout(G, k=2, iterations=50)

    # Create edge traces
    edge_traces = []
    for edge in G.edges(data=True):
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]

        # Create arrow
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines+text',
            line=dict(width=edge[2]['weight'] * 3, color='#888'),
            hoverinfo='text',
            text=[f"Lag: {edge[2]['lag']}"],
            textposition="middle center",
            showlegend=False
        )
        edge_traces.append(edge_trace)

    # Create node trace
    node_x = []
    node_y = []
    node_text = []
    node_colors = []

    for node in G.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        node_text.append(node)
        node_colors.append(color_map.get(node, '#888'))

    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode='markers+text',
        text=node_text,
        textposition="top center",
        textfont=dict(size=14, color='white'),
        marker=dict(
            size=30,
            color=node_colors,
            line=dict(width=2, color='white')
        ),
        hoverinfo='text',
        showlegend=False
    )

    # Create figure
    fig = go.Figure(data=edge_traces + [node_trace])

    fig.update_layout(
        title="Granger Causality Network",
        showlegend=False,
        hovermode='closest',
        template='plotly_dark',
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=500
    )

    return fig


def plot_lead_lag_heatmap(data, variables, max_lag=50):
    """Create lead-lag heatmap for all variable pairs"""
    n_vars = len(variables)
    correlations_matrix = np.zeros((n_vars, n_vars, 2 * max_lag + 1))

    for i, var1 in enumerate(variables):
        for j, var2 in enumerate(variables):
            if i != j:
                lags, corrs = calculate_cross_correlation(
                    data[var1].values,
                    data[var2].values,
                    max_lag
                )
                correlations_matrix[i, j, :] = corrs

    # Create subplots for each pair
    fig = make_subplots(
        rows=n_vars, cols=n_vars,
        subplot_titles=[f"{v1} → {v2}" for v1 in variables for v2 in variables],
        vertical_spacing=0.08,
        horizontal_spacing=0.08
    )

    for i, var1 in enumerate(variables):
        for j, var2 in enumerate(variables):
            if i != j:
                lags = np.arange(-max_lag, max_lag + 1)
                fig.add_trace(
                    go.Scatter(
                        x=lags,
                        y=correlations_matrix[i, j, :],
                        mode='lines',
                        line=dict(color=COLOR_PALETTE[i % len(COLOR_PALETTE)]),
                        showlegend=False
                    ),
                    row=i+1, col=j+1
                )
            else:
                # Diagonal - show variable name
                fig.add_annotation(
                    text=var1,
                    xref=f"x{i*n_vars+j+1}",
                    yref=f"y{i*n_vars+j+1}",
                    x=0, y=0.5,
                    showarrow=False,
                    font=dict(size=16, color=COLOR_PALETTE[i % len(COLOR_PALETTE)]),
                    row=i+1, col=j+1
                )

    fig.update_layout(
        title="Lead-Lag Analysis Heatmap",
        template='plotly_dark',
        height=300 * n_vars
    )

    return fig


def calculate_rolling_correlation(data, var1, var2, window=30):
    """Calculate rolling correlation between two variables"""
    rolling_corr = data[var1].rolling(window=window).corr(data[var2])
    return rolling_corr


def plot_rolling_correlation(data, variables, window=30, color_map=None):
    """Plot rolling correlations between all variable pairs"""
    fig = go.Figure()

    pairs = [(v1, v2) for i, v1 in enumerate(variables) for j, v2 in enumerate(variables) if i < j]

    for idx, (var1, var2) in enumerate(pairs):
        rolling_corr = calculate_rolling_correlation(data, var1, var2, window)
        fig.add_trace(go.Scatter(
            x=data['Date'],
            y=rolling_corr,
            mode='lines',
            name=f"{var1} vs {var2}",
            line=dict(width=2, color=COLOR_PALETTE[idx % len(COLOR_PALETTE)])
        ))

    fig.update_layout(
        title=f"Rolling Correlation (Window: {window} days)",
        xaxis_title="Date",
        yaxis_title="Correlation",
        template='plotly_dark',
        height=500,
        hovermode='x unified'
    )

    return fig


# Main Application
def main():
    st.title("📈 Stock Lead-Lag Analysis Dashboard")
    st.markdown("### Analyze Lead-Lag Relationships Between Stocks Using Real Yahoo Finance Data")
    st.markdown("---")

    # Sidebar
    with st.sidebar:
        st.header("⚙️ Configuration")

        # Data source selection
        data_source = st.radio(
            "Data Source",
            ["Yahoo Finance", "Sample Data"]
        )

        if data_source == "Yahoo Finance":
            st.subheader("📊 Stock Tickers")

            # Predefined popular combinations
            preset = st.selectbox(
                "Quick Presets",
                ["Custom", "Tech Giants (AAPL, MSFT, GOOGL)", "Market Indices (SPY, QQQ, DIA)",
                 "Banks (JPM, BAC, GS)", "Energy (XOM, CVX, COP)", "Tech (AAPL, NVDA, AMD)"]
            )

            if preset == "Custom":
                ticker_input = st.text_input(
                    "Enter Stock Tickers (comma-separated)",
                    value="AAPL,MSFT,GOOGL",
                    help="Example: AAPL,MSFT,GOOGL or SPY,QQQ,DIA"
                )
            elif preset == "Tech Giants (AAPL, MSFT, GOOGL)":
                ticker_input = "AAPL,MSFT,GOOGL"
            elif preset == "Market Indices (SPY, QQQ, DIA)":
                ticker_input = "SPY,QQQ,DIA"
            elif preset == "Banks (JPM, BAC, GS)":
                ticker_input = "JPM,BAC,GS"
            elif preset == "Energy (XOM, CVX, COP)":
                ticker_input = "XOM,CVX,COP"
            elif preset == "Tech (AAPL, NVDA, AMD)":
                ticker_input = "AAPL,NVDA,AMD"

            tickers = [t.strip().upper() for t in ticker_input.split(",") if t.strip()]

            if len(tickers) < 2:
                st.error("Please enter at least 2 stock tickers")
                return

            if len(tickers) > 6:
                st.warning("⚠️ More than 6 stocks may be slow. Consider using fewer tickers.")

            # Time period selection
            period = st.selectbox(
                "Time Period",
                ["1mo", "3mo", "6mo", "1y", "2y", "5y", "max"],
                index=3
            )

            # Fetch data
            if st.button("📥 Fetch Data", type="primary"):
                with st.spinner(f"Fetching data for {', '.join(tickers)}..."):
                    data, error = fetch_stock_data(tickers, period=period)

                    if error:
                        st.error(f"Error fetching data: {error}")
                        st.info("Try different tickers or check if they are valid Yahoo Finance symbols")
                        data = None
                    else:
                        st.session_state['data'] = data
                        st.session_state['tickers'] = tickers
                        st.success(f"✅ Loaded {len(data)} rows for {len(tickers)} stocks")

            # Use cached data if available
            if 'data' in st.session_state:
                data = st.session_state['data']
                tickers = st.session_state['tickers']
            else:
                data = None

        else:  # Sample Data
            st.subheader("📊 Sample Stocks")
            n_stocks = st.slider("Number of stocks", 2, 5, 3)
            tickers = [f"STOCK{i+1}" for i in range(n_stocks)]
            n_points = st.slider("Number of data points", 100, 500, 252)

            data = generate_sample_data(tickers, n_points)
            st.success(f"✅ Generated {len(data)} rows for {len(tickers)} stocks")

        if data is not None:
            st.markdown("---")
            st.subheader("Analysis Parameters")

            max_lag_ccf = st.slider("Max Lag (Cross-Correlation)", 10, 200, 100)
            max_lag_granger = st.slider("Max Lag (Granger)", 1, 20, 10)
            rolling_window = st.slider("Rolling Window (days)", 10, 100, 30)

    # Main content
    if 'data' not in locals() or data is None:
        st.info("👈 Please configure and fetch stock data from the sidebar to begin analysis")

        # Show example
        st.subheader("📖 How to Use")
        st.markdown("""
        1. **Choose Data Source:** Select Yahoo Finance for real stock data or Sample Data for testing
        2. **Enter Tickers:** Type stock symbols like `AAPL,MSFT,GOOGL` or use quick presets
        3. **Fetch Data:** Click the button to download historical data
        4. **Analyze:** Explore the tabs to discover lead-lag relationships

        **Popular Analysis Examples:**
        - Tech stocks: `AAPL, MSFT, NVDA, AMD`
        - Market indices: `SPY, QQQ, DIA, IWM`
        - Sector rotation: `XLE, XLF, XLK, XLV` (Energy, Finance, Tech, Healthcare ETFs)
        - Individual vs Index: `TSLA, AAPL, SPY`
        """)
        return

    # Validate data
    if 'Date' not in data.columns:
        st.error("Data must contain a 'Date' column")
        return

    variables = [col for col in data.columns if col != 'Date']
    color_map = get_color_map(variables)

    # Display data summary
    st.subheader("📈 Data Overview")
    cols = st.columns(len(variables) + 2)

    cols[0].metric("Data Points", len(data))
    cols[1].metric("Date Range", f"{data['Date'].min().strftime('%Y-%m-%d')} to {data['Date'].max().strftime('%Y-%m-%d')}")

    for i, var in enumerate(variables):
        change = ((data[var].iloc[-1] - data[var].iloc[0]) / data[var].iloc[0] * 100)
        cols[i+2].metric(var, f"${data[var].iloc[-1]:.2f}", f"{change:+.2f}%")

    # Time series plot
    st.plotly_chart(plot_time_series(data, variables, color_map), use_container_width=True)

    # Tabs for different analyses
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "🔍 Stationarity Tests",
        "📊 Cross-Correlation",
        "🔗 Granger Causality",
        "🌡️ Lead-Lag Heatmap",
        "📉 Rolling Correlations"
    ])

    with tab1:
        st.subheader("Augmented Dickey-Fuller Tests")
        st.markdown("*Testing for stationarity (H0: Unit root exists, i.e., non-stationary)*")

        adf_results = []
        for var in variables:
            result = calculate_adf_test(data[var], var)
            adf_results.append(result)

        # Create results dataframe
        adf_df = pd.DataFrame([{
            'Stock': r['variable'],
            'ADF Statistic': f"{r['adf_statistic']:.4f}",
            'P-Value': f"{r['p_value']:.4f}",
            'Stationary': '✅ Yes' if r['is_stationary'] else '❌ No',
            '1% Critical': f"{r['critical_values']['1%']:.4f}",
            '5% Critical': f"{r['critical_values']['5%']:.4f}",
            '10% Critical': f"{r['critical_values']['10%']:.4f}"
        } for r in adf_results])

        st.dataframe(adf_df, use_container_width=True)

        # Interpretation
        st.markdown("**Interpretation:**")
        for result in adf_results:
            if result['is_stationary']:
                st.success(f"✅ **{result['variable']}** is stationary (p < 0.05)")
            else:
                st.warning(f"⚠️ **{result['variable']}** is non-stationary (p >= 0.05). Consider using returns instead of prices.")

    with tab2:
        st.subheader("Cross-Correlation Analysis")
        st.markdown("*Identifying lead-lag relationships between stocks*")

        # Select variable pair
        col1, col2 = st.columns(2)
        with col1:
            var1_ccf = st.selectbox("Stock 1", variables, key='ccf_var1')
        with col2:
            var2_ccf = st.selectbox("Stock 2", [v for v in variables if v != var1_ccf], key='ccf_var2')

        lags, correlations = calculate_cross_correlation(
            data[var1_ccf].values,
            data[var2_ccf].values,
            max_lag_ccf
        )

        fig_ccf, opt_lag, opt_corr = plot_cross_correlation(lags, correlations, var1_ccf, var2_ccf)
        st.plotly_chart(fig_ccf, use_container_width=True)

        # Results
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Optimal Lag", f"{opt_lag} days")
        with col2:
            st.metric("Max Correlation", f"{opt_corr:.4f}")
        with col3:
            if opt_lag > 0:
                st.info(f"📊 **{var1_ccf}** leads **{var2_ccf}** by {opt_lag} days")
            elif opt_lag < 0:
                st.info(f"📊 **{var2_ccf}** leads **{var1_ccf}** by {abs(opt_lag)} days")
            else:
                st.info(f"📊 **{var1_ccf}** and **{var2_ccf}** are contemporaneous")

    with tab3:
        st.subheader("Granger Causality Tests")
        st.markdown("*Testing if one stock can predict another (H0: X does not Granger-cause Y)*")

        with st.spinner("Running Granger causality tests..."):
            granger_results = granger_causality_test(data, variables, max_lag_granger)

        if len(granger_results) > 0:
            # Display results table
            granger_display = granger_results.copy()
            granger_display['p_value'] = granger_display['p_value'].apply(lambda x: f"{x:.4f}")
            granger_display['significant'] = granger_display['significant'].apply(lambda x: '✅ Yes' if x else '❌ No')

            st.dataframe(granger_display, use_container_width=True)

            # Network visualization
            fig_network = plot_granger_network(granger_results, color_map)
            if fig_network:
                st.plotly_chart(fig_network, use_container_width=True)

            # Summary
            sig_count = granger_results['significant'].sum()
            st.info(f"Found **{sig_count}** significant Granger causality relationships (p < 0.05)")
        else:
            st.warning("Could not compute Granger causality tests. Check data quality.")

    with tab4:
        st.subheader("Lead-Lag Heatmap")
        st.markdown("*Comprehensive view of all pairwise lead-lag relationships*")

        with st.spinner("Calculating lead-lag relationships..."):
            fig_heatmap = plot_lead_lag_heatmap(data, variables, max_lag=50)

        st.plotly_chart(fig_heatmap, use_container_width=True)

        st.markdown("""
        **How to read this heatmap:**
        - Each cell shows cross-correlation as a function of lag
        - Positive lag: row stock leads column stock
        - Negative lag: column stock leads row stock
        - Peak indicates optimal lead-lag relationship
        """)

    with tab5:
        st.subheader("Rolling Correlation Analysis")
        st.markdown("*Time-varying correlations between stocks*")

        fig_rolling = plot_rolling_correlation(data, variables, rolling_window, color_map)
        st.plotly_chart(fig_rolling, use_container_width=True)

        st.markdown(f"""
        **Rolling Window:** {rolling_window} days

        Rolling correlations show how relationships between stocks change over time.
        This can help identify regime changes and time-varying lead-lag dynamics.
        """)

    # Download section
    st.markdown("---")
    st.subheader("💾 Export Data")

    col1, col2 = st.columns(2)

    with col1:
        # Download processed data
        csv_buffer = io.StringIO()
        data.to_csv(csv_buffer, index=False)
        st.download_button(
            label="Download Stock Data",
            data=csv_buffer.getvalue(),
            file_name=f"stock_data_{'_'.join(variables)}.csv",
            mime="text/csv"
        )

    with col2:
        # Download Granger results
        if 'granger_results' in locals() and len(granger_results) > 0:
            granger_buffer = io.StringIO()
            granger_results.to_csv(granger_buffer, index=False)
            st.download_button(
                label="Download Granger Results",
                data=granger_buffer.getvalue(),
                file_name="granger_causality_results.csv",
                mime="text/csv"
            )


if __name__ == "__main__":
    main()
