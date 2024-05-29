// const puppeteer = require("puppeteer-core");
const puppeteer = require("puppeteer");
const http = require("http");
const socketIO = require("socket.io");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
dotenv.config();
app.use(cors());
const server = http.createServer(app);

// Adjusted CORS configuration for Socket.IO to allow multiple origins
const io = socketIO(server, {
  cors: {
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
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
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV == "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 3 });
    await page.goto(
      "https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD",
      {
        waitUntil: "networkidle0",
      }
    );
  } catch (error) {
    console.log(error);
  }

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
      setTimeout(captureAndBroadcast, 10); // Continue capturing every 0.5 seconds
    };

    captureAndBroadcast();
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();
