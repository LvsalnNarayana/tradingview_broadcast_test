const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const robot = require('robotjs');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
app.use(cors())
const io = socketIO(server, {
    cors: {
        origin: "http://127.0.0.1:5501", // Allow only this origin to connect
        methods: ["GET", "POST"], // Allowed request methods
        credentials: true, // This allows session cookie to be sent, adjust according to your needs
    },
});

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('Client connected');

    // Function to continuously capture screen and emit to clients
    const broadcastScreen = () => {
        const screenSize = robot.getScreenSize();
        const bmp = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
        const buffer = bmp.image;

        // Emit screen data to clients
        socket.emit('screenData', { buffer });

        // Repeat every 100ms (adjust for desired frame rate)
        setTimeout(broadcastScreen, 100);
    };

    broadcastScreen();

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
