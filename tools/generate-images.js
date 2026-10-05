/* =========================================================
   Generates every image in /images as a real SVG file.
   Run:  node tools/generate-images.js
   Want your own photos instead? Drop files into images/products/
   named  <product-id>-front.jpg  (etc.) and change IMG_EXT in js/app.js.
   ========================================================= */
const fs = require('fs'), path = require('path');
const {PRODUCTS} = require('../js/data.js');
const OUT = path.join(__dirname, '..', 'images');
fs.mkdirSync(path.join(OUT, 'products'), {recursive: true});

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const shade = (hex, a) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (a < 0 ? v * a : (255 - v) * a)))); return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join(''); };
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h; };
const rnd = seed => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const FONT = "font-family=\"'Bricolage Grotesque','Segoe UI',Arial,sans-serif\"";

function art(p, view = 'front', bare = false) {
  const id = 'k' + hash(p.id + view), R = rnd(hash(p.id + view)), dk = shade(p.pouch, -.28), lt = shade(p.pouch, .4), [l1, l2 = ''] = p.lab.split('|');
  const dots = (x0, x1, y0, y1, n, r, col, st = '') => { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${(x0 + R() * (x1 - x0)).toFixed(1)}" cy="${(y0 + R() * (y1 - y0)).toFixed(1)}" r="${(r * (.7 + R() * .6)).toFixed(1)}" fill="${col}" ${st}/>`; return s; };
  let crimp = ''; for (let x = 88; x <= 212; x += 8) crimp += `M${x} 59v20`;
  const n = Math.min(80, Math.round(380 / p.dot));
  const bg = bare || view === 'detail' ? '' : `<rect width="300" height="300" fill="${p.tint}"/><circle cx="150" cy="150" r="120" fill="#fff" opacity=".5"/>`;
  const shadow = '<ellipse cx="150" cy="268" rx="80" ry="9" fill="#000" opacity=".13"/>';
  const body = `<path d="M80 66q0-10 10-10h120q10 0 10 10v186q0 12-12 12H92q-12 0-12-12z" fill="${p.pouch}"/><path d="M80 66q0-10 10-10h120q10 0 10 10v16H80z" fill="${dk}"/><path d="${crimp}" stroke="${p.pouch}" stroke-opacity=".55" stroke-width="2"/><path d="M92 92v158" stroke="#fff" stroke-opacity=".18" stroke-width="8" stroke-linecap="round"/>`;
  const veg = '<rect x="187" y="102" width="11" height="11" fill="none" stroke="#0a8a3a" stroke-width="1.6"/><circle cx="192.5" cy="107.5" r="3" fill="#0a8a3a"/>';
  const label = `<rect x="95" y="94" width="110" height="90" rx="10" fill="#fff" fill-opacity=".96"/>${veg}<text x="150" y="122" text-anchor="middle" font-size="9.5" font-weight="600" fill="${p.pouch}">${esc(p.brand)}</text><text x="150" y="145" text-anchor="middle" font-size="${l1.length > 9 ? 14 : 18}" font-weight="800" fill="#17261E">${esc(l1)}</text><text x="150" y="164" text-anchor="middle" font-size="12" font-weight="600" fill="#5E6F65">${esc(l2)}</text>`;
  const win = `<clipPath id="${id}"><rect x="95" y="194" width="110" height="60" rx="8"/></clipPath><g clip-path="url(#${id})"><rect x="95" y="194" width="110" height="60" fill="${shade(p.fill, -.12)}"/>${dots(95, 205, 194, 254, n, p.dot, p.fill)}</g><rect x="95" y="194" width="110" height="60" rx="8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`;
  let g = '';
  if (view === 'front') g = shadow + body + label + win;
  else if (view === 'back') {
    let rows = ''; ['Energy', 'Protein', 'Carbs', 'Fat', 'Fibre'].forEach((t, i) => { rows += `<text x="104" y="${134 + i * 15}" font-size="8.5" fill="#5E6F65">${t}</text>` + (i === 1 ? `<text x="196" y="${134 + i * 15}" text-anchor="end" font-size="9" font-weight="800" fill="${p.pouch}">${p.protein} g</text>` : `<rect x="${(160 + R() * 10).toFixed(1)}" y="${128 + i * 15}" width="${(20 + R() * 28).toFixed(1)}" height="5" rx="2.5" fill="#C9D3CB"/>`); });
    let bars = ''; for (let x = 104; x < 196; x += 3 + R() * 3) bars += `<rect x="${x.toFixed(1)}" y="214" width="${(1 + R() * 2).toFixed(1)}" height="28" fill="#17261E"/>`;
    g = shadow + body + `<rect x="95" y="94" width="110" height="160" rx="10" fill="#fff" fill-opacity=".96"/><text x="104" y="113" font-size="10" font-weight="800" fill="#17261E">Per 100 g</text><path d="M104 119h92" stroke="#17261E" stroke-width="1.5"/>${rows}${bars}`;
  } else if (view === 'detail') {
    g = `<rect width="300" height="300" fill="${shade(p.fill, -.18)}"/>` + dots(-10, 310, -10, 310, 46, p.dot * 4.4, p.fill, `stroke="${shade(p.fill, -.3)}" stroke-width="2"`) + dots(-10, 310, -10, 310, 22, p.dot * 2.2, shade(p.fill, .35));
  } else {
    let bd = ''; for (let i = 0; i < n; i++) { const a = R() * 6.283, d = Math.sqrt(R()); bd += `<circle cx="${(150 + Math.cos(a) * d * 90).toFixed(1)}" cy="${(190 + Math.sin(a) * d * 17).toFixed(1)}" r="${(p.dot * (.7 + R() * .6)).toFixed(1)}" fill="${p.fill}"/>`; }
    g = `<g transform="translate(22 -30) scale(.86)">${shadow}${body}${label}</g><path d="M44 196h212c0 52-42 82-106 82S44 248 44 196z" fill="${lt}"/><ellipse cx="150" cy="196" rx="106" ry="26" fill="${shade(lt, -.12)}"/><ellipse cx="150" cy="193" rx="94" ry="20" fill="${shade(p.fill, -.14)}"/>${bd}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="600" height="600" ${FONT}>${bg}${g}</svg>\n`;
}

let count = 0;
for (const p of PRODUCTS) {
  for (const v of ['front', 'back', 'detail', 'life']) { fs.writeFileSync(path.join(OUT, 'products', `${p.id}-${v}.svg`), art(p, v)); count++; }
  fs.writeFileSync(path.join(OUT, 'products', `${p.id}-front-bare.svg`), art(p, 'front', true)); count++;
}
/* logo + favicon */
const mark = '<path d="M16 3a13 13 0 1 0 13 13A2 2 0 0 0 27 14h-3a8 8 0 1 1-8-8 2 2 0 0 0 0-3z" fill="#F4A91F"/>';
fs.writeFileSync(path.join(OUT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0E5A3C"/><path d="M9 22c0-8 5-12 14-12 0 8-4 13-12 13z" fill="#F4A91F"/><path d="M9 22l7-7" stroke="#0E5A3C" stroke-width="1.8" stroke-linecap="round"/></svg>\n`);
fs.writeFileSync(path.join(OUT, 'logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" width="150" height="40"><rect x="2" y="8" width="24" height="24" rx="12" ry="12" fill="#F4A91F" transform="rotate(-12 14 20)"/><text x="34" y="30" font-size="28" font-weight="800" fill="#0E5A3C" font-family="'Bricolage Grotesque','Segoe UI',Arial,sans-serif">Larder</text></svg>\n`);
fs.writeFileSync(path.join(OUT, 'og-cover.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#F2F5EF"/><ellipse cx="900" cy="320" rx="260" ry="230" fill="#F4A91F"/><text x="80" y="260" font-size="84" font-weight="800" fill="#17261E" font-family="Segoe UI,Arial,sans-serif">Stock the kitchen once.</text><text x="80" y="360" font-size="84" font-weight="800" fill="#0E5A3C" font-family="Segoe UI,Arial,sans-serif">Eat well all month.</text></svg>\n`);
console.log(`Wrote ${count} product images + logo, favicon and cover to /images`);
