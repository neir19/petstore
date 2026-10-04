// Servidor Mock HTTP ligero en Node.js (sin dependencias externas)
// Simula el endpoint POST /auth/login de FakestoreAPI para pruebas locales y reproducibilidad controlada.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Cargar usuarios válidos desde data/users.csv
const usersFile = path.join(__dirname, 'data', 'users.csv');
const validUsers = new Map();

try {
  const content = fs.readFileSync(usersFile, 'utf8');
  const lines = content.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const [user, passwd] = lines[i].split(',').map((s) => s.trim());
    if (user && passwd) {
      validUsers.set(user, passwd);
    }
  }
  console.log(`[Mock Server] Cargados ${validUsers.size} usuarios desde data/users.csv`);
} catch (err) {
  console.error('[Mock Server] Error al leer data/users.csv:', err.message);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/auth/login') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      // Simular latencia realista de procesamiento (~80ms - 150ms)
      const simulatedLatency = Math.floor(Math.random() * 70) + 80;

      setTimeout(() => {
        try {
          const { username, password } = JSON.parse(body || '{}');

          if (validUsers.has(username) && validUsers.get(username) === password) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                token: 'mock-jwt-token-' + Buffer.from(username).toString('base64') + '.' + Date.now(),
              })
            );
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'error',
                message: 'Invalid username or password',
              })
            );
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Malformed JSON payload' }));
        }
      }, simulatedLatency);
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Mock Server] Escuchando en http://localhost:${PORT}/auth/login`);
});
