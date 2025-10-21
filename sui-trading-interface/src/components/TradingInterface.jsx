import { useState, useEffect } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient
} from '@mysten/dapp-kit'
import BluefinClient from './BluefinClient'
import OrderForm from './OrderForm'
import PositionsList from './PositionsList'
import MarketInfo from './MarketInfo'

function TradingInterface() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const [bluefinClient, setBluefinClient] = useState(null)
  const [selectedMarket, setSelectedMarket] = useState('BTC-PERP')
  const [marketData, setMarketData] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize Bluefin client when wallet connects
  useEffect(() => {
    if (account) {
      initializeBluefinClient()
    } else {
      setBluefinClient(null)
      setPositions([])
    }
  }, [account])

  // Fetch market data periodically
  useEffect(() => {
    if (bluefinClient) {
      fetchMarketData()
      const interval = setInterval(fetchMarketData, 5000)
      return () => clearInterval(interval)
    }
  }, [bluefinClient, selectedMarket])

  // Fetch positions periodically
  useEffect(() => {
    if (bluefinClient && account) {
      fetchPositions()
      const interval = setInterval(fetchPositions, 10000)
      return () => clearInterval(interval)
    }
  }, [bluefinClient, account])

  const initializeBluefinClient = async () => {
    try {
      setLoading(true)
      setError(null)

      // Initialize Bluefin client
      // Note: This is a placeholder - actual implementation depends on Bluefin SDK
      const client = {
        // Mock client for demonstration
        isInitialized: true,
        network: 'mainnet'
      }

      setBluefinClient(client)
      console.log('Bluefin client initialized')
    } catch (err) {
      console.error('Error initializing Bluefin client:', err)
      setError('Failed to initialize trading client')
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketData = async () => {
    try {
      // Mock market data - replace with actual Bluefin API call
      setMarketData({
        symbol: selectedMarket,
        price: 95432.50,
        change24h: 2.34,
        volume24h: 1234567890,
        high24h: 96000,
        low24h: 93000
      })
    } catch (err) {
      console.error('Error fetching market data:', err)
    }
  }

  const fetchPositions = async () => {
    try {
      // Mock positions - replace with actual Bluefin API call
      setPositions([
        {
          id: '1',
          market: 'BTC-PERP',
          side: 'LONG',
          size: 0.5,
          entryPrice: 94000,
          markPrice: 95432.50,
          pnl: 716.25,
          pnlPercent: 1.52
        }
      ])
    } catch (err) {
      console.error('Error fetching positions:', err)
    }
  }

  const handlePlaceOrder = async (orderData) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Placing order:', orderData)

      // This is where you would integrate with Bluefin SDK
      // Example flow:
      // 1. Create order using Bluefin client
      // 2. Sign transaction with Sui wallet
      // 3. Execute transaction

      // Mock success
      alert(`Order placed successfully!\n${orderData.side} ${orderData.size} ${selectedMarket} @ ${orderData.price}`)

      // Refresh positions after order
      await fetchPositions()

    } catch (err) {
      console.error('Error placing order:', err)
      setError(`Failed to place order: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClosePosition = async (positionId) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Closing position:', positionId)

      // Mock close position
      setPositions(prev => prev.filter(p => p.id !== positionId))

      alert('Position closed successfully!')

    } catch (err) {
      console.error('Error closing position:', err)
      setError(`Failed to close position: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <h1>
            <span>⚡</span>
            Sui Bluefin Trading
          </h1>
          <div className="wallet-section">
            {account && (
              <div className="wallet-info">
                <div>Connected:</div>
                <div className="wallet-address">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </div>
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!account ? (
        <div className="main-content">
          <div className="trading-panel">
            <div className="loading">
              Please connect your Sui wallet to start trading
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="trading-panel">
            <h2 className="section-title">Markets</h2>

            <div className="market-selector">
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                <option value="BTC-PERP">BTC-PERP</option>
                <option value="ETH-PERP">ETH-PERP</option>
                <option value="SOL-PERP">SOL-PERP</option>
                <option value="SUI-PERP">SUI-PERP</option>
              </select>
            </div>

            {marketData && (
              <MarketInfo data={marketData} />
            )}

            <div className="positions-section">
              <h2 className="section-title">Your Positions</h2>
              <PositionsList
                positions={positions}
                onClose={handleClosePosition}
                loading={loading}
              />
            </div>
          </div>

          <div className="order-panel">
            <h2 className="section-title">Place Order</h2>
            <OrderForm
              market={selectedMarket}
              currentPrice={marketData?.price}
              onSubmit={handlePlaceOrder}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TradingInterface
