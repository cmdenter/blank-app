// Polymarket BTC Probability Tracker
class PolymarketBTCTracker {
    constructor() {
        this.chart = null;
        this.updateInterval = null;
        this.marketsData = [];
    }

    async init() {
        try {
            await this.fetchMarketData();
            this.setupChart();
            this.startAutoUpdate();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchMarketData() {
        try {
            // Fetch markets from Polymarket API
            // Using the CLOB API to search for BTC-related markets
            const response = await fetch('https://clob.polymarket.com/markets');

            if (!response.ok) {
                throw new Error('Failed to fetch market data');
            }

            const markets = await response.json();

            // Filter for BTC-related markets that are active
            this.marketsData = markets.filter(market =>
                (market.question.toLowerCase().includes('bitcoin') ||
                 market.question.toLowerCase().includes('btc')) &&
                market.active === true &&
                market.closed === false
            ).slice(0, 10); // Limit to top 10 markets

            if (this.marketsData.length === 0) {
                throw new Error('No active BTC markets found');
            }

            this.processMarketData();
            this.hideLoading();

        } catch (error) {
            console.error('Error fetching market data:', error);
            throw error;
        }
    }

    processMarketData() {
        let totalBullish = 0;
        let totalBearish = 0;
        let marketCount = 0;

        this.marketsData.forEach(market => {
            // Polymarket markets have outcomes with probabilities
            if (market.outcomes && market.outcomes.length >= 2) {
                const yesProb = parseFloat(market.outcomePrices?.[0] || 0.5);
                const noProb = parseFloat(market.outcomePrices?.[1] || 0.5);

                // Determine if this is bullish or bearish based on question
                const question = market.question.toLowerCase();
                const isBullishQuestion = question.includes('above') ||
                                         question.includes('reach') ||
                                         question.includes('exceed') ||
                                         question.includes('higher');

                if (isBullishQuestion) {
                    totalBullish += yesProb;
                    totalBearish += noProb;
                } else {
                    totalBullish += noProb;
                    totalBearish += yesProb;
                }
                marketCount++;
            }
        });

        // Calculate average probabilities
        const avgBullish = marketCount > 0 ? totalBullish / marketCount : 0.5;
        const avgBearish = marketCount > 0 ? totalBearish / marketCount : 0.5;

        this.updateStats(avgBullish, avgBearish, marketCount);
        this.updateMarketList();
        this.updateChart(avgBullish, avgBearish);
    }

    updateStats(bullish, bearish, count) {
        document.getElementById('bullish-prob').textContent = (bullish * 100).toFixed(1) + '%';
        document.getElementById('bearish-prob').textContent = (bearish * 100).toFixed(1) + '%';
        document.getElementById('market-count').textContent = count;

        const sentiment = bullish > bearish ? 'Bullish 📈' :
                         bearish > bullish ? 'Bearish 📉' :
                         'Neutral ➡️';
        document.getElementById('sentiment').textContent = sentiment;

        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }

    updateMarketList() {
        const listContainer = document.getElementById('market-list');
        const marketsHTML = this.marketsData.map(market => {
            const yesProb = (parseFloat(market.outcomePrices?.[0] || 0.5) * 100).toFixed(1);
            const noProb = (parseFloat(market.outcomePrices?.[1] || 0.5) * 100).toFixed(1);

            return `
                <div class="market-item">
                    <div class="market-title">${market.question}</div>
                    <div class="market-odds">
                        <span>Yes: ${yesProb}%</span>
                        <span>No: ${noProb}%</span>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = '<h2 style="margin-bottom: 15px;">Active BTC Markets</h2>' + marketsHTML;
    }

    setupChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Probability Distribution',
                    data: [],
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'BTC Price Prediction Probability Distribution',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Probability: ' + context.parsed.y.toFixed(4);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Price Movement'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probability Density'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateChart(bullishProb, bearishProb) {
        // Generate a normal distribution curve based on the probabilities
        const points = 100;
        const labels = [];
        const data = [];

        // Calculate mean and standard deviation based on bullish/bearish probabilities
        // Mean shifts based on market sentiment
        const mean = (bullishProb - bearishProb) * 50; // Range from -50 to +50
        const stdDev = 20; // Standard deviation

        // Generate normal distribution curve
        for (let i = 0; i < points; i++) {
            const x = (i - points/2) * 2; // Range from -100 to +100
            labels.push(x > 0 ? `+${x.toFixed(0)}%` : `${x.toFixed(0)}%`);

            // Normal distribution formula
            const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            data.push(y);
        }

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    startAutoUpdate() {
        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            this.fetchMarketData();
        }, 30000);
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = `Error: ${message}. Using demo data instead.`;
        errorDiv.style.display = 'block';

        // Use demo data if API fails
        this.useDemoData();
    }

    useDemoData() {
        // Create demo markets for demonstration
        this.marketsData = [
            {
                question: "Will Bitcoin reach $100,000 by end of 2025?",
                outcomes: ["Yes", "No"],
                outcomePrices: ["0.65", "0.35"],
                active: true,
                closed: false
            },
            {
                question: "Will BTC stay above $90,000 in November?",
                outcomes: ["Yes", "No"],
                outcomePrices: ["0.72", "0.28"],
                active: true,
                closed: false
            },
            {
                question: "Will Bitcoin drop below $80,000 this month?",
                outcomes: ["Yes", "No"],
                outcomePrices: ["0.25", "0.75"],
                active: true,
                closed: false
            }
        ];

        this.processMarketData();
        this.setupChart();
        this.hideLoading();
    }
}

// Initialize the tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    const tracker = new PolymarketBTCTracker();
    tracker.init();
});
