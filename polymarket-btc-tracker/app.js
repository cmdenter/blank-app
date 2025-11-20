// Polymarket BTC Probability Tracker with Historical Tracking
class PolymarketBTCTracker {
    constructor() {
        this.chart = null;
        this.timeSeriesChart = null;
        this.distributionHistoryChart = null;
        this.updateInterval = null;
        this.marketsData = [];
        this.history = [];
        this.selectedTimeRange = '24h';
        this.STORAGE_KEY = 'polymarket_btc_history';
        this.MAX_HISTORY_DAYS = 90; // Keep 90 days max
    }

    async init() {
        try {
            this.loadHistory();
            await this.fetchMarketData();
            this.setupCharts();
            this.setupEventListeners();
            this.startAutoUpdate();
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Load historical data from localStorage
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.history = JSON.parse(stored);
                // Clean old data
                const cutoff = Date.now() - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
                this.history = this.history.filter(point => point.timestamp > cutoff);
                this.saveHistory();
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.history = [];
        }
    }

    // Save historical data to localStorage
    saveHistory() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    // Add current data point to history
    addToHistory(bullish, bearish, marketCount) {
        const dataPoint = {
            timestamp: Date.now(),
            bullish: bullish,
            bearish: bearish,
            marketCount: marketCount,
            sentiment: bullish - bearish
        };

        this.history.push(dataPoint);
        this.saveHistory();
        this.updateHistoryCharts();
        this.updateHistoryStats();
    }

