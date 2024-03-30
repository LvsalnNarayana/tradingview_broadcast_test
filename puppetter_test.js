const puppeteer = require('puppeteer');
const http = require('http');
const socketIO = require('socket.io');
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors())
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://127.0.0.1:5501", // Allow only this origin to connect
        methods: ["GET", "POST"], // Allowed request methods
        credentials: true, // This allows session cookie to be sent, adjust according to your needs
    },
});

const PORT = 3000;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 3 });
    await page.goto('https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD', {
        waitUntil: 'networkidle0',
    });
    io.on('connection', (socket) => {
        console.log('Client connected');

        const captureAndBroadcast = async () => {
            let latestScreenshotBuffer = null;
            // const element = await page.$(".chart-gui-wrapper");
            // if (element) {
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                encoding: 'base64',
            });
            latestScreenshotBuffer = screenshotBuffer;
            if (latestScreenshotBuffer) {
                socket.emit('screenData', { buffer: latestScreenshotBuffer.toString('base64') });
            }
            // Broadcast the screenshot buffer
            // socket.emit('screenData', { buffer: screenshotBuffer.toString('base64') });
            // }
            setTimeout(captureAndBroadcast, 500); // Continue capturing every 0.5 seconds
        };

        captureAndBroadcast();
    });

    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();
