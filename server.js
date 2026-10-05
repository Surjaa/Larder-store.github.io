/* =========================================================
   LARDER — tiny backend. No npm install needed (Node 18+).
   Run:  node server.js        then open http://localhost:3000
   - serves the storefront (index.html) and admin page (admin.html)
   - stores users + orders in data/db.json
   - re-checks prices on the server before saving an order
   ========================================================= */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const D = require('./js/data.js');

const PORT = +process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';   // CHANGE THIS before sharing the site: ADMIN_KEY=mysecret node server.js
const ROOT = __dirname, DB_FILE = path.join(ROOT, 'data', 'db.json');
const MIME = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'};
const PUBLIC = ['index.html', 'admin.html', 'css', 'js', 'images'];   // only these are served; data/ and server.js stay private

/* ---------- tiny JSON file database ---------- */
let db = {users: [], orders: [], sessions: {}};
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { fs.mkdirSync(path.dirname(DB_FILE), {recursive: true}); }
function saveDb() {                         // write to a temp file, then rename → never leaves a half-written db
  const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, DB_FILE);
}

/* ---------- helpers ---------- */
const clean = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const cleanNote = (s, max = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const send = (res, code, body, headers = {}) => {
  res.writeHead(code, Object.assign({'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, x-admin-key', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'}, headers));
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const readBody = req => new Promise((ok, no) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 100000) { no(Object.assign(new Error('Request too large'), {code: 413})); req.destroy(); } });
  req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(Object.assign(new Error('Invalid JSON'), {code: 400})); } });
});
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex')});
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const publicUser = u => ({id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt});
const authUser = req => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, ''), s = db.sessions[t];
  if (!s || s.exp < Date.now()) return null; return db.users.find(u => u.id === s.uid) || null;
};
const isAdmin = (req, url) => safeEq(req.headers['x-admin-key'] || url.searchParams.get('key') || '', ADMIN_KEY);
const hits = new Map();                      // very small rate limiter: 30 write requests / minute / IP
const limited = req => { const ip = req.socket.remoteAddress, now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > 30; };
const fail = (code, msg) => Object.assign(new Error(msg), {code});

