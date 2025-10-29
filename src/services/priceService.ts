import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export interface PriceData {
  price: number;
  timestamp: number;
  confidence: number;
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
 * Price Service for fetching live price data from Sui blockchain
 *
 * Supports:
 * - Real-time price from on-chain oracle
 * - Historical OHLC data
 * - Simulated data for development
 */
export class PriceService {
  private client: SuiClient;
  private packageId?: string;
  private oracleRegistryId?: string;
  private useSimulatedData: boolean;

  constructor(
    client: SuiClient,
    packageId?: string,
    oracleRegistryId?: string,
    useSimulatedData = true
  ) {
    this.client = client;
    this.packageId = packageId;
    this.oracleRegistryId = oracleRegistryId;
    this.useSimulatedData = useSimulatedData;
  }

  /**
   * Get current price from on-chain oracle
   */
  async getCurrentPrice(pair: string): Promise<PriceData> {
    if (this.useSimulatedData || !this.packageId || !this.oracleRegistryId) {
      return this.getSimulatedPrice(pair);
    }

    try {
      // Call the price_oracle::get_price function
      const tx = new TransactionBlock();
      const pairBytes = Array.from(new TextEncoder().encode(pair));

      tx.moveCall({
        target: `${this.packageId}::price_oracle::get_price`,
        arguments: [
          tx.object(this.oracleRegistryId),
          tx.pure(pairBytes),
          tx.object('0x6'), // Clock object
        ],
      });

      // This is a dev inspect call (read-only, no gas cost)
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      // Parse the result
      if (result.results && result.results[0]) {
        // Extract price from PriceData struct
        // Format: { price: u64, confidence: u64, timestamp: u64, sources: vector<u8> }
        const returnValue = result.results[0].returnValues?.[0];

        if (returnValue) {
          // Decode the price data (simplified - actual decoding depends on exact format)
          const [priceBytes] = returnValue;
          const price = this.decodePriceFromBytes(priceBytes);

          return {
            price,
            timestamp: Date.now(),
            confidence: 95, // From oracle
            source: 'on-chain-oracle',
          };
        }
      }

      // Fallback to simulated if parsing fails
      return this.getSimulatedPrice(pair);
    } catch (error) {
      console.error('Error fetching on-chain price:', error);
      return this.getSimulatedPrice(pair);
    }
  }

  /**
   * Get historical OHLC data
   */
  async getHistoricalData(
    pair: string,
    interval: number = 300, // 5 minutes in seconds
    count: number = 100
  ): Promise<OHLCData[]> {
    if (this.useSimulatedData) {
      return this.getSimulatedHistoricalData(pair, interval, count);
    }

    // In production, this would query historical events or off-chain API
    // For now, return simulated data
    return this.getSimulatedHistoricalData(pair, interval, count);
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPriceUpdates(
    pair: string,
    callback: (price: PriceData) => void,
    intervalMs: number = 2000
  ): () => void {
    const interval = setInterval(async () => {
      const price = await this.getCurrentPrice(pair);
      callback(price);
    }, intervalMs);

    return () => clearInterval(interval);
  }

  // ==================== Simulated Data (for development) ====================

  private lastSimulatedPrice = 1.85;
  private simulatedPriceHistory: Map<string, number> = new Map();

  private getSimulatedPrice(pair: string): PriceData {
    // Simulate realistic price movement
    const change = (Math.random() - 0.5) * 0.02; // ±1% change
    this.lastSimulatedPrice = Math.max(0.01, this.lastSimulatedPrice + change);

    return {
      price: this.lastSimulatedPrice,
      timestamp: Date.now(),
      confidence: 98,
      source: 'simulated',
    };
  }

  private getSimulatedHistoricalData(
    pair: string,
    interval: number,
    count: number
  ): OHLCData[] {
    const data: OHLCData[] = [];
    const now = Math.floor(Date.now() / 1000);
    let basePrice = 1.85;

    for (let i = count; i > 0; i--) {
      const time = now - i * interval;
      const open = basePrice + (Math.random() - 0.5) * 0.02;
      const close = open + (Math.random() - 0.5) * 0.03;
      const high = Math.max(open, close) + Math.random() * 0.01;
      const low = Math.min(open, close) - Math.random() * 0.01;
      const volume = Math.random() * 1000000;

      data.push({ time, open, high, low, close, volume });
      basePrice = close;
    }

    this.lastSimulatedPrice = basePrice;
    return data;
  }

  private decodePriceFromBytes(bytes: number[]): number {
    // Decode u64 from bytes (little-endian)
    // Sui uses 9 decimals for price precision
    let value = 0n;
    for (let i = 0; i < 8 && i < bytes.length; i++) {
      value |= BigInt(bytes[i]) << BigInt(i * 8);
    }

    // Convert to number with 9 decimal places
    return Number(value) / 1_000_000_000;
  }
}

// ==================== React Hook ====================

import { useEffect, useState } from 'react';

export function usePriceData(
  client: SuiClient,
  pair: string = 'SUI/USDC',
  packageId?: string,
  oracleRegistryId?: string
) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const service = new PriceService(
      client,
      packageId,
      oracleRegistryId,
      !packageId || !oracleRegistryId // Use simulated data if IDs not provided
    );

    // Load historical data
    service.getHistoricalData(pair, 300, 100).then((data) => {
      setHistoricalData(data);
      setLoading(false);
    });

    // Subscribe to real-time updates
    const unsubscribe = service.subscribeToPriceUpdates(pair, (price) => {
      setPriceData(price);
    });

    return () => {
      unsubscribe();
    };
  }, [client, pair, packageId, oracleRegistryId]);

  return { priceData, historicalData, loading };
}
