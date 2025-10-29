import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { PriceService, PriceData } from '../services/priceService';

interface PriceChartProps {
  pair?: string;
}

export function PriceChart({ pair = 'SUI/USD' }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string>('0.00');
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a3e' },
        horzLines: { color: '#2a2a3e' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2a2a3e',
      },
      timeScale: {
        borderColor: '#2a2a3e',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Initialize price service (fetches from Bluefin and other Sui DEXes)
    const priceService = new PriceService('sui');

    // Load real historical data from DEX Screener
    priceService
      .getHistoricalData('bluefin') // Primary source: Bluefin
      .then((data) => {
        if (data && data.length > 0) {
          // Convert to candlestick format
          const candleData: CandlestickData[] = data.map((candle) => ({
            time: candle.time as any,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));

          candleSeries.setData(candleData);

          // Set initial price
          const lastCandle = data[data.length - 1];
          const firstCandle = data[0];
          setCurrentPrice(lastCandle.close.toFixed(4));
          setPriceChange(
            ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load historical data:', err);
        setError('Failed to load price data');
        setLoading(false);
      });

    // Subscribe to real-time price updates from Bluefin
    const unsubscribe = priceService.subscribeToPriceUpdates(
      (priceData: PriceData) => {
        setCurrentPrice(priceData.price.toFixed(4));
        setPriceChange(priceData.priceChange24h);
        setDataSource(priceData.source);

        // Update the latest candle with current price
        // In a real implementation, you'd update the current candle properly
        // For now, we just update the display - the chart updates on next OHLC fetch
      },
      'bluefin', // Primary DEX: Bluefin
      10000 // Update every 10 seconds
    );

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  if (error) {
    return (
      <div className="price-chart">
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#1a1a2e',
          borderRadius: '8px',
          color: '#ef4444',
        }}>
          <p>Error loading price data: {error}</p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
            Please check your internet connection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="price-chart">
      <div style={{
        padding: '1rem',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #2a2a3e',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {pair}
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
              {loading ? (
                <span style={{ fontSize: '1rem', color: '#9ca3af' }}>Loading...</span>
              ) : (
                <>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    ${currentPrice}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: priceChange >= 0 ? '#22c55e' : '#ef4444',
                  }}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#2a2a3e',
                borderRadius: '4px',
              }}>
                30min
              </span>
              <span style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#22c55e',
                borderRadius: '4px',
                color: 'white',
              }}>
                Live
              </span>
            </div>
            {dataSource && (
              <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                {dataSource}
              </span>
            )}
          </div>
        </div>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '0 0 8px 8px',
          minHeight: '400px',
        }}
      />
    </div>
  );
}
