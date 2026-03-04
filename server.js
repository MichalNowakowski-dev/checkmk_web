require("dotenv").config();
const http = require("http");
const { Pool } = require("pg");
const { exec } = require("child_process");
const PM2_SERVICE = process.env.PM2_SERVICE || "checkmk_watcher";

const pool = new Pool({
  // uzupełnij dane połączenia
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const HTML = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CheckMK Manager</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --border: #1e1e2e;
    --accent: #e8ff47;
    --accent2: #47ffe8;
    --accent3: #ff47e8;
    --text: #d4d4e8;
    --muted: #5a5a7a;
    --danger: #ff4757;
    --success: #47ff8a;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    min-height: 100vh;
    padding: 40px 32px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 24px;
  }

  header h1 {
    font-family: 'Syne', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -0.04em;
  }

  header span { color: var(--muted); font-size: 0.75rem; }

  /* TABS */
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    padding: 10px 24px;
    font-family: 'Syne', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.15s;
  }

  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab.active-rules { color: var(--accent3); border-bottom-color: var(--accent3); }

  .pane { display: none; }
  .pane.active { display: block; }

  /* TABLE */
  .table-wrap { overflow-x: auto; margin-bottom: 48px; }

  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }

  thead tr { border-bottom: 1px solid var(--accent); }
  thead.rules-head tr { border-bottom-color: var(--accent3); }

  th {
    text-align: left;
    padding: 10px 16px;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
  }

  .rules-head th { color: var(--accent3); }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.15s;
    cursor: pointer;
  }

  tbody tr:hover { background: #16161f; }
  tbody tr.selected { background: #1a1a28; outline: 1px solid var(--accent2); }

  td { padding: 12px 16px; color: var(--text); }
  td.empty { color: var(--muted); font-style: italic; }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 2px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  .badge-host { background: #e8ff4720; color: var(--accent); }
  .badge-service { background: #47ffe820; color: var(--accent2); }
  .badge-both { background: #ff47e820; color: #ff47e8; }
  .badge-yes { background: #47ff8a20; color: var(--success); }
  .badge-no { background: #ffffff10; color: var(--muted); }

  .btn-del {
    background: none;
    border: 1px solid var(--danger);
    color: var(--danger);
    padding: 4px 10px;
    border-radius: 2px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.72rem;
    transition: all 0.15s;
  }
  .btn-del:hover { background: var(--danger); color: #fff; }

  /* FORM */
  .form-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 32px;
    max-width: 640px;
  }

  .form-title {
    font-family: 'Syne', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent2);
    margin-bottom: 24px;
    letter-spacing: 0.02em;
  }

  .form-title.rules { color: var(--accent3); }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field.full { grid-column: 1 / -1; }

  label {
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  input[type="text"], input[type="number"] {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    border-radius: 2px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
  }

  input:focus { border-color: var(--accent2); }
  input::placeholder { color: var(--muted); }

  .checkbox-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent3);
    cursor: pointer;
  }

  .actions { display: flex; gap: 12px; align-items: center; }

  .btn {
    padding: 10px 24px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 0.82rem;
    border-radius: 2px;
    cursor: pointer;
    border: none;
    letter-spacing: 0.04em;
    transition: all 0.15s;
  }

  .btn-primary { background: var(--accent); color: #0a0a0f; }
  .btn-primary:hover { background: #fff; }
  .btn-primary-rules { background: var(--accent3); color: #0a0a0f; }
  .btn-primary-rules:hover { background: #fff; }

  .btn-secondary {
    background: none;
    border: 1px solid var(--muted);
    color: var(--muted);
  }
  .btn-secondary:hover { border-color: var(--text); color: var(--text); }

  .status-msg {
    font-size: 0.75rem;
    padding: 4px 0;
    min-height: 20px;
  }
  .ok { color: var(--success); }
  .err { color: var(--danger); }

  /* LOGS */
  .log-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 24px;
  }

  .log-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .log-toolbar .form-title { margin-bottom: 0; }

  .log-auto {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--muted);
  }

  #log-box {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 16px;
    font-size: 0.75rem;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 600px;
    overflow-y: auto;
    color: #a0a0c0;
  }

  #log-box .log-err { color: var(--danger); }
  #log-box .log-ok { color: var(--success); }
  #log-box .log-warn { color: var(--accent); }
</style>
</head>
<body>

<header>
  <h1>checkmk</h1>
  <span>manager</span>
</header>

<div class="tabs">
  <button class="tab active" onclick="switchTab('exceptions', this)">Wyjątki</button>
  <button class="tab" onclick="switchTab('rules', this)">Reguły alertów</button>
  <button class="tab" onclick="switchTab('logs', this)">Logi</button>
</div>

<!-- ==================== TAB: EXCEPTIONS ==================== -->
<div class="pane active" id="pane-exceptions">
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Host</th><th>Service</th><th>Notes</th><th>Typ</th><th></th>
        </tr>
      </thead>
      <tbody id="exc-tbody">
        <tr><td colspan="7" class="empty">Ładowanie...</td></tr>
      </tbody>
    </table>
  </div>

  <div class="form-section">
    <div class="form-title" id="exc-form-title">+ Nowy wyjątek</div>
    <input type="hidden" id="exc-edit-id">
    <div class="fields">
      <div class="field">
        <label>Host</label>
        <input type="text" id="exc-host" placeholder="np. dev, test" />
      </div>
      <div class="field">
        <label>Service</label>
        <input type="text" id="exc-service" placeholder="np. filesystem" />
      </div>
      <div class="field full">
        <label>Notes</label>
        <input type="text" id="exc-notes" placeholder="opcjonalnie" />
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" onclick="excSave()">Zapisz</button>
      <button class="btn btn-secondary" onclick="excReset()">Anuluj</button>
      <span class="status-msg" id="exc-status"></span>
    </div>
  </div>
</div>

<!-- ==================== TAB: ALERT RULES ==================== -->
<div class="pane" id="pane-rules">
  <div class="table-wrap">
    <table>
      <thead class="rules-head">
        <tr>
          <th>ID</th><th>Service pattern</th><th>Min downtime</th><th>Max downtime</th><th>Send info</th><th>Message</th><th></th>
        </tr>
      </thead>
      <tbody id="rules-tbody">
        <tr><td colspan="7" class="empty">Ładowanie...</td></tr>
      </tbody>
    </table>
  </div>

  <div class="form-section">
    <div class="form-title rules" id="rules-form-title">+ Nowa reguła</div>
    <input type="hidden" id="rules-edit-id">
    <div class="fields">
      <div class="field full">
        <label>Service pattern</label>
        <input type="text" id="r-pattern" placeholder="np. Filesystem, Memory" />
      </div>
      <div class="field">
        <label>Min downtime (min)</label>
        <input type="number" id="r-min" placeholder="np. 5" min="0" />
      </div>
      <div class="field">
        <label>Max downtime (min, 0 = brak)</label>
        <input type="number" id="r-max" placeholder="0 = brak limitu" min="0" />
      </div>
      <div class="field">
        <label>Send info</label>
        <div class="checkbox-wrap">
          <input type="checkbox" id="r-send-info" />
          <span style="font-size:0.8rem; color:var(--muted)">Dodaj info do alertu</span>
        </div>
      </div>
      <div class="field full">
        <label>info</label>
        <input type="text" id="r-info" placeholder="opcjonalnie" />
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary-rules" onclick="rulesSave()">Zapisz</button>
      <button class="btn btn-secondary" onclick="rulesReset()">Anuluj</button>
      <span class="status-msg" id="rules-status"></span>
    </div>
  </div>
</div>


<!-- ==================== TAB: LOGS ==================== -->
<div class="pane" id="pane-logs">
  <div class="log-wrap">
    <div class="log-toolbar">
      <div class="form-title" style="color:var(--accent2)">Logi PM2</div>
      <div class="log-auto">
        <input type="checkbox" id="log-auto" checked style="accent-color:var(--accent2)" />
        <label for="log-auto" style="text-transform:none;letter-spacing:0">auto-odświeżaj co 5s</label>
      </div>
      <button class="btn btn-secondary" style="padding:6px 16px;font-size:0.75rem" onclick="logsLoad()">Odśwież</button>
      <select id="log-lines" onchange="logsLoad()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;font-family:inherit;font-size:0.75rem;border-radius:2px;outline:none">
        <option value="50">50 linii</option>
        <option value="100">100 linii</option>
        <option value="200">200 linii</option>
      </select>
    </div>
    <div id="log-box">Ładowanie...</div>
  </div>
</div>

<script>
  // ---- TABS ----
  function switchTab(name, btn) {
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.classList.remove('active-rules'); });
    document.getElementById('pane-' + name).classList.add('active');
    if (name === 'rules') btn.classList.add('active-rules');
    else if (name === 'logs') { btn.classList.add('active-rules'); logsLoad(); }
    else btn.classList.add('active');
  }

  // ---- EXCEPTIONS ----
  let excRows = [];

  async function excLoad() {
    const res = await fetch('/api/exceptions');
    excRows = await res.json();
    excRender();
  }

  function getType(r) {
    if (r.host && r.service) return ['both', 'host + service'];
    if (r.host) return ['host', 'tylko host'];
    if (r.service) return ['service', 'tylko service'];
    return ['', '\u2013'];
  }

  function excRender() {
    const tbody = document.getElementById('exc-tbody');
    if (!excRows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Brak rekord\u00f3w</td></tr>';
      return;
    }
    tbody.innerHTML = excRows.map(r => {
      const [cls, label] = getType(r);
      return '<tr onclick="excEdit(' + r.id + ')" id="exc-row-' + r.id + '">'
        + '<td>' + r.id + '</td>'
        + '<td>' + (r.host || '<span class="empty">\u2014</span>') + '</td>'
        + '<td>' + (r.service || '<span class="empty">\u2014</span>') + '</td>'
        + '<td>' + (r.notes || '<span class="empty">\u2014</span>') + '</td>'
        + '<td><span class="badge badge-' + cls + '">' + label + '</span></td>'
        + '<td><button class="btn-del" onclick="excDel(event,' + r.id + ')">usu\u0144</button></td>'
        + '</tr>';
    }).join('');
  }

  function excEdit(id) {
    document.querySelectorAll('#exc-tbody tr').forEach(r => r.classList.remove('selected'));
    const r = excRows.find(x => x.id === id);
    if (!r) return;
    document.getElementById('exc-row-' + id).classList.add('selected');
    document.getElementById('exc-edit-id').value = id;
    document.getElementById('exc-host').value = r.host || '';
    document.getElementById('exc-service').value = r.service || '';
    document.getElementById('exc-notes').value = r.notes || '';
    document.getElementById('exc-form-title').textContent = '\u270e Edycja wyj\u0105tku #' + id;
  }

  function excReset() {
    document.getElementById('exc-edit-id').value = '';
    document.getElementById('exc-host').value = '';
    document.getElementById('exc-service').value = '';
    document.getElementById('exc-notes').value = '';
    document.getElementById('exc-form-title').textContent = '+ Nowy wyj\u0105tek';
    document.querySelectorAll('#exc-tbody tr').forEach(r => r.classList.remove('selected'));
    setStatus('exc-status', '', '');
  }

  async function excSave() {
    const id = document.getElementById('exc-edit-id').value;
    const body = {
      host: document.getElementById('exc-host').value.trim(),
      service: document.getElementById('exc-service').value.trim(),
      notes: document.getElementById('exc-notes').value.trim(),
    };
    const url = id ? '/api/exceptions/' + id : '/api/exceptions';
    const method = id ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setStatus('exc-status', id ? 'Zaktualizowano \u2713' : 'Dodano \u2713', 'ok');
      excReset();
      excLoad();
    } catch { setStatus('exc-status', 'B\u0142\u0105d zapisu', 'err'); }
  }

  async function excDel(e, id) {
    e.stopPropagation();
    if (!confirm('Usun\u0105\u0107 wyj\u0105tek #' + id + '?')) return;
    await fetch('/api/exceptions/' + id, { method: 'DELETE' });
    excLoad();
  }

  // ---- ALERT RULES ----
  let rulesRows = [];

  async function rulesLoad() {
    const res = await fetch('/api/rules');
    rulesRows = await res.json();
    rulesRender();
  }

  function rulesRender() {
    const tbody = document.getElementById('rules-tbody');
    if (!rulesRows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Brak rekord\u00f3w</td></tr>';
      return;
    }
    tbody.innerHTML = rulesRows.map(r =>
      '<tr onclick="rulesEdit(' + r.id + ')" id="rules-row-' + r.id + '">'
      + '<td>' + r.id + '</td>'
      + '<td>' + r.service_pattern + '</td>'
      + '<td>' + r.min_downtime + ' min</td>'
      + '<td>' + (r.max_downtime ? r.max_downtime + ' min' : '<span class="empty">brak</span>') + '</td>'
      + '<td><span class="badge ' + (r.send_info ? 'badge-yes' : 'badge-no') + '">' + (r.send_info ? 'TAK' : 'NIE') + '</span></td>'
      + '<td>' + (r.info || '<span class="empty">\u2014</span>') + '</td>'
      + '<td><button class="btn-del" onclick="rulesDel(event,' + r.id + ')">usu\u0144</button></td>'
      + '</tr>'
    ).join('');
  }

  function rulesEdit(id) {
    document.querySelectorAll('#rules-tbody tr').forEach(r => r.classList.remove('selected'));
    const r = rulesRows.find(x => x.id === id);
    if (!r) return;
    document.getElementById('rules-row-' + id).classList.add('selected');
    document.getElementById('rules-edit-id').value = id;
    document.getElementById('r-pattern').value = r.service_pattern || '';
    document.getElementById('r-min').value = r.min_downtime != null ? r.min_downtime : 5;
    document.getElementById('r-max').value = r.max_downtime != null ? r.max_downtime : 0;
    document.getElementById('r-send-info').checked = !!r.send_info;
    document.getElementById('r-info').value = r.info || '';
    document.getElementById('rules-form-title').textContent = '\u270e Edycja regu\u0142y #' + id;
  }

  function rulesReset() {
    document.getElementById('rules-edit-id').value = '';
    document.getElementById('r-pattern').value = '';
    document.getElementById('r-min').value = '';
    document.getElementById('r-max').value = '';
    document.getElementById('r-send-info').checked = false;
    document.getElementById('r-info').value = '';
    document.getElementById('rules-form-title').textContent = '+ Nowa regu\u0142a';
    document.querySelectorAll('#rules-tbody tr').forEach(r => r.classList.remove('selected'));
    setStatus('rules-status', '', '');
  }

  async function rulesSave() {
    const id = document.getElementById('rules-edit-id').value;
    const body = {
      service_pattern: document.getElementById('r-pattern').value.trim(),
      min_downtime: parseInt(document.getElementById('r-min').value) || 0,
      max_downtime: parseInt(document.getElementById('r-max').value) || 0,
      send_info: document.getElementById('r-send-info').checked,
      info: document.getElementById('r-info').value.trim(),
    };
    if (!body.service_pattern) return setStatus('rules-status', 'Service pattern wymagany', 'err');
    const url = id ? '/api/rules/' + id : '/api/rules';
    const method = id ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setStatus('rules-status', id ? 'Zaktualizowano \u2713' : 'Dodano \u2713', 'ok');
      rulesReset();
      rulesLoad();
    } catch { setStatus('rules-status', 'B\u0142\u0105d zapisu', 'err'); }
  }

  async function rulesDel(e, id) {
    e.stopPropagation();
    if (!confirm('Usun\u0105\u0107 regu\u0142\u0119 #' + id + '?')) return;
    await fetch('/api/rules/' + id, { method: 'DELETE' });
    rulesLoad();
  }


  // ---- LOGS ----
  let logsInterval = null;

  function logsColorize(text) {
    var lines = text.split("\\n");
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/error|err|fail|exception/i.test(l)) result.push('<span class="log-err">' + escHtml(l) + '</span>');
      else if (/warn|warning/i.test(l)) result.push('<span class="log-warn">' + escHtml(l) + '</span>');
      else if (/success|started|listening/i.test(l)) result.push('<span class="log-ok">' + escHtml(l) + '</span>');
      else result.push(escHtml(l));
    }
    return result.join("\\n");
  }

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function logsLoad() {
    const lines = document.getElementById('log-lines').value;
    try {
      const res = await fetch('/api/logs?lines=' + lines);
      const data = await res.json();
      const box = document.getElementById('log-box');
      box.innerHTML = logsColorize(data.output || '');
      box.scrollTop = box.scrollHeight;
    } catch { document.getElementById('log-box').textContent = 'Błąd pobierania logów'; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('log-auto').addEventListener('change', function() {
      if (this.checked) logsInterval = setInterval(logsLoad, 5000);
      else { clearInterval(logsInterval); logsInterval = null; }
    });
    logsInterval = setInterval(logsLoad, 5000);
  });

  function setStatus(elId, msg, type) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.className = 'status-msg ' + type;
  }

  excLoad();
  rulesLoad();
