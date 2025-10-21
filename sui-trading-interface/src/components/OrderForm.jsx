import { useState } from 'react'

function OrderForm({ market, currentPrice, onSubmit, loading }) {
  const [orderType, setOrderType] = useState('limit') // 'market' or 'limit'
  const [side, setSide] = useState('buy') // 'buy' or 'sell'
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!size || parseFloat(size) <= 0) {
      alert('Please enter a valid size')
      return
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      alert('Please enter a valid price')
      return
    }

    const orderData = {
      market,
      type: orderType,
      side: side.toUpperCase(),
      size: parseFloat(size),
      price: orderType === 'limit' ? parseFloat(price) : currentPrice
    }

    onSubmit(orderData)

    // Reset form
    setSize('')
    if (orderType === 'limit') {
      setPrice('')
    }
  }

  // Set price to current market price when switching to limit order
  const handleOrderTypeChange = (type) => {
    setOrderType(type)
    if (type === 'limit' && currentPrice && !price) {
      setPrice(currentPrice.toString())
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-type-selector">
        <button
          type="button"
          className={`type-button ${orderType === 'limit' ? 'active' : ''}`}
          onClick={() => handleOrderTypeChange('limit')}
        >
          Limit
        </button>
        <button
          type="button"
          className={`type-button ${orderType === 'market' ? 'active' : ''}`}
          onClick={() => handleOrderTypeChange('market')}
        >
          Market
        </button>
      </div>

      <div className="side-selector">
        <button
          type="button"
          className={`side-button buy ${side === 'buy' ? 'active' : ''}`}
          onClick={() => setSide('buy')}
        >
          Buy / Long
        </button>
        <button
          type="button"
          className={`side-button sell ${side === 'sell' ? 'active' : ''}`}
          onClick={() => setSide('sell')}
        >
          Sell / Short
        </button>
      </div>

      {orderType === 'limit' && (
        <div className="form-group">
          <label className="form-label">Price (USDC)</label>
          <input
            type="number"
            className="form-input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
            step="0.01"
            min="0"
          />
        </div>
      )}

      {orderType === 'market' && currentPrice && (
        <div className="form-group">
          <label className="form-label">Market Price</label>
          <div className="form-input" style={{ background: '#f8f9fa', cursor: 'not-allowed' }}>
            ${currentPrice.toLocaleString()}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Size</label>
        <input
          type="number"
          className="form-input"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Enter size"
          step="0.001"
          min="0"
        />
      </div>

      {size && (orderType === 'market' ? currentPrice : price) && (
        <div className="form-group">
          <label className="form-label">Total</label>
          <div className="form-input" style={{ background: '#f8f9fa', cursor: 'not-allowed' }}>
            ${(parseFloat(size) * (orderType === 'market' ? currentPrice : parseFloat(price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
          </div>
        </div>
      )}

      <button
        type="submit"
        className={`submit-button ${side}`}
        disabled={loading}
      >
        {loading ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${market}`}
      </button>

      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px', textAlign: 'center' }}>
        {orderType === 'market' ? 'Market orders execute immediately at current price' : 'Limit orders execute at specified price or better'}
      </div>
    </form>
  )
}

export default OrderForm
