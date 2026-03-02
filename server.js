require("dotenv").config();
const http = require("http");
const { Pool } = require("pg");

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
<title>Exceptions Manager</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --border: #1e1e2e;
    --accent: #e8ff47;
    --accent2: #47ffe8;
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
    margin-bottom: 48px;
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

  header span {
    color: var(--muted);
    font-size: 0.75rem;
  }

  /* TABLE */
  .table-wrap {
    overflow-x: auto;
    margin-bottom: 48px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  thead tr {
    border-bottom: 1px solid var(--accent);
  }

  th {
    text-align: left;
    padding: 10px 16px;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.15s;
    cursor: pointer;
  }

  tbody tr:hover { background: #16161f; }
  tbody tr.selected { background: #1a1a28; outline: 1px solid var(--accent2); }

  td {
    padding: 12px 16px;
    color: var(--text);
  }

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

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field.full { grid-column: 1 / -1; }

  label {
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  input {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    border-radius: 2px;
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus { border-color: var(--accent2); }
  input::placeholder { color: var(--muted); }

  .actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

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

  .btn-secondary {
    background: none;
    border: 1px solid var(--muted);
    color: var(--muted);
  }
  .btn-secondary:hover { border-color: var(--text); color: var(--text); }

  #status {
    font-size: 0.75rem;
    padding: 4px 0;
    min-height: 20px;
    transition: opacity 0.3s;
  }
  .ok { color: var(--success); }
  .err { color: var(--danger); }

  #edit-id { display: none; }
</style>
</head>
<body>

<header>
  <h1>exceptions</h1>
  <span>manager</span>
</header>

<div class="table-wrap">
  <table id="tbl">
    <thead>
      <tr>
        <th>ID</th>
        <th>Host</th>
        <th>Service</th>
        <th>Summary</th>
        <th>Age</th>
        <th>Typ</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="tbody">
      <tr><td colspan="7" class="empty">Ładowanie...</td></tr>
    </tbody>
  </table>
</div>

<div class="form-section">
  <div class="form-title" id="form-title">+ Nowy wyjątek</div>
  <input type="hidden" id="edit-id">
  <div class="fields">
    <div class="field">
      <label>Host</label>
      <input id="f-host" placeholder="np. dev, test" />
    </div>
    <div class="field">
      <label>Service</label>
      <input id="f-service" placeholder="np. filesystem" />
    </div>
    <div class="field">
      <label>Summary</label>
      <input id="f-summary" placeholder="opcjonalnie" />
    </div>
    <div class="field">
      <label>Age</label>
      <input id="f-age" placeholder="opcjonalnie" />
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-primary" onclick="save()">Zapisz</button>
    <button class="btn btn-secondary" onclick="reset()">Anuluj</button>
    <span id="status"></span>
  </div>
</div>

<script>
  let rows = [];

  async function load() {
    const res = await fetch('/api/exceptions');
    rows = await res.json();
    render();
  }

  function getType(r) {
    if (r.host && r.service) return ['both', 'host + service'];
    if (r.host) return ['host', 'tylko host'];
    if (r.service) return ['service', 'tylko service'];
    return ['', '–'];
  }

  function render() {
    const tbody = document.getElementById('tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Brak rekordów</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const [cls, label] = getType(r);
      return \`<tr onclick="edit(\${r.id})" id="row-\${r.id}">
        <td>\${r.id}</td>
        <td>\${r.host || '<span class="empty">—</span>'}</td>
        <td>\${r.service || '<span class="empty">—</span>'}</td>
        <td>\${r.summary || '<span class="empty">—</span>'}</td>
        <td>\${r.age || '<span class="empty">—</span>'}</td>
        <td><span class="badge badge-\${cls}">\${label}</span></td>
        <td><button class="btn-del" onclick="del(event,\${r.id})">usuń</button></td>
      </tr>\`;
    }).join('');
  }

  function edit(id) {
    document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected'));
    const r = rows.find(x => x.id === id);
    if (!r) return;
    document.getElementById('row-' + id).classList.add('selected');
    document.getElementById('edit-id').value = id;
    document.getElementById('f-host').value = r.host || '';
    document.getElementById('f-service').value = r.service || '';
    document.getElementById('f-summary').value = r.summary || '';
    document.getElementById('f-age').value = r.age || '';
    document.getElementById('form-title').textContent = '✎ Edycja rekordu #' + id;
  }

  function reset() {
    document.getElementById('edit-id').value = '';
    document.getElementById('f-host').value = '';
    document.getElementById('f-service').value = '';
    document.getElementById('f-summary').value = '';
    document.getElementById('f-age').value = '';
    document.getElementById('form-title').textContent = '+ Nowy wyjątek';
    document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected'));
    status('', '');
  }

  function status(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = type;
  }

  async function save() {
    const id = document.getElementById('edit-id').value;
    const body = {
      host: document.getElementById('f-host').value.trim(),
      service: document.getElementById('f-service').value.trim(),
      summary: document.getElementById('f-summary').value.trim(),
      age: document.getElementById('f-age').value.trim(),
    };
    const url = id ? '/api/exceptions/' + id : '/api/exceptions';
    const method = id ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      status(id ? 'Zaktualizowano ✓' : 'Dodano ✓', 'ok');
      reset();
      load();
    } catch {
      status('Błąd zapisu', 'err');
    }
  }

  async function del(e, id) {
    e.stopPropagation();
    if (!confirm('Usunąć rekord #' + id + '?')) return;
    try {
      await fetch('/api/exceptions/' + id, { method: 'DELETE' });
      load();
    } catch {
      status('Błąd usuwania', 'err');
    }
  }

  load();
</script>
</body>
</html>`;

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

  // Serve UI
  if (method === "GET" && url === "/") return send(res, 200, HTML);

  // GET /api/exceptions
  if (method === "GET" && url === "/api/exceptions") {
    const result = await pool.query("SELECT * FROM exceptions ORDER BY id");
    return send(res, 200, result.rows);
  }

  // POST /api/exceptions
  if (method === "POST" && url === "/api/exceptions") {
    const { host, service, summary, age } = await parseBody(req);
    await pool.query(
      "INSERT INTO exceptions (host, service, summary, age) VALUES ($1,$2,$3,$4)",
      [host || "", service || "", summary || "", age || ""],
    );
    return send(res, 201, { ok: true });
  }

  // PUT /api/exceptions/:id
  const putMatch = url.match(/^\/api\/exceptions\/(\d+)$/);
  if (method === "PUT" && putMatch) {
    const id = putMatch[1];
    const { host, service, summary, age } = await parseBody(req);
    await pool.query(
      "UPDATE exceptions SET host=$1, service=$2, summary=$3, age=$4 WHERE id=$5",
      [host || "", service || "", summary || "", age || "", id],
    );
    return send(res, 200, { ok: true });
  }

  // DELETE /api/exceptions/:id
  const delMatch = url.match(/^\/api\/exceptions\/(\d+)$/);
  if (method === "DELETE" && delMatch) {
    await pool.query("DELETE FROM exceptions WHERE id=$1", [delMatch[1]]);
    return send(res, 200, { ok: true });
  }

  send(res, 404, { error: "Not found" });
});

server.listen(3000, () => {
  console.log("✓ Serwer nasłuchuje na porcie 3000");
});