</script>
</body>
</html>`;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "changeme";

const basicAuth = (req, res) => {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString();
    const [user, pass] = decoded.split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASS) return true;
  }
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="CheckMK Manager"',
    "Content-Type": "text/plain",
  });
  res.end("Unauthorized");
  return false;
};

const send = (res, status, data) => {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const ct =
    typeof data === "string" ? "text/html; charset=utf-8" : "application/json";
  res.writeHead(status, {
    "Content-Type": ct,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
};

const parseBody = (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "OPTIONS") return send(res, 200, "OK");
  if (method === "GET" && url === "/health") return send(res, 200, "OK");

  if (!basicAuth(req, res)) return;

  if (method === "GET" && url === "/") return send(res, 200, HTML);

  // ---- EXCEPTIONS ----
  if (method === "GET" && url === "/api/exceptions") {
    const result = await pool.query("SELECT * FROM exceptions ORDER BY id");
    return send(res, 200, result.rows);
  }

  if (method === "POST" && url === "/api/exceptions") {
    const { host, service, info } = await parseBody(req);
    await pool.query(
      "INSERT INTO exceptions (host, service, info) VALUES ($1,$2,$3)",
      [host || "", service || "", info || ""],
    );
    return send(res, 201, { ok: true });
  }

  const excPut = url.match(/^\/api\/exceptions\/(\d+)$/);
  if (method === "PUT" && excPut) {
    const { host, service, info } = await parseBody(req);
    await pool.query(
      "UPDATE exceptions SET host=$1, service=$2, info=$3 WHERE id=$4",
      [host || "", service || "", info || "", excPut[1]],
    );
    return send(res, 200, { ok: true });
  }

  const excDel = url.match(/^\/api\/exceptions\/(\d+)$/);
  if (method === "DELETE" && excDel) {
    await pool.query("DELETE FROM exceptions WHERE id=$1", [excDel[1]]);
    return send(res, 200, { ok: true });
  }

  // ---- ALERT RULES ----
  if (method === "GET" && url === "/api/rules") {
    const result = await pool.query("SELECT * FROM alert_rules ORDER BY id");
    return send(res, 200, result.rows);
  }

  if (method === "POST" && url === "/api/rules") {
    const { service_pattern, min_downtime, max_downtime, send_info, info } =
      await parseBody(req);
    await pool.query(
      "INSERT INTO alert_rules (service_pattern, min_downtime, max_downtime, send_info, info) VALUES ($1,$2,$3,$4,$5)",
      [
        service_pattern,
        min_downtime || 0,
        max_downtime || 0,
        !!send_info,
        info || "",
      ],
    );
    return send(res, 201, { ok: true });
  }

  const rulesPut = url.match(/^\/api\/rules\/(\d+)$/);
  if (method === "PUT" && rulesPut) {
    const { service_pattern, min_downtime, max_downtime, send_info, info } =
      await parseBody(req);
    await pool.query(
      "UPDATE alert_rules SET service_pattern=$1, min_downtime=$2, max_downtime=$3, send_info=$4, info=$5 WHERE id=$6",
      [
        service_pattern,
        min_downtime || 0,
        max_downtime || 0,
        !!send_info,
        info || "",
        rulesPut[1],
      ],
    );
    return send(res, 200, { ok: true });
  }

  const rulesDel = url.match(/^\/api\/rules\/(\d+)$/);
  if (method === "DELETE" && rulesDel) {
    await pool.query("DELETE FROM alert_rules WHERE id=$1", [rulesDel[1]]);
    return send(res, 200, { ok: true });
  }

  // ---- LOGS ----
  if (method === "GET" && url.startsWith("/api/logs")) {
    const params = new URL("http://x" + url).searchParams;
    const lines = parseInt(params.get("lines")) || 50;
    exec(
      `pm2 logs ${PM2_SERVICE} --lines ${lines} --nostream 2>&1`,
      (err, stdout, stderr) => {
        const output = ((stdout || "") + (stderr || ""))
          .replace(/\x1B\[[0-9;]*m/g, "") // usuń kody ANSI
          .replace(/^\d+\|[^|]*\|\s*/gm, ""); // usuń prefix PM2
        send(res, 200, { output });
      },
    );
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(3000, () => {
  console.log("✓ Serwer nasłuchuje na porcie 3000");
});
