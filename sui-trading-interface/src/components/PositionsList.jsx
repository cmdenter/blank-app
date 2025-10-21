function PositionsList({ positions, onClose, loading }) {
  if (loading && positions.length === 0) {
    return <div className="loading">Loading positions...</div>
  }

  if (positions.length === 0) {
    return (
      <div className="no-positions">
        No open positions
      </div>
    )
  }

  return (
    <div className="positions-container">
      <table className="positions-table">
        <thead>
          <tr>
            <th>Market</th>
            <th>Side</th>
            <th>Size</th>
            <th>Entry Price</th>
            <th>Mark Price</th>
            <th>PnL</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.id}>
              <td>{position.market}</td>
              <td>
                <span style={{
                  color: position.side === 'LONG' ? '#28a745' : '#dc3545',
                  fontWeight: '600'
                }}>
                  {position.side}
                </span>
              </td>
              <td>{position.size}</td>
              <td>${position.entryPrice.toLocaleString()}</td>
              <td>${position.markPrice.toLocaleString()}</td>
              <td>
                <div style={{
                  color: position.pnl >= 0 ? '#28a745' : '#dc3545',
                  fontWeight: '600'
                }}>
                  ${position.pnl.toFixed(2)}
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                  </div>
                </div>
              </td>
              <td>
                <button
                  className="close-button"
                  onClick={() => onClose(position.id)}
                  disabled={loading}
                >
                  Close
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PositionsList
