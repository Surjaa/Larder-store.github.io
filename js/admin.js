/* Larder admin dashboard — talks to server.js (/api/admin/...) */
'use strict';
const STATUSES = ['New', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const API = location.protocol === 'file:' ? 'http://localhost:3000' : '';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const when = d => new Date(d).toLocaleString('en-IN', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
let KEY = sessionStorage.getItem('larder.adminKey') || '', orders = [], users = [], seen = new Set(), first = true, timer = null;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
async function call(path, opt = {}) {
  const r = await fetch(API + path, {method: opt.method || 'GET', headers: {'Content-Type': 'application/json', 'x-admin-key': KEY}, body: opt.body ? JSON.stringify(opt.body) : undefined});
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.error || 'Request failed'), {status: r.status}); }
  return opt.raw ? r : r.json();
}
function showLogin(msg = '') { $('#app').hidden = true; $('#login').hidden = false; $('#loginErr').textContent = msg; clearInterval(timer); $('#key').focus(); }
function showApp() { $('#login').hidden = true; $('#app').hidden = false; }

async function load() {
  try {
    const [o, u] = await Promise.all([call('/api/admin/orders'), call('/api/admin/users')]);
    orders = o.orders; users = u.users; $('#live').textContent = 'Live'; $('#live').classList.remove('off');
    showApp(); render();
  } catch (e) {
    if (e.status === 401) { sessionStorage.removeItem('larder.adminKey'); KEY = ''; return showLogin('That admin key is not correct.'); }
    $('#live').textContent = 'Server offline'; $('#live').classList.add('off');
    if (first) showLogin('Cannot reach the server. Run “node server.js” and open http://localhost:3000/admin.html');
  }
}
function stats() {
  const live = orders.filter(o => o.status !== 'Cancelled'), today = new Date().toDateString();
  const cells = [[orders.length, 'Total orders'], [orders.filter(o => o.status === 'New').length, 'New, need packing'], [orders.filter(o => new Date(o.createdAt).toDateString() === today).length, 'Orders today'], [money(live.reduce((t, o) => t + o.total, 0)), 'Revenue (excl. cancelled)']];
  $('#stats').innerHTML = cells.map((c, i) => `<div style="animation-delay:${i * 60}ms"><b>${esc(c[0])}</b><span>${c[1]}</span></div>`).join('');
}
function render() {
  $('#cOrders').textContent = orders.length; $('#cUsers').textContent = users.length; stats();
  const q = $('#search').value.trim().toLowerCase(), sf = $('#statusFilter').value;
  const list = orders.filter(o => (!sf || o.status === sf) && (!q || [o.id, o.customer.name, o.customer.phone, o.customer.email, o.address.line, o.address.city, o.address.pin, o.note, o.items.map(i => i.name).join(' ')].join(' ').toLowerCase().includes(q)));
  $('#empty').hidden = list.length > 0;
  $('#rows').innerHTML = list.map(o => `<tr data-id="${esc(o.id)}" class="${!first && !seen.has(o.id) ? 'fresh' : ''}">
    <td><span class="oid">${esc(o.id)}</span><span class="sub">${when(o.createdAt)}</span></td>
    <td><b>${esc(o.customer.name)}</b>${o.customer.email ? `<span class="sub">${esc(o.customer.email)}</span>` : ''}</td>
    <td><a class="tel" href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a></td>
    <td class="addr">${esc(o.address.line)}<span class="sub">${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pin)}</span></td>
    <td><ul class="items">${o.items.map(i => `<li>${esc(i.name)} <span>${esc(i.size)}${i.type ? ', ' + esc(i.type) : ''} × ${i.qty}</span></li>`).join('')}</ul></td>
    <td class="note ${o.note ? '' : 'none'}">${o.note ? esc(o.note) : '—'}</td>
    <td class="tot">${money(o.total)}<span class="pay">${esc(o.payment.method)}${o.coupon ? ' · ' + esc(o.coupon) : ''}</span></td>
    <td><select class="s-${esc(o.status)}" data-id="${esc(o.id)}" aria-label="Status for ${esc(o.id)}">${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('');
  orders.forEach(o => seen.add(o.id)); first = false;
  $('#uempty').hidden = users.length > 0;
  $('#urows').innerHTML = users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${u.phone ? `<a class="tel" href="tel:${esc(u.phone)}">${esc(u.phone)}</a>` : '—'}</td><td>${when(u.createdAt)}</td><td>${u.orders}</td></tr>`).join('');
}

$('#statusFilter').innerHTML += STATUSES.map(s => `<option>${s}</option>`).join('');
$('#loginForm').addEventListener('submit', e => { e.preventDefault(); KEY = $('#key').value.trim(); sessionStorage.setItem('larder.adminKey', KEY); first = true; load().then(() => { if (!$('#app').hidden) { clearInterval(timer); timer = setInterval(load, 12000); } }); });
$('#out').addEventListener('click', () => { sessionStorage.removeItem('larder.adminKey'); KEY = ''; showLogin(); });
$('#search').addEventListener('input', render); $('#statusFilter').addEventListener('change', render);
$$('[data-tab]').forEach(b => b.addEventListener('click', () => { $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); $('#tab-orders').hidden = b.dataset.tab !== 'orders'; $('#tab-users').hidden = b.dataset.tab !== 'users'; }));
$('#rows').addEventListener('change', async e => {
  const s = e.target.closest('select[data-id]'); if (!s) return;
  try { await call('/api/admin/orders/' + s.dataset.id, {method: 'PATCH', body: {status: s.value}}); const o = orders.find(x => x.id === s.dataset.id); if (o) o.status = s.value; s.className = 's-' + s.value; stats(); toast(`${s.dataset.id} marked ${s.value}`); }
  catch (err) { toast(err.message); load(); }
});
$('#csv').addEventListener('click', async () => {
  try { const r = await call('/api/admin/export.csv', {raw: true}), b = await r.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'larder-orders.csv'; a.click(); URL.revokeObjectURL(a.href); }
  catch (err) { toast(err.message); }
});
if (KEY) { load().then(() => { if (!$('#app').hidden) timer = setInterval(load, 12000); }); } else showLogin();
