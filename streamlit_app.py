import streamlit as st
import pandas as pd
import requests
import plotly.graph_objects as go
from datetime import datetime, timedelta

# Page configuration
st.set_page_config(page_title="BTC EMA Trading Bot", page_icon="₿", layout="wide")

st.title("₿ BTC EMA Crossover Trading Strategy")
st.write("20 EMA vs 50 EMA Crossover Strategy")

# Sidebar for configuration
st.sidebar.header("Settings")
interval = st.sidebar.selectbox(
    "Time Interval",
    ["1m", "5m", "15m", "1h", "4h", "1d"],
    index=3  # Default to 1h
)

limit = st.sidebar.slider("Number of candles", 50, 500, 200)

# Function to fetch BTC price data from Binance
@st.cache_data(ttl=60)  # Cache for 60 seconds
def fetch_btc_data(symbol="BTCUSDT", interval="1h", limit=200):
    """
    Fetch BTC price data from Binance API
    """
    try:
        url = "https://api.binance.com/api/v3/klines"
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        # Convert to DataFrame
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])

        # Convert columns to appropriate types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)

        return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
    except Exception as e:
        st.error(f"Error fetching data: {str(e)}")
        return None

# Function to calculate EMA
def calculate_ema(data, period):
    """
    Calculate Exponential Moving Average
    """
    return data.ewm(span=period, adjust=False).mean()

# Function to generate trading signals
def generate_signals(df):
    """
    Generate BUY/SELL signals based on EMA crossover
    """
    df = df.copy()

    # Calculate EMAs
    df['ema_20'] = calculate_ema(df['close'], 20)
    df['ema_50'] = calculate_ema(df['close'], 50)

    # Generate signals
    df['signal'] = 0
    df['position'] = 0

    # BUY when 20 EMA crosses above 50 EMA
    # SELL when 20 EMA crosses below 50 EMA
    for i in range(1, len(df)):
        if df['ema_20'].iloc[i] > df['ema_50'].iloc[i] and df['ema_20'].iloc[i-1] <= df['ema_50'].iloc[i-1]:
            df.loc[df.index[i], 'signal'] = 1  # BUY
        elif df['ema_20'].iloc[i] < df['ema_50'].iloc[i] and df['ema_20'].iloc[i-1] >= df['ema_50'].iloc[i-1]:
            df.loc[df.index[i], 'signal'] = -1  # SELL

    # Track current position
    current_position = 0
    for i in range(len(df)):
        if df['signal'].iloc[i] == 1:
            current_position = 1
        elif df['signal'].iloc[i] == -1:
            current_position = 0
        df.loc[df.index[i], 'position'] = current_position

    return df

# Fetch and process data
with st.spinner("Fetching BTC data..."):
    df = fetch_btc_data(interval=interval, limit=limit)

if df is not None and not df.empty:
    # Generate signals
    df = generate_signals(df)

    # Display current price and status
    col1, col2, col3, col4 = st.columns(4)

    current_price = df['close'].iloc[-1]
    current_ema_20 = df['ema_20'].iloc[-1]
    current_ema_50 = df['ema_50'].iloc[-1]
    current_position = df['position'].iloc[-1]

    with col1:
        st.metric("Current BTC Price", f"${current_price:,.2f}")

    with col2:
        st.metric("20 EMA", f"${current_ema_20:,.2f}")

    with col3:
        st.metric("50 EMA", f"${current_ema_50:,.2f}")

    with col4:
        if current_position == 1:
            st.metric("Position", "LONG", delta="Bullish")
        else:
            st.metric("Position", "FLAT", delta="Neutral")

    # Create candlestick chart with EMAs
    fig = go.Figure()

    # Candlestick
    fig.add_trace(go.Candlestick(
        x=df['timestamp'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close'],
        name='BTC Price'
    ))

    # 20 EMA
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['ema_20'],
        mode='lines',
        name='20 EMA',
        line=dict(color='blue', width=2)
    ))

    # 50 EMA
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['ema_50'],
        mode='lines',
        name='50 EMA',
        line=dict(color='red', width=2)
    ))

    # Add BUY signals
    buy_signals = df[df['signal'] == 1]
    fig.add_trace(go.Scatter(
        x=buy_signals['timestamp'],
        y=buy_signals['close'],
        mode='markers',
        name='BUY Signal',
        marker=dict(color='green', size=15, symbol='triangle-up')
    ))

    # Add SELL signals
    sell_signals = df[df['signal'] == -1]
    fig.add_trace(go.Scatter(
        x=sell_signals['timestamp'],
        y=sell_signals['close'],
        mode='markers',
        name='SELL Signal',
        marker=dict(color='red', size=15, symbol='triangle-down')
    ))

    fig.update_layout(
        title='BTC/USDT Price with EMA Crossover Signals',
        xaxis_title='Time',
        yaxis_title='Price (USDT)',
        height=600,
        xaxis_rangeslider_visible=False
    )

    st.plotly_chart(fig, use_container_width=True)

    # Display signals table
    st.subheader("Recent Trading Signals")
    signals_df = df[df['signal'] != 0][['timestamp', 'close', 'ema_20', 'ema_50', 'signal']].copy()
    signals_df['signal'] = signals_df['signal'].map({1: 'BUY', -1: 'SELL'})
    signals_df.columns = ['Time', 'Price', '20 EMA', '50 EMA', 'Signal']
    st.dataframe(signals_df.tail(10).sort_values('Time', ascending=False), use_container_width=True)

    # Strategy explanation
    st.subheader("Strategy Explanation")
    st.write("""
    **20/50 EMA Crossover Strategy:**
    - **BUY Signal**: When the 20 EMA crosses above the 50 EMA (bullish crossover)
    - **SELL Signal**: When the 20 EMA crosses below the 50 EMA (bearish crossover)

    This is a trend-following strategy that aims to capture medium-term price movements.
    The strategy enters long positions when the shorter-term EMA (20) crosses above the longer-term EMA (50),
    indicating upward momentum, and exits when the opposite occurs.
    """)

    # Add refresh button
    if st.button("Refresh Data"):
        st.cache_data.clear()
        st.rerun()

else:
    st.error("Unable to fetch BTC data. Please try again later.")

# Footer
st.markdown("---")
st.caption("Data source: Binance API | This is for educational purposes only. Not financial advice.")
