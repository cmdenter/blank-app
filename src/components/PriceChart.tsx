import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';

interface PriceChartProps {
  pair?: string;
}

export function PriceChart({ pair = 'SUI/USDC' }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string>('0.00');
  const [priceChange, setPriceChange] = useState<number>(0);

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

    // Generate initial historical data (last 100 candles)
    const now = Math.floor(Date.now() / 1000);
    const initialData: CandlestickData[] = [];
    let basePrice = 1.85; // Starting SUI price

    for (let i = 100; i > 0; i--) {
      const time = (now - i * 300) as any; // 5-minute candles
      const open = basePrice + (Math.random() - 0.5) * 0.02;
      const close = open + (Math.random() - 0.5) * 0.03;
      const high = Math.max(open, close) + Math.random() * 0.01;
      const low = Math.min(open, close) - Math.random() * 0.01;

      initialData.push({ time, open, high, low, close });
      basePrice = close;
    }

    candleSeries.setData(initialData);

    // Set initial current price
    const lastCandle = initialData[initialData.length - 1];
    setCurrentPrice(lastCandle.close.toFixed(4));
    setPriceChange(((lastCandle.close - initialData[0].open) / initialData[0].open) * 100);

    // Simulate live price updates
    let lastPrice = lastCandle.close;
    let lastTime = lastCandle.time as number;

    const interval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);

      // Add new candle every 5 minutes (300 seconds)
      if (currentTime - lastTime >= 300) {
        const open = lastPrice;
        const close = open + (Math.random() - 0.5) * 0.04;
        const high = Math.max(open, close) + Math.random() * 0.02;
        const low = Math.min(open, close) - Math.random() * 0.02;

        const newCandle: CandlestickData = {
          time: currentTime as any,
          open,
          high,
          low,
          close,
        };

        candleSeries.update(newCandle);
        lastPrice = close;
        lastTime = currentTime;

        setCurrentPrice(close.toFixed(4));
        setPriceChange(((close - initialData[0].open) / initialData[0].open) * 100);
      } else {
        // Update current candle
        const open = lastPrice;
        const close = lastPrice + (Math.random() - 0.5) * 0.01;
        const high = Math.max(open, close) + Math.random() * 0.005;
        const low = Math.min(open, close) - Math.random() * 0.005;

        candleSeries.update({
          time: lastTime as any,
          open,
          high,
          low,
          close,
        });

        lastPrice = close;
        setCurrentPrice(close.toFixed(4));
      }
    }, 2000); // Update every 2 seconds

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
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

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
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                ${currentPrice}
              </span>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: priceChange >= 0 ? '#22c55e' : '#ef4444',
              }}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}>
            <span style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#2a2a3e',
              borderRadius: '4px',
            }}>
              5m
            </span>
            <span style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#3730a3',
              borderRadius: '4px',
              color: 'white',
            }}>
              Live
            </span>
          </div>
        </div>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '0 0 8px 8px',
        }}
      />
    </div>
  );
}
