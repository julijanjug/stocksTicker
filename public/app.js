// Configuration settings
const config = {
    tickers: ['VOO', 'VGT', 'VUG', 'AAPL', 'TSLA', 'BTC-USD', 'NVDA', 'RHM.DE'],
    rotationInterval: 10, // seconds
};

// DOM elements
const tickerTextEl = document.getElementById('tickerText');
const tickerInfoEl = document.getElementById('tickerInfo');
const chartCtx = document.getElementById('stockChart').getContext('2d');
const bottomRibbonEl = document.getElementById('bottomRibbon');

// Global chart object
let stockChart;

// Function to handle left click (previous ticker)
function handleLeftClick() {
    currentIndex = (currentIndex - 1 + config.tickers.length) % config.tickers.length;
    updateTicker();
}

// Function to handle right click (next ticker)
function handleRightClick() {
    currentIndex = (currentIndex + 1) % config.tickers.length;
    updateTicker();
}

// Function to update ticker and reset timeout
function updateTicker() {
    const ticker = config.tickers[currentIndex];
    fetchStockData(ticker)
        .then(data => {
            updateTickerInfo(ticker, data.lastPrice, data.prevClose, data.open, data.high, data.low, data.volume);
            updateChart(data.chartData, data.lastPrice >= data.prevClose, data.prevClose, data.open);
        })
        .catch(e => console.error(`Failed to update ${ticker}`, e));
}

// Attach click event listeners to the left and right areas
document.getElementById('leftClickArea').addEventListener('click', handleLeftClick);
document.getElementById('rightClickArea').addEventListener('click', handleRightClick);

// Fetch stock data for a specific ticker
async function fetchStockData(symbol) {
    const url = `http://localhost:3000/api/stock?ticker=${symbol}`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    const { lastPrice, prevClose, chartData, open, high, low, volume } = json;
    return { lastPrice, prevClose, chartData, open, high, low, volume };
}

// Fetch stock data for all tickers
async function fetchAllStockData() {
    const allStockData = [];

    for (let ticker of config.tickers) {
        try {
            const data = await fetchStockData(ticker);
            allStockData.push({ symbol: ticker, ...data });
        } catch (e) {
            console.error('Error fetching data for', ticker, e);
        }
    }
    return allStockData;
}

// Update the ticker text on the page
function updateTickerText(allTickerInfo) {
    tickerTextEl.innerHTML = allTickerInfo.map(t => {
        const diff = t.lastPrice - t.prevClose;
        const percent = (diff / t.prevClose) * 100;
        const color = diff >= 0 ? 'lime' : 'red';
        const arrow = diff >= 0 ? '↑' : '↓';

        return `<span style="color:${color}">${t.symbol}:${t.lastPrice.toFixed(2)}(${percent.toFixed(2)}%)${arrow}</span>`;
    }).join(' ') + '  '.repeat(5);
}

// Update detailed ticker info (symbol, last price, volume, high/low, etc.)
function updateTickerInfo(symbol, last, prev, open, high, low, volume) {
    const diff = last - prev;
    const percent = (diff / prev) * 100;
    const color = diff >= 0 ? 'lime' : 'red';
    const arrow = diff >= 0 ? '↑' : '↓';

    tickerInfoEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="display: flex; flex-direction: column; color: ${color};">
        <div style="font-size: 1.8em; font-weight: bold;">${symbol}</div>
        <div style="margin-top: 8px; font-size: 1em;;">
          ${last.toFixed(2)} (<span>${diff >= 0 ? '+' : ''}${percent.toFixed(2)}%</span>)${arrow}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; text-align: right; gap: 4px; font-size: 0.8em;">
        <div>Vol:${volume.toLocaleString()}</div>
        <div>High:${high.toFixed(2)}</div>
        <div>Low:${low.toFixed(2)}</div>
      </div>
    </div>
  `;
}

// Update the stock chart with new data
function updateChart(data, isUp, prevClose, open) {
    const labels = data.map(p => p.time);
    const prices = data.map(p => p.close);
    const color = isUp ? 'lime' : 'red';

    if (stockChart) stockChart.destroy();

    stockChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Price',
                    data: prices,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBackgroundColor: color
                },
                {
                    label: 'Prev Close',
                    data: Array(prices.length).fill(prevClose),
                    borderColor: 'yellow',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                },
                {
                    label: 'Open',
                    data: Array(prices.length).fill(open),
                    borderColor: 'cyan',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                }
            ]
        },
        options: {
            scales: {
                x: {
                    ticks: { color: color },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: color },
                    grid: { color: '#333' }
                }
            },
            plugins: {
                legend: { display: false },
            },
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0,  // 500ms for smooth animation
                easing: 'easeInOutElastic',
            },
        }
    });
}

// Initialize the ticker data for the first render
async function initializeTickerData() {
    try {
        const allStockData = await fetchAllStockData();
        updateTickerText(allStockData);
        const firstTicker = allStockData[0];
        updateTickerInfo(firstTicker.symbol, firstTicker.lastPrice, firstTicker.prevClose, firstTicker.open, firstTicker.high, firstTicker.low, firstTicker.volume);
        updateChart(firstTicker.chartData, firstTicker.lastPrice >= firstTicker.prevClose, firstTicker.prevClose, firstTicker.open);
    } catch (e) {
        console.error('Error initializing ticker data', e);
    }
}

// Rotate through tickers every `rotationInterval` seconds
let currentIndex = 0;
setInterval(async () => {
    const ticker = config.tickers[currentIndex];
    try {
        const data = await fetchStockData(ticker);
        updateTickerInfo(ticker, data.lastPrice, data.prevClose, data.open, data.high, data.low, data.volume);
        updateChart(data.chartData, data.lastPrice >= data.prevClose, data.prevClose, data.open);
    } catch (e) {
        console.error(`Failed to update ${ticker}`, e);
    }

    currentIndex = (currentIndex + 1) % config.tickers.length;
    console.log(`Rotating to ticker: ${ticker}`);
}, config.rotationInterval * 1000);

// Update the time displayed at the bottom ribbon
function updateTime() {
    const now = new Date();
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    bottomRibbonEl.textContent = now.toLocaleString('en-US', options);
}

// Dynamically adjust the animation speed based on the number of tickers
function updateTickerAnimationSpeed() {
    const tickerCount = config.tickers.length;
    const tickerText = document.getElementById('tickerText');

    const baseSpeed = 20; // Base speed in seconds for a single ticker
    const newSpeed = baseSpeed + (tickerCount - 1) * 5; // Add 5 seconds for each additional ticker

    tickerText.style.animationDuration = `${newSpeed}s`;
}

// Initial function calls
updateTickerAnimationSpeed();
updateTime();
setInterval(updateTime, 1000);  // Update the time every second

// Fetch all data once and initialize the page
initializeTickerData();
