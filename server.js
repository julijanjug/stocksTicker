const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const path = require('path');

const app = express();
const port = 3000;

// CORS configuration with credentials and specific headers
app.use(cors({
    origin: 'http://localhost', // Allow frontend requests from localhost
    methods: 'GET', // Allow only GET requests
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
    credentials: true // Allow cookies if needed
}));

// Serve static files (index.html and other assets)
app.use(express.static(path.join(__dirname, 'public')));

// Route to fetch stock data from Yahoo Finance using yahoo-finance2
app.get('/api/stock', async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) {
        return res.status(400).send('Ticker symbol is required');
    }

    try {
        // Fetching the stock quote and chart data (intraday data)
        const quote = await yahooFinance.quote(ticker);
        const startDate = new Date(quote.regularMarketTime.toDateString());
        const chart = await yahooFinance.chart(ticker, { period1: startDate, interval: '5m' });

        // Extracting necessary data
        const lastPrice = quote.regularMarketPrice;
        const prevClose = quote.regularMarketPreviousClose;
        const open = quote.regularMarketOpen;
        const high = quote.regularMarketDayHigh;
        const low = quote.regularMarketDayLow;
        const volume = quote.regularMarketVolume;

        const startTime = new Date(chart.meta.currentTradingPeriod.regular.start);
        const endTime = new Date(chart.meta.currentTradingPeriod.regular.end);
        const chartFormatted = chart.quotes.map((quote, i) => {
            if (quote.date < startTime || quote.date > endTime) {
                return null;
            }

            return {
                time: new Date(quote.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                close: quote.close,
                open: quote.open,
                high: quote.high,
                low: quote.low,
                volume: quote.volume
            }
        }).filter(Boolean);

        res.json({
            lastPrice,
            prevClose,
            open,
            high,
            low,
            volume,
            chartData: chartFormatted // Filter out null values,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data');
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
