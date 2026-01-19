const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
app.use(express.static(__dirname));

let players = {};
let foods = [];
let bullets = [];
const MAP_SIZE = 3000;

function createFood(id) {
    const types = ['normal', 'normal', 'normal', 'gold', 'poison'];
    const type = types[Math.floor(Math.random() * types.length)];
    return { id, x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE, type };
}
for (let i = 0; i < 250; i++) { foods.push(createFood(i)); }

io.on('connection', (socket) => {
    players[socket.id] = {
        x: -500, y: -500, radius: 0, 
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        score: 0, isShielded: false, isDashing: false, isAlive: false, name: ""
    };

    socket.on('joinGame', (name) => {
        players[socket.id].name = name || "Operatör";
        players[socket.id].x = Math.random() * MAP_SIZE;
        players[socket.id].y = Math.random() * MAP_SIZE;
        players[socket.id].radius = 20;
        players[socket.id].score = 50; 
        players[socket.id].isAlive = true;
    });

    socket.on('move', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive) {
            p.x = data.x; p.y = data.y;
            p.isShielded = data.isShielded;
            p.isDashing = data.isDashing;
            p.angle = data.angle;

            if (p.isDashing && p.score > 1) p.score -= 0.15; 
            if (p.isShielded && p.score > 1) p.score -= 0.2; 
        }
    });

    socket.on('fire', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive && p.score >= 10 && !p.isShielded) {
            p.score -= 10;
            p.radius = Math.max(15, p.radius - 0.2);
            bullets.push({ owner: socket.id, x: p.x, y: p.y, angle: data.angle, speed: 18, life: 60, color: p.color });
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

        for (let id in players) {
            let p = players[id];
            if (id !== b.owner && p.isAlive && Math.hypot(b.x - p.x, b.y - p.y) < p.radius) {
                if (!p.isShielded) {
                    p.score = Math.max(0, p.score - 15);
                    p.radius = Math.max(15, p.radius - 1);
                    if (players[b.owner]) players[b.owner].score += 20;
                }
                bullets.splice(i, 1);
            }
        }
    });

    for (let id in players) {
        let p = players[id];
        if (!p.isAlive) continue;
        foods.forEach((f, fi) => {
            if (Math.hypot(p.x - f.x, p.y - f.y) < p.radius) {
                if (f.type === 'normal') { p.score += 5; p.radius += 0.2; }
                else if (f.type === 'gold') { p.score += 50; p.radius += 1; }
                else if (f.type === 'poison') { p.score = Math.max(0, p.score - 30); p.radius = Math.max(15, p.radius - 2); }
                foods[fi] = createFood(fi);
            }
        });
    }
    io.emit('updateState', { players, foods, bullets });
}, 16);

http.listen(3000);