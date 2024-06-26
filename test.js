const puppeteer = require("puppeteer");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
let latestScreenshot = null;

async function setupPuppeteer() {
  try {
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 3 });

    await page.goto(
      "https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD",
      {
        waitUntil: "networkidle2",
        timeout: 60000,
      }
    );

    await page.waitForSelector(".chart-gui-wrapper", { timeout: 60000 });

    const captureScreenshot = async () => {
      if (!page.isClosed()) {
        try {
          latestScreenshot = await page.screenshot({ encoding: "base64" });
          io.emit("update", latestScreenshot);
        } catch (error) {
          console.log("Error capturing screenshot:", error);
        }
      }
    };

    // Capture initial screenshot
    await captureScreenshot();

    // Capture screenshot every second
    setInterval(captureScreenshot, 1000);
  } catch (error) {
    console.log("Error setting up Puppeteer:", error);
  }
}

app.get("/", (req, res) => {
  res.render("index");
});

setupPuppeteer().then(() => {
  // Start the server after Puppeteer has finished setup
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  if (latestScreenshot) {
    socket.emit("update", latestScreenshot);
  }
});
