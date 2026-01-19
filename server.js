const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    // Yeni oyuncuyu ekranın ortasında başlat
    players[socket.id] = {
        x: 400,
        y: 300,
        id: socket.id,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    
    io.emit('currentPlayers', players);

    socket.on('playerInput', (input) => {
        const player = players[socket.id];
        if (player) {
            const speed = 7; // Hız artırıldı
            if (input.left) player.x -= speed;
            if (input.right) player.x += speed;
            if (input.up) player.y -= speed;
            if (input.down) player.y += speed;
            io.emit('playerMoved', player);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});