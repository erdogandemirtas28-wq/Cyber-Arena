const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Web sayfasını (index.html) internete sunar
app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    console.log('Yeni oyuncu bağlandı: ' + socket.id);

    // Yeni oyuncu verisi
    players[socket.id] = {
        x: 300, 
        y: 300, 
        id: socket.id, 
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    
    // Mevcut oyuncuları gönder
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Hareket sinyali geldiğinde
    socket.on('playerInput', (input) => {
        if (players[socket.id]) {
            if (input.left) players[socket.id].x -= 5;
            if (input.right) players[socket.id].x += 5;
            if (input.up) players[socket.id].y -= 5;
            if (input.down) players[socket.id].y += 5;
            io.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Render için kritik: PORT ayarı
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("Sunucu " + PORT + " portunda aktif.");
});