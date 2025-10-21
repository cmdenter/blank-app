/**
 * Bluefin Client Integration
 * This module handles interaction with the Bluefin exchange on Sui
 */

import { BluefinClient, Networks } from 'bluefin-v2-client-sui'

export class BluefinTradingClient {
  constructor(network = 'mainnet') {
    this.network = network === 'mainnet' ? Networks.PRODUCTION_SUI : Networks.TESTNET_SUI
    this.client = null
    this.isInitialized = false
  }

  /**
   * Initialize the Bluefin client
   */
  async initialize(suiClient, walletAddress) {
    try {
      this.client = new BluefinClient(
        true, // isTermAccepted
        this.network,
        walletAddress
      )

      await this.client.init()
      this.isInitialized = true

      console.log('Bluefin client initialized successfully')
      return this.client
    } catch (error) {
      console.error('Error initializing Bluefin client:', error)
      throw error
    }
  }

  /**
   * Get market information
   */
  async getMarketData(symbol) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const marketData = await this.client.getMarketData(symbol)
      return marketData
    } catch (error) {
      console.error('Error fetching market data:', error)
      throw error
    }
  }

  /**
   * Get user positions
   */
  async getUserPositions() {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const positions = await this.client.getUserPositions()
      return positions
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw error
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(market, side, quantity) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const order = await this.client.postOrder({
        symbol: market,
        side: side, // 'BUY' or 'SELL'
        orderType: 'Market',
        quantity: quantity
      })

      return order
    } catch (error) {
      console.error('Error placing market order:', error)
      throw error
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(market, side, quantity, price) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const order = await this.client.postOrder({
        symbol: market,
        side: side, // 'BUY' or 'SELL'
        orderType: 'Limit',
        quantity: quantity,
        price: price
      })

      return order
    } catch (error) {
      console.error('Error placing limit order:', error)
      throw error
    }
  }

  /**
   * Close a position
   */
  async closePosition(market) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const result = await this.client.closePosition(market)
      return result
    } catch (error) {
      console.error('Error closing position:', error)
      throw error
    }
  }

  /**
   * Get order book
   */
  async getOrderBook(symbol) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const orderBook = await this.client.getOrderbook(symbol)
      return orderBook
    } catch (error) {
      console.error('Error fetching order book:', error)
      throw error
    }
  }

  /**
   * Get user's order history
   */
  async getOrderHistory() {
    if (!this.isInitialized) {
      throw new Error('Client not initialized')
    }

    try {
      const orders = await this.client.getUserOrders()
      return orders
    } catch (error) {
      console.error('Error fetching order history:', error)
      throw error
    }
  }
}

export default BluefinTradingClient
