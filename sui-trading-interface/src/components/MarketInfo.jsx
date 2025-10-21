function MarketInfo({ data }) {
  if (!data) {
    return <div className="loading">Loading market data...</div>
  }

  return (
    <div className="market-info">
      <div className="info-card">
        <div className="info-label">Price</div>
        <div className="info-value">
          ${data.price.toLocaleString()}
        </div>
      </div>

      <div className="info-card">
        <div className="info-label">24h Change</div>
        <div className={`info-value ${data.change24h >= 0 ? 'positive' : 'negative'}`}>
          {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
        </div>
      </div>

      <div className="info-card">
        <div className="info-label">24h Volume</div>
        <div className="info-value">
          ${(data.volume24h / 1000000).toFixed(2)}M
        </div>
      </div>

      <div className="info-card">
        <div className="info-label">24h High</div>
        <div className="info-value">
          ${data.high24h.toLocaleString()}
        </div>
      </div>

      <div className="info-card">
        <div className="info-label">24h Low</div>
        <div className="info-value">
          ${data.low24h.toLocaleString()}
        </div>
      </div>

      <div className="info-card">
        <div className="info-label">Mark Price</div>
        <div className="info-value">
          ${data.price.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export default MarketInfo
