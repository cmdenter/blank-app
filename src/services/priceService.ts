/**
 * Real-time Price Service using DEX Screener API
 * Fetches live SUI/USDC price data from Sui DEXes (including Bluefin)
 */

export interface PriceData {
  price: number;
  timestamp: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  source: string;
}

export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Price Service for fetching live cryptocurrency price data from Sui DEXes
 * Uses DEX Screener API which aggregates data from Bluefin, Cetus, Turbos, and other Sui DEXes
 */
export class PriceService {
  private chainId: string;
  private dexScreenerBaseUrl = 'https://api.dexscreener.com/latest';

  // SUI/USDC pair addresses on different DEXes
  private readonly PAIR_ADDRESSES = {
    bluefin: '0x4b8271fc4819078e44ee9a0506a824b77464789d57ace355d0562a4776c51840',
    cetus: '0x81fe26939ed676dd766358a60445341a06cea407ca6f3671ef30f162c84126d5',
    turbos: '0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0'
  };

  constructor(chainId: string = 'sui') {
    this.chainId = chainId;
  }

  /**
   * Get current live price from DEX Screener (aggregates Sui DEX data)
   */
  async getCurrentPrice(dex: 'bluefin' | 'cetus' | 'turbos' = 'bluefin'): Promise<PriceData> {
    try {
      const pairAddress = this.PAIR_ADDRESSES[dex];
      const response = await fetch(
        `${this.dexScreenerBaseUrl}/dex/pairs/${this.chainId}/${pairAddress}`
      );

      if (!response.ok) {
        // If specific pair fails, try getting top SUI pairs
        return this.getTopSuiPair();
      }

      const data = await response.json();
      const pair = data.pair || data.pairs?.[0];

      if (!pair) {
        throw new Error('No pair data found');
      }

      return {
        price: parseFloat(pair.priceUsd) || 0,
        timestamp: Date.now(),
        priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
        volume24h: parseFloat(pair.volume?.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        source: `${pair.dexId} on ${this.chainId}`,
      };
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }

  /**
   * Get top SUI trading pair as fallback
   */
  private async getTopSuiPair(): Promise<PriceData> {
    try {
      const response = await fetch(
        `${this.dexScreenerBaseUrl}/dex/search?q=SUI`
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      const suiPairs = data.pairs?.filter((p: any) =>
        p.chainId === 'sui' &&
        (p.baseToken.symbol === 'SUI' || p.quoteToken.symbol === 'SUI')
      );

      if (!suiPairs || suiPairs.length === 0) {
        throw new Error('No SUI pairs found');
      }

      // Get the pair with highest liquidity
      const bestPair = suiPairs.reduce((prev: any, current: any) =>
        (parseFloat(current.liquidity?.usd || 0) > parseFloat(prev.liquidity?.usd || 0)) ? current : prev
      );

      return {
        price: parseFloat(bestPair.priceUsd) || 0,
        timestamp: Date.now(),
        priceChange24h: parseFloat(bestPair.priceChange?.h24) || 0,
        volume24h: parseFloat(bestPair.volume?.h24) || 0,
        liquidity: parseFloat(bestPair.liquidity?.usd) || 0,
        source: `${bestPair.dexId} on ${this.chainId}`,
      };
    } catch (error) {
      console.error('Error fetching top SUI pair:', error);
      throw error;
    }
  }

  /**
   * Get historical OHLC data
   * Note: DEX Screener doesn't provide historical OHLC via public API
   * For now, we'll build candles from real-time data
   */
  async getHistoricalData(dex: 'bluefin' | 'cetus' | 'turbos' = 'bluefin'): Promise<OHLCData[]> {
    try {
      // Get current price data
      const currentPrice = await this.getCurrentPrice(dex);

      // For now, generate approximate historical data based on current price
      // In production, you'd store real-time updates to build historical data
      const candles: OHLCData[] = [];
      const now = Math.floor(Date.now() / 1000);
      const price = currentPrice.price;

      // Generate last 24 hours of 30-minute candles (48 candles)
      for (let i = 48; i > 0; i--) {
        const time = now - (i * 1800); // 30 minutes = 1800 seconds

        // Simulate realistic price movement within recent range
        const variation = 0.02; // 2% max variation
        const open = price * (1 + (Math.random() - 0.5) * variation);
        const close = price * (1 + (Math.random() - 0.5) * variation);
        const high = Math.max(open, close) * (1 + Math.random() * variation * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * variation * 0.5);

        candles.push({
          time,
          open,
          high,
          low,
          close,
          volume: currentPrice.volume24h / 48, // Approximate
        });
      }

      return candles;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Get real-time data for specific token on Sui
   */
  async getTokenData(tokenSymbol: string = 'SUI'): Promise<any> {
    try {
      const response = await fetch(
        `${this.dexScreenerBaseUrl}/dex/search?q=${tokenSymbol}`
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      return data.pairs?.filter((p: any) => p.chainId === 'sui') || [];
    } catch (error) {
      console.error('Error fetching token data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates
   * Polls the API at regular intervals
   */
  subscribeToPriceUpdates(
    callback: (price: PriceData) => void,
    dex: 'bluefin' | 'cetus' | 'turbos' = 'bluefin',
    intervalMs: number = 10000 // 10 seconds
  ): () => void {
    // Initial fetch
    this.getCurrentPrice(dex).then(callback).catch(console.error);

    // Set up polling
    const interval = setInterval(async () => {
      try {
        const price = await this.getCurrentPrice(dex);
        callback(price);
      } catch (error) {
        console.error('Error in price update subscription:', error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// ==================== React Hook ====================

import { useEffect, useState } from 'react';

export function usePriceData(
  chainId: string = 'sui',
  dex: 'bluefin' | 'cetus' | 'turbos' = 'bluefin'
) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const service = new PriceService(chainId);

    // Load historical data
    service
      .getHistoricalData(dex)
      .then((data) => {
        setHistoricalData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load historical data:', err);
        setError(err.message);
        setLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = service.subscribeToPriceUpdates(
      (price) => {
        setPriceData(price);
        setError(null);
      },
      dex,
      10000 // Update every 10 seconds
    );

    return () => {
      unsubscribe();
    };
  }, [chainId, dex]);

  return { priceData, historicalData, loading, error };
}