    async fetchMarketData() {
        try {
            // Fetch markets from Polymarket API
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
            ).slice(0, 10);

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
            if (market.outcomes && market.outcomes.length >= 2) {
                const yesProb = parseFloat(market.outcomePrices?.[0] || 0.5);
                const noProb = parseFloat(market.outcomePrices?.[1] || 0.5);

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

        const avgBullish = marketCount > 0 ? totalBullish / marketCount : 0.5;
        const avgBearish = marketCount > 0 ? totalBearish / marketCount : 0.5;

        this.updateStats(avgBullish, avgBearish, marketCount);
        this.updateMarketList();
        this.updateChart(avgBullish, avgBearish);
        this.addToHistory(avgBullish, avgBearish, marketCount);
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

    setupCharts() {
        this.setupDistributionChart();
        this.setupTimeSeriesChart();
        this.setupDistributionHistoryChart();
        this.updateHistoryCharts();
        this.updateHistoryStats();
    }

    setupDistributionChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Current Probability Distribution',
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
                        text: 'Current BTC Price Prediction Probability Distribution',
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

    setupTimeSeriesChart() {
        const ctx = document.getElementById('timeSeriesChart').getContext('2d');

        this.timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Bullish Probability',
                        data: [],
                        borderColor: 'rgb(56, 239, 125)',
                        backgroundColor: 'rgba(56, 239, 125, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Bearish Probability',
                        data: [],
                        borderColor: 'rgb(235, 51, 73)',
                        backgroundColor: 'rgba(235, 51, 73, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
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
                        text: 'Probability Evolution Over Time',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + (context.parsed.y * 100).toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probability'
                        },
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    setupDistributionHistoryChart() {
        const ctx = document.getElementById('distributionHistoryChart').getContext('2d');

        this.distributionHistoryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
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
                        text: 'Distribution Curve Evolution (Historical Overlay)',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        enabled: true
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
        const points = 100;
        const labels = [];
        const data = [];

        const mean = (bullishProb - bearishProb) * 50;
        const stdDev = 20;

        for (let i = 0; i < points; i++) {
            const x = (i - points/2) * 2;
            labels.push(x > 0 ? `+${x.toFixed(0)}%` : `${x.toFixed(0)}%`);

            const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            data.push(y);
        }

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    updateHistoryCharts() {
        const filteredHistory = this.getFilteredHistory();

        if (filteredHistory.length === 0) {
            return;
        }

        // Update time series chart
        const labels = filteredHistory.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        this.timeSeriesChart.data.labels = labels;
        this.timeSeriesChart.data.datasets[0].data = filteredHistory.map(p => p.bullish);
        this.timeSeriesChart.data.datasets[1].data = filteredHistory.map(p => p.bearish);
        this.timeSeriesChart.update();

        // Update distribution history chart (show snapshots)
        this.updateDistributionHistory(filteredHistory);
    }

    updateDistributionHistory(filteredHistory) {
        // Show distribution curves at different time points
        const datasets = [];
        const points = 100;
        const labels = [];

        // Generate x-axis labels
        for (let i = 0; i < points; i++) {
            const x = (i - points/2) * 2;
            labels.push(x > 0 ? `+${x.toFixed(0)}%` : `${x.toFixed(0)}%`);
        }

        // Sample up to 5 historical points evenly distributed
        const sampleCount = Math.min(5, filteredHistory.length);
        const step = Math.max(1, Math.floor(filteredHistory.length / sampleCount));

        for (let i = 0; i < sampleCount; i++) {
            const index = i * step;
            if (index >= filteredHistory.length) break;

            const point = filteredHistory[index];
            const data = this.generateDistribution(point.bullish, point.bearish);
            const opacity = 0.3 + (i / sampleCount) * 0.7; // Older = more transparent

            const hue = point.bullish > point.bearish ? 120 : 0; // Green for bullish, red for bearish

            datasets.push({
                label: new Date(point.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit'
                }),
                data: data,
                borderColor: `hsla(${hue}, 70%, 50%, ${opacity})`,
                backgroundColor: `hsla(${hue}, 70%, 50%, ${opacity * 0.1})`,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            });
        }

        this.distributionHistoryChart.data.labels = labels;
        this.distributionHistoryChart.data.datasets = datasets;
        this.distributionHistoryChart.update();
    }

    generateDistribution(bullishProb, bearishProb) {
        const points = 100;
        const data = [];
        const mean = (bullishProb - bearishProb) * 50;
        const stdDev = 20;

        for (let i = 0; i < points; i++) {
            const x = (i - points/2) * 2;
            const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            data.push(y);
        }

        return data;
    }

    getFilteredHistory() {
        const now = Date.now();
        let cutoff;

        switch (this.selectedTimeRange) {
            case '24h':
                cutoff = now - (24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoff = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                cutoff = 0;
        }

        return this.history.filter(point => point.timestamp >= cutoff);
    }

    updateHistoryStats() {
        const filteredHistory = this.getFilteredHistory();

        document.getElementById('data-points').textContent = filteredHistory.length;

        if (filteredHistory.length > 0) {
            const oldest = new Date(filteredHistory[0].timestamp);
            document.getElementById('tracking-since').textContent = oldest.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const avgBullish = filteredHistory.reduce((sum, p) => sum + p.bullish, 0) / filteredHistory.length;
            const avgBearish = filteredHistory.reduce((sum, p) => sum + p.bearish, 0) / filteredHistory.length;

            document.getElementById('avg-bullish').textContent = (avgBullish * 100).toFixed(1) + '%';
            document.getElementById('avg-bearish').textContent = (avgBearish * 100).toFixed(1) + '%';
        } else {
            document.getElementById('tracking-since').textContent = '-';
            document.getElementById('avg-bullish').textContent = '0%';
            document.getElementById('avg-bearish').textContent = '0%';
        }
    }

    setupEventListeners() {
        // Time range buttons
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedTimeRange = e.target.dataset.range;
                this.updateHistoryCharts();
                this.updateHistoryStats();
            });
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all historical data? This cannot be undone.')) {
                this.history = [];
                this.saveHistory();
                this.updateHistoryCharts();
                this.updateHistoryStats();
            }
        });
    }

    exportData() {
        const filteredHistory = this.getFilteredHistory();
        const csvContent = this.generateCSV(filteredHistory);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `polymarket-btc-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateCSV(data) {
        const headers = ['Timestamp', 'Date', 'Bullish Probability', 'Bearish Probability', 'Sentiment', 'Market Count'];
        const rows = data.map(point => {
            const date = new Date(point.timestamp);
            return [
                point.timestamp,
                date.toISOString(),
                point.bullish.toFixed(4),
                point.bearish.toFixed(4),
                point.sentiment.toFixed(4),
                point.marketCount
            ];
        });

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    startAutoUpdate() {
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

        this.useDemoData();
    }

    useDemoData() {
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
        this.setupCharts();
        this.hideLoading();
    }
}

// Initialize the tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    const tracker = new PolymarketBTCTracker();
    tracker.init();
});
