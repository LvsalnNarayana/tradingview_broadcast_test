const puppeteer = require("puppeteer-core");
const http = require("http");
const socketIO = require("socket.io");
const express = require("express");
const cors = require("cors");
const chromium = require('chrome-aws-lambda');
const app = express();
app.use(cors());
const server = http.createServer(app);

// Adjusted CORS configuration for Socket.IO to allow multiple origins
const io = socketIO(server, {
    cors: {
        origin: [
            "http://127.0.0.1:5500",
            // "https://tradingview-broadcast-frontend.vercel.app",
        ],
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const PORT = 3000;

// Test route to check the server status
app.get("/status", (req, res) => {
    res.json({ status: "Server is running" });
});

(async () => {
    const browser = await puppeteer.launch();
    // const browser = await chromium.puppeteer.launch({
    //     args: chromium.args,
    //     defaultViewport: chromium.defaultViewport,
    //     executablePath: await chromium.executablePath,
    //     headless: chromium.headless,
    //     ignoreHTTPSErrors: true,
    // });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 3 });
    await page.goto(
        "https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD",
        {
            waitUntil: "networkidle0",
        }
    );
    console.log(page);

    io.on("connection", (socket) => {
        console.log("Client connected");
        const captureAndBroadcast = async () => {
            let latestScreenshotBuffer = null;
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                encoding: "base64",
            });
            latestScreenshotBuffer = screenshotBuffer;
            if (latestScreenshotBuffer) {
                socket.emit("screenData", {
                    buffer: latestScreenshotBuffer.toString("base64"),
                });
            }
            setTimeout(captureAndBroadcast, 500); // Continue capturing every 0.5 seconds
        };

        captureAndBroadcast();
    });

    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();
