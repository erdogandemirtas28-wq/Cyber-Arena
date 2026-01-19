const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
app.use(express.static(__dirname));

let players = {};
let foods = [];
let bullets = [];
const MAP_SIZE = 3000;

function createFood(id) {
    const types = ['normal', 'gold', 'poison'];
    return { id, x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE, type: types[Math.floor(Math.random() * types.length)] };
}
for (let i = 0; i < 200; i++) foods.push(createFood(i));

io.on('connection', (socket) => {
    players[socket.id] = { x: 0, y: 0, radius: 0, color: `hsl(${Math.random() * 360}, 80%, 50%)`, score: 0, isAlive: false, name: "" };

    socket.on('joinGame', (name) => {
        players[socket.id] = {
            ...players[socket.id],
            name: name || "Player",
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            radius: 20,
            score: 50,
            isAlive: true
        };
    });

    socket.on('move', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive) {
            p.x = data.x; p.y = data.y; p.angle = data.angle;
            p.isShielded = data.isShielded; p.isDashing = data.isDashing;
            if (p.isDashing && p.score > 5) p.score -= 0.1;
            if (p.isShielded && p.score > 5) p.score -= 0.15;
            p.radius = 20 + (p.score / 15);
        }
    });

    socket.on('fire', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive && p.score >= 10 && !p.isShielded) {
            p.score -= 10;
            bullets.push({ owner: socket.id, x: p.x, y: p.y, angle: data.angle, speed: 15, life: 60 });
        }
    });
    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    bullets.forEach((b, i) => {
        b.x += Math.cos(b.angle) * b.speed;
        b.y += Math.sin(b.angle) * b.speed;
        b.life--;
        if (b.life <= 0) bullets.splice(i, 1);
    });
    io.emit('updateState', { players, foods, bullets });
}, 30); // 33 FPS sunucu güncelleme hızı

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running..."));