/* ---------- API ---------- */
async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'POST' && limited(req)) throw fail(429, 'Too many requests. Please wait a minute.');

  if (route === 'GET /api/health') return send(res, 200, {ok: true, orders: db.orders.length});

  if (route === 'POST /api/register') {
    const b = await readBody(req), name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 10), pw = String(b.password || '');
    if (name.length < 2) throw fail(400, 'Enter your name');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'Enter a valid email');
    if (phone && !/^[6-9]\d{9}$/.test(phone)) throw fail(400, 'Enter a 10-digit mobile number');
    if (pw.length < 6) throw fail(400, 'Password must be at least 6 characters');
    if (db.users.some(u => u.email === email)) throw fail(409, 'An account with this email already exists');
    const u = {id: 'U' + crypto.randomBytes(4).toString('hex'), name, email, phone, pw: hashPw(pw), createdAt: new Date().toISOString()};
    db.users.push(u); const token = crypto.randomBytes(32).toString('hex'); db.sessions[token] = {uid: u.id, exp: Date.now() + 30 * 864e5}; saveDb();
    return send(res, 201, {token, user: publicUser(u)});
  }
  if (route === 'POST /api/login') {
    const b = await readBody(req), email = clean(b.email, 120).toLowerCase(), u = db.users.find(x => x.email === email);
    if (!u || !safeEq(hashPw(String(b.password || ''), u.pw.salt).hash, u.pw.hash)) throw fail(401, 'Email or password is incorrect');
    const token = crypto.randomBytes(32).toString('hex'); db.sessions[token] = {uid: u.id, exp: Date.now() + 30 * 864e5}; saveDb();
    return send(res, 200, {token, user: publicUser(u)});
  }
  if (route === 'POST /api/logout') { delete db.sessions[(req.headers.authorization || '').replace(/^Bearer /, '')]; saveDb(); return send(res, 200, {ok: true}); }
  if (route === 'GET /api/me') { const u = authUser(req); if (!u) throw fail(401, 'Please sign in'); return send(res, 200, {user: publicUser(u)}); }

  if (route === 'POST /api/orders') {
    const b = await readBody(req), u = authUser(req), c = b.customer || {}, a = b.address || {};
    const name = clean(c.name, 80), phone = clean(c.phone, 10), email = clean(c.email, 120), line = clean(a.line, 200), city = clean(a.city, 60), state = clean(a.state, 60), pin = clean(a.pin, 6);
    if (name.length < 2) throw fail(400, 'Customer name is required');
    if (!/^[6-9]\d{9}$/.test(phone)) throw fail(400, 'A valid 10-digit mobile number is required');
    if (line.length < 5 || city.length < 2 || state.length < 2 || !/^[1-9]\d{5}$/.test(pin)) throw fail(400, 'A complete delivery address is required');
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) throw fail(400, 'Your cart is empty');
    const lines = b.items.map(i => {                    // prices come from OUR catalog, never from the browser
      const p = D.P(String(i.id)); if (!p) throw fail(400, 'Unknown product');
      const size = D.sizesOf(p).find(s => s.l === i.size); if (!size) throw fail(400, 'Invalid pack size');
      const qty = Math.floor(+i.qty); if (!(qty >= 1 && qty <= 10)) throw fail(400, 'Invalid quantity');
      if (p.stock <= 0) throw fail(409, p.name + ' is out of stock');
      const type = p.types.includes(i.type) ? i.type : '';
      return {id: p.id, name: p.name, size: size.l, type, qty, price: D.priceOf(p, size.l), mrp: D.mrpOf(p, size.l)};
    });
    const shipOpt = b.shipOpt === 'exp' ? 'exp' : 'std', coupon = D.COUPONS[b.coupon] ? b.coupon : null, t = D.calcTotals(lines, coupon, shipOpt);
    let id; do { id = 'LR-' + Math.floor(100000 + Math.random() * 900000); } while (db.orders.some(o => o.id === id));
    const pm = ['upi', 'card', 'cod'].includes(b.pay?.m) ? b.pay.m : 'cod';
    const order = {id, createdAt: new Date().toISOString(), status: 'New', userId: u ? u.id : null,
      customer: {name, phone, email}, address: {line, city, state, pin}, note: cleanNote(b.note),
      items: lines, shipOpt, coupon: t.applied, subtotal: t.sub, discount: t.disc, shipping: t.ship, total: t.total,
      payment: {method: pm, info: pm === 'upi' ? clean(b.pay.info, 60) : pm === 'card' ? clean(b.pay.info, 12) : 'Cash on delivery'}};
    db.orders.unshift(order); saveDb();
    console.log(`[order] ${id} · ${name} · ${phone} · ₹${t.total}`);
    return send(res, 201, {order});
  }
  if (route === 'GET /api/my-orders') { const u = authUser(req); if (!u) throw fail(401, 'Please sign in'); return send(res, 200, {orders: db.orders.filter(o => o.userId === u.id)}); }

  /* ----- admin (needs the admin key) ----- */
  if (url.pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req, url)) throw fail(401, 'Wrong admin key');
    if (route === 'GET /api/admin/orders') return send(res, 200, {orders: db.orders});
    if (route === 'GET /api/admin/users') return send(res, 200, {users: db.users.map(u => ({...publicUser(u), orders: db.orders.filter(o => o.userId === u.id).length}))});
    const m = url.pathname.match(/^\/api\/admin\/orders\/(LR-\d+)$/);
    if (m && req.method === 'PATCH') {
      const o = db.orders.find(x => x.id === m[1]), b = await readBody(req); if (!o) throw fail(404, 'Order not found');
      if (!D.ORDER_STATUSES.includes(b.status)) throw fail(400, 'Invalid status'); o.status = b.status; o.updatedAt = new Date().toISOString(); saveDb(); return send(res, 200, {order: o});
    }
    if (route === 'GET /api/admin/export.csv') {
      const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const rows = [['Order ID', 'Date', 'Status', 'Name', 'Phone', 'Email', 'Address', 'City', 'State', 'PIN', 'Items', 'Note', 'Total', 'Payment']];
      db.orders.forEach(o => rows.push([o.id, o.createdAt, o.status, o.customer.name, o.customer.phone, o.customer.email, o.address.line, o.address.city, o.address.state, o.address.pin, o.items.map(i => `${i.name} (${i.size}${i.type ? ', ' + i.type : ''}) x${i.qty}`).join('; '), o.note, o.total, o.payment.method]));
      return send(res, 200, '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'), {'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="larder-orders.csv"'});
    }
  }
  throw fail(404, 'Not found');
}

/* ---------- static files ---------- */
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  if (rel === 'admin') rel = 'admin.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.includes(rel.split(/[\\/]/)[0])) return send(res, 404, 'Not found', {'Content-Type': 'text/plain'});
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', {'Content-Type': 'text/plain'});
    res.writeHead(200, {'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': rel.startsWith('images') ? 'public, max-age=86400' : 'no-cache', 'X-Content-Type-Options': 'nosniff'});
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url); else serveStatic(req, res, url);
  } catch (e) { send(res, e.code >= 400 && e.code < 600 ? e.code : 500, {error: e.code ? e.message : 'Something went wrong'}); if (!e.code) console.error(e); }
}).listen(PORT, () => {
  console.log(`\n  Larder is running  →  http://localhost:${PORT}`);
  console.log(`  Admin page         →  http://localhost:${PORT}/admin.html   (key: ${ADMIN_KEY === 'admin123' ? 'admin123  ← change with ADMIN_KEY=yoursecret' : '(set by ADMIN_KEY)'})`);
  console.log(`  Data file          →  ${DB_FILE}\n`);
});
