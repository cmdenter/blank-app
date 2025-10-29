/**
 * Real-time Price Service
 * - Current prices from Bluefin (via DEX Screener) - real Sui ecosystem data
 * - Historical OHLC from CoinGecko - real candlestick data
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
 * Price Service for fetching live cryptocurrency price data
 * Combines Bluefin/DEX Screener for current prices and CoinGecko for historical OHLC
 */
export class PriceService {
  private chainId: string;
  private dexScreenerBaseUrl = 'https://api.dexscreener.com/latest';
  private coinGeckoBaseUrl = 'https://api.coingecko.com/api/v3';
  private coinId = 'sui';

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
   * Get current live price from DEX Screener (Bluefin and other Sui DEXes)
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
      console.error('Error fetching current price from DEX Screener:', error);
      // Fallback to CoinGecko for current price
      return this.getCurrentPriceFromCoinGecko();
    }
  }

  /**
   * Get current price from CoinGecko (fallback)
   */
  private async getCurrentPriceFromCoinGecko(): Promise<PriceData> {
    try {
      const response = await fetch(
        `${this.coinGeckoBaseUrl}/simple/price?ids=${this.coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const coinData = data[this.coinId];

      return {
        price: coinData.usd,
        timestamp: Date.now(),
        priceChange24h: coinData.usd_24h_change || 0,
        volume24h: coinData.usd_24h_vol || 0,
        liquidity: 0,
        source: 'coingecko',
      };
    } catch (error) {
      console.error('Error fetching from CoinGecko:', error);
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
   * Get REAL historical OHLC data from CoinGecko
   * This returns actual candlestick data, not simulated!
   */
  async getHistoricalData(days: number = 1): Promise<OHLCData[]> {
    try {
      // CoinGecko OHLC endpoint - returns REAL historical candlestick data
      const response = await fetch(
        `${this.coinGeckoBaseUrl}/coins/${this.coinId}/ohlc?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko OHLC API error: ${response.status}`);
      }

      const data = await response.json();

      // CoinGecko returns: [[timestamp, open, high, low, close], ...]
      // This is REAL historical data from actual trades
      return data.map((candle: number[]) => ({
        time: Math.floor(candle[0] / 1000), // Convert ms to seconds
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
      }));
    } catch (error) {
      console.error('Error fetching real historical OHLC data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates from Bluefin/Sui DEXes
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

    // Load REAL historical data from CoinGecko (no simulation!)
    service
      .getHistoricalData(1) // Last 24 hours of REAL candles
      .then((data) => {
        setHistoricalData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load historical data:', err);
        setError(err.message);
        setLoading(false);
      });

    // Subscribe to real-time updates from Bluefin
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
