const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
app.use(express.static(__dirname));

let players = {};
let foods = [];
let bullets = [];
const MAP_SIZE = 3000;

function createFood(id) {
    const types = ['normal', 'gold', 'poison'];
    return { id, x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE, type: types[Math.floor(Math.random() * types.length)] };
}
for (let i = 0; i < 300; i++) foods.push(createFood(i));

io.on('connection', (socket) => {
    players[socket.id] = { x: 0, y: 0, radius: 0, isAlive: false };

    socket.on('joinGame', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || "Ejder",
            color: data.color || "#0ff",
            accessory: data.accessory || "none",
            skin: data.skin || "dragon1",
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            radius: 25,
            score: 50,
            angle: 0,
            isAlive: true
        };
    });

    socket.on('move', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive) {
            p.x = data.x; p.y = data.y; p.angle = data.angle;
            p.radius = 25 + (p.score / 20);

            // Çarpışma ve Enerji Çekme Mantığı
            for (let id in players) {
                let other = players[id];
                if (id !== socket.id && other.isAlive) {
                    let dist = Math.hypot(p.x - other.x, p.y - other.y);
                    
                    // Eğer kafa kafaya değiyorsa (Büyük olan küçüğü yer)
                    if (dist < p.radius + other.radius) {
                        if (p.score > other.score + 10) {
                            // Büyük Ejderha, Küçük Ejderhayı öldürür ve enerjisini alır
                            p.score += other.score;
                            other.isAlive = false;
                            other.score = 0;
                            io.to(id).emit('playerDied'); // Rakibe öldün mesajı gönder
                        }
                    }
                }
            }

            // Yemek toplama
            foods.forEach((f, fi) => {
                if (Math.hypot(p.x - f.x, p.y - f.y) < p.radius + 10) {
                    p.score += (f.type === 'gold' ? 30 : 5);
                    foods[fi] = createFood(fi);
                }
            });
        }
    });

    socket.on('fire', (data) => {
        let p = players[socket.id];
        if (p && p.isAlive && p.score >= 15) {
            p.score -= 10;
            bullets.push({ owner: socket.id, x: p.x, y: p.y, angle: data.angle, speed: 20, life: 50, color: p.color });
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
                p.score = Math.max(0, p.score - 20); // Mermi çarpanın enerjisi düşer
                bullets.splice(i, 1);
            }
        }
    });
    io.emit('updateState', { players, foods, bullets });
}, 20);

http.listen(process.env.PORT || 3000);