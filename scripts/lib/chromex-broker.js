/**
 * ChromeX broker (Method 2) — server HTTP local care implementeaza EXACT contractul
 * pe care extensia "Browser Tool" (D:\Tools\chromex-extension) il cere deja, fara nicio
 * modificare la extensie.
 *
 * Extensia (service worker) face polling:
 *   - GET  http://127.0.0.1:5000/api/ext/command/<profileId>  la fiecare 100ms
 *       → raspundem cu obiectul comanda ({command:'navigate', url:...}) sau {} cand nu e nimic.
 *   - POST http://127.0.0.1:5000/api/ext/result/<profileId>
 *       → primim rezultatul comenzii curente (JSON) si rezolvam promisiunea crawlerului.
 *
 * Un singur command in-flight per profileId (extensia are `isExecutingCommand`), deci
 * coada are un singur slot activ per profil.
 *
 * host_permissions din manifest restrictioneaza extensia la :5000 → brokerul TREBUIE pe 5000.
 * Fara auth: loopback-only. Fara dependinte externe: doar `http` nativ din Node.
 */

const http = require('http');

const DEFAULT_PORT = 5000;
const HOST = '127.0.0.1';

function createProfileState() {
  return {
    queue: [],        // { command, resolve, reject, timer } inca netrimise
    inFlight: null,   // comanda trimisa extensiei, asteptand result
    lastPoll: 0,      // timestamp ultimul GET (dovada ca extensia face poll pe profilul asta)
    polled: false,    // a facut extensia macar un poll pe acest profileId?
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

function pickerInitHtml(profileId) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>ChromeX picker-init</title></head>
<body style="font-family:system-ui;padding:2rem;color:#222">
<h2>ChromeX broker activ</h2>
<p>Profil: <b>${profileId || '(niciunul)'}</b></p>
<p>Aceasta pagina exista doar pentru ca extensia "Browser Tool" sa preia <code>profileId</code> din URL
(<code>/picker-init?id=...</code>). Lasa tab-ul deschis. Crawlerul comanda browserul prin extensie.</p>
</body></html>`;
}

/**
 * Porneste brokerul HTTP. Rezolva cu un obiect de control:
 *   enqueue(profileId, command) -> Promise<result>
 *   waitForProfile(profileId, timeoutMs) -> Promise (se rezolva cand extensia incepe sa faca poll)
 *   isPolling(profileId) -> bool
 *   stop() -> Promise
 */
function startBroker(opts = {}) {
  const port = opts.port || DEFAULT_PORT;
  const commandTimeoutMs = opts.commandTimeoutMs || 60000;
  const verbose = opts.verbose !== false;
  const profiles = new Map(); // profileId -> state

  function log(...a) { if (verbose) console.log('[broker]', ...a); }

  function getState(profileId) {
    let s = profiles.get(profileId);
    if (!s) { s = createProfileState(); profiles.set(profileId, s); }
    return s;
  }

  // Preia urmatoarea comanda din coada daca nu e nimic in-flight.
  function dispatchNext(profileId) {
    const s = getState(profileId);
    if (s.inFlight || s.queue.length === 0) return null;
    const item = s.queue.shift();
    s.inFlight = item;
    return item.command;
  }

  function resolveInFlight(profileId, result, isError) {
    const s = getState(profileId);
    const item = s.inFlight;
    if (!item) return;
    s.inFlight = null;
    if (item.timer) clearTimeout(item.timer);
    if (isError) item.reject(new Error(result));
    else item.resolve(result);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${port}`);
    const path = url.pathname;

    // ── GET /api/ext/command/<profileId> ──────────────────────────
    let m = path.match(/^\/api\/ext\/command\/(.+)$/);
    if (req.method === 'GET' && m) {
      const profileId = decodeURIComponent(m[1]);
      const s = getState(profileId);
      s.lastPoll = Date.now();
      if (!s.polled) { s.polled = true; log(`extensia a inceput poll pe profil "${profileId}"`); }
      const cmd = dispatchNext(profileId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cmd || {}));
      if (cmd) log(`→ ${profileId}: ${cmd.command}`);
      return;
    }

    // ── POST /api/ext/result/<profileId> ──────────────────────────
    m = path.match(/^\/api\/ext\/result\/(.+)$/);
    if (req.method === 'POST' && m) {
      const profileId = decodeURIComponent(m[1]);
      const raw = await readBody(req);
      let result;
      try { result = JSON.parse(raw); } catch { result = { status: 'error', error: 'invalid JSON result' }; }
      log(`← ${profileId}: ${result && result.status}`);
      resolveInFlight(profileId, result, false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }

    // ── GET /picker-init?id=<profileId> ───────────────────────────
    if (req.method === 'GET' && path === '/picker-init') {
      const id = url.searchParams.get('id') || '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(pickerInitHtml(id));
      return;
    }

    // ── POST /api/picker/select ── (relay picker; nefolosit de noi) ─
    if (req.method === 'POST' && path === '/api/picker/select') {
      await readBody(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"error":"not found"}');
  });

  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `Portul ${port} e deja ocupat. Method 2 are nevoie exact de portul ${port} ` +
          `(constrangere host_permissions din extensie). Opreste procesul care il foloseste si reia.`
        ));
      } else {
        reject(err);
      }
    });

    server.listen(port, HOST, () => {
      log(`asculta pe http://${HOST}:${port}`);

      const control = {
        port,
        server,

        enqueue(profileId, command) {
          if (!command || !command.command) {
            return Promise.reject(new Error('enqueue: comanda trebuie sa aiba camp .command'));
          }
          return new Promise((res2, rej2) => {
            const s = getState(profileId);
            const item = { command, resolve: res2, reject: rej2, timer: null };
            item.timer = setTimeout(() => {
              // timeout: scoate din coada sau din in-flight
              if (s.inFlight === item) s.inFlight = null;
              else {
                const idx = s.queue.indexOf(item);
                if (idx >= 0) s.queue.splice(idx, 1);
              }
              rej2(new Error(`Comanda "${command.command}" a expirat dupa ${commandTimeoutMs}ms (extensia nu a raspuns)`));
            }, commandTimeoutMs);
            s.queue.push(item);
          });
        },

        isPolling(profileId) {
          const s = profiles.get(profileId);
          if (!s) return false;
          // considera "activ" daca a facut poll in ultimele 3s
          return s.polled && (Date.now() - s.lastPoll < 3000);
        },

        waitForProfile(profileId, timeoutMs = 30000) {
          const start = Date.now();
          return new Promise((res2, rej2) => {
            const check = () => {
              const s = profiles.get(profileId);
              if (s && s.polled) return res2(true);
              if (Date.now() - start > timeoutMs) {
                return rej2(new Error(
                  `Extensia nu a inceput sa faca poll pe profilul "${profileId}" in ${timeoutMs}ms. ` +
                  `Verifica: extensia "Browser Tool" e activa in Chrome si exista un tab deschis la ` +
                  `http://${HOST}:${port}/picker-init?id=${profileId}`
                ));
              }
              setTimeout(check, 200);
            };
            check();
          });
        },

        stop() {
          return new Promise((res2) => {
            // respinge tot ce e in asteptare
            for (const s of profiles.values()) {
              if (s.inFlight) { if (s.inFlight.timer) clearTimeout(s.inFlight.timer); s.inFlight.reject(new Error('broker oprit')); s.inFlight = null; }
              for (const item of s.queue) { if (item.timer) clearTimeout(item.timer); item.reject(new Error('broker oprit')); }
              s.queue = [];
            }
            server.close(() => res2());
          });
        },
      };

      resolve(control);
    });
  });
}

module.exports = { startBroker, DEFAULT_PORT };
