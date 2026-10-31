const http = require('http');
const mongoose = require('mongoose');

const PORT = 8081;
const MONGO_URI = 'mongodb://localhost:27017/supermarket_db';

async function startViewer() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected to supermarket_db on 27017');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // API: list collections
    if (url.pathname === '/api/collections') {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const list = [];
        for (const c of collections) {
          const count = await mongoose.connection.db.collection(c.name).countDocuments();
          list.push({ name: c.name, count });
        }
        list.sort((a, b) => b.count - a.count);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ database: mongoose.connection.name, collections: list }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // API: get documents in a collection
    if (url.pathname.startsWith('/api/collection/')) {
      const collName = decodeURIComponent(url.pathname.replace('/api/collection/', ''));
      try {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const search = url.searchParams.get('search') || '';
        const coll = mongoose.connection.db.collection(collName);
        
        let query = {};
        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { sku: { $regex: search, $options: 'i' } },
              { barcode: { $regex: search, $options: 'i' } },
              { receiptNumber: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { batchNumber: { $regex: search, $options: 'i' } }
            ]
          };
        }

        const total = await coll.countDocuments();
        const docs = await coll.find(query).limit(limit).toArray();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ collection: collName, total, count: docs.length, docs }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // Serve HTML App
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MongoDB Database Explorer — supermarket_db</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    pre.json { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .key { color: #0284c7; font-weight: 600; }
    .string { color: #16a34a; }
    .number { color: #ea580c; }
    .boolean { color: #9333ea; font-weight: 600; }
    .null { color: #64748b; font-style: italic; }
    .oid { color: #e11d48; font-weight: bold; }
  </style>
</head>
<body class="bg-[#0b1320] text-gray-100 min-h-screen flex flex-col font-sans">
  <!-- Top Bar -->
  <header class="bg-[#111c2e] border-b border-gray-800 px-6 py-3.5 flex items-center justify-between shadow-md">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
        <i class="fa-solid fa-leaf text-emerald-400"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-base font-bold text-white tracking-wide">MongoDB Database Explorer</h1>
          <span class="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Connected
          </span>
        </div>
        <p class="text-xs text-gray-400 font-mono">mongodb://localhost:27017/<strong>supermarket_db</strong></p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <a href="http://localhost:5173" target="_blank" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition flex items-center gap-1.5">
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Open Supermarket App
      </a>
      <button onclick="loadCollections()" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow">
        <i class="fa-solid fa-rotate"></i> Refresh
      </button>
    </div>
  </header>

  <!-- Main Body -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Left Sidebar: Collections -->
    <aside class="w-72 bg-[#0e1726] border-r border-gray-800 flex flex-col shrink-0">
      <div class="p-3.5 border-b border-gray-800 flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <i class="fa-solid fa-layer-group text-emerald-400"></i> Collections (<span id="coll-count">0</span>)
        </span>
      </div>
      <div id="collections-list" class="flex-1 overflow-y-auto p-2 space-y-1">
        <div class="text-xs text-gray-500 p-4 text-center">Loading collections...</div>
      </div>
    </aside>

    <!-- Right Content Area -->
    <main class="flex-1 flex flex-col bg-[#0b1320] overflow-hidden">
      <!-- Collection Banner -->
      <div class="bg-[#111c2e] border-b border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-folder-open text-emerald-400 text-sm"></i>
            <h2 id="current-coll-title" class="text-lg font-bold text-white font-mono">Select a Collection</h2>
            <span id="current-coll-badge" class="hidden px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-300 rounded border border-gray-700"></span>
          </div>
          <p id="current-coll-desc" class="text-xs text-gray-400 mt-0.5">Click any collection from the left sidebar to view its MongoDB documents.</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-gray-400"></i>
            <input type="text" id="search-input" placeholder="Filter documents..." oninput="filterDocuments()"
              class="w-full bg-[#0e1726] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500">
          </div>
          <div class="flex rounded-lg border border-gray-700 bg-[#0e1726] p-0.5">
            <button id="btn-table" onclick="setViewMode('table')" class="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white">Table</button>
            <button id="btn-json" onclick="setViewMode('json')" class="px-2.5 py-1 text-xs font-medium rounded text-gray-400 hover:text-white">JSON</button>
          </div>
        </div>
      </div>

      <!-- Documents Viewer -->
      <div id="docs-container" class="flex-1 overflow-y-auto p-4">
        <div class="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
          <i class="fa-solid fa-database text-4xl text-gray-700 mb-3"></i>
          <p>Fadlan dooro collection bidixda kaga yaalla si aad xogta u aragto.</p>
        </div>
      </div>
    </main>
  </div>

  <script>
    let activeCollection = 'products';
    let currentDocs = [];
    let viewMode = 'table';

    async function loadCollections() {
      try {
        const res = await fetch('/api/collections');
        const data = await res.json();
        document.getElementById('coll-count').innerText = data.collections.length;
        
        const listEl = document.getElementById('collections-list');
        listEl.innerHTML = '';
        
        data.collections.forEach(c => {
          const btn = document.createElement('button');
          btn.className = \`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition \${
            activeCollection === c.name 
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold' 
              : 'text-gray-300 hover:bg-gray-800/60'
          }\`;
          btn.onclick = () => selectCollection(c.name);
          btn.innerHTML = \`
            <span class="flex items-center gap-2 truncate">
              <i class="fa-solid fa-table text-[11px] text-gray-400"></i>
              <span class="truncate">\${c.name}</span>
            </span>
            <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-800 text-gray-300 border border-gray-700">\${c.count}</span>
          \`;
          listEl.appendChild(btn);
        });

        if (activeCollection) {
          selectCollection(activeCollection);
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function selectCollection(name) {
      activeCollection = name;
      document.getElementById('current-coll-title').innerText = name;
      document.getElementById('current-coll-desc').innerText = \`Displaying live documents inside MongoDB: supermarket_db.\${name}\`;
      
      const badge = document.getElementById('current-coll-badge');
      badge.classList.remove('hidden');
      badge.innerText = 'Loading...';

      // Update active button state
      loadCollectionsHighlight();

      try {
        const res = await fetch(\`/api/collection/\${name}?limit=100\`);
        const data = await res.json();
        currentDocs = data.docs;
        badge.innerText = \`\${data.docs.length} of \${data.total} documents\`;
        renderDocs();
      } catch (err) {
        document.getElementById('docs-container').innerHTML = \`<div class="text-rose-400 p-4">Failed to load: \${err.message}</div>\`;
      }
    }

    function loadCollectionsHighlight() {
      const btns = document.querySelectorAll('#collections-list button');
      btns.forEach(b => {
        const span = b.querySelector('span span');
        if (span && span.innerText === activeCollection) {
          b.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between bg-emerald-600/20 text-emerald-300 border border-emerald-500/40';
        } else {
          b.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between text-gray-300 hover:bg-gray-800/60';
        }
      });
    }

    function setViewMode(mode) {
      viewMode = mode;
      document.getElementById('btn-table').className = mode === 'table' 
        ? 'px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white' 
        : 'px-2.5 py-1 text-xs font-medium rounded text-gray-400 hover:text-white';
      document.getElementById('btn-json').className = mode === 'json' 
        ? 'px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white' 
        : 'px-2.5 py-1 text-xs font-medium rounded text-gray-400 hover:text-white';
      renderDocs();
    }

    function filterDocuments() {
      const q = document.getElementById('search-input').value.toLowerCase();
      if (!q) {
        renderDocs(currentDocs);
        return;
      }
      const filtered = currentDocs.filter(d => JSON.stringify(d).toLowerCase().includes(q));
      renderDocs(filtered);
    }

    function renderDocs(docsToRender) {
      const docs = docsToRender || currentDocs;
      const container = document.getElementById('docs-container');
      if (!docs || docs.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-xs p-6 text-center">Wax xog ah lagama helin collection-kan ama baaritaankaaga.</div>';
        return;
      }

      if (viewMode === 'json') {
        let html = '<div class="space-y-4">';
        docs.forEach((doc, idx) => {
          html += \`
            <div class="bg-[#0e1726] border border-gray-800 rounded-xl p-4 shadow">
              <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-800/80">
                <span class="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <i class="fa-solid fa-fingerprint text-[10px] text-gray-400"></i> _id: \${doc._id}
                </span>
                <span class="text-[11px] text-gray-500 font-mono">#\${idx + 1}</span>
              </div>
              <pre class="json text-xs leading-relaxed overflow-x-auto text-gray-200">\${syntaxHighlight(JSON.stringify(doc, null, 2))}</pre>
            </div>
          \`;
        });
        html += '</div>';
        container.innerHTML = html;
      } else {
        // Table View
        // Pick primary keys
        const keys = Array.from(new Set(docs.flatMap(d => Object.keys(d)))).slice(0, 8);
        let html = \`
          <div class="bg-[#0e1726] border border-gray-800 rounded-xl overflow-hidden shadow">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr class="bg-[#142136] text-gray-300 border-b border-gray-700/80 uppercase text-[11px] font-bold">
                    \${keys.map(k => \`<th class="py-2.5 px-3 whitespace-nowrap">\${k}</th>\`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800/70">
        \`;

        docs.forEach(doc => {
          html += '<tr class="hover:bg-gray-800/40 transition">';
          keys.forEach(k => {
            let val = doc[k];
            let displayVal = '';
            if (val === undefined || val === null) displayVal = '<span class="text-gray-600 italic">null</span>';
            else if (typeof val === 'object') displayVal = \`<span class="text-emerald-400 truncate max-w-xs block">\${JSON.stringify(val)}</span>\`;
            else if (typeof val === 'boolean') displayVal = \`<span class="text-purple-400 font-bold">\${val}</span>\`;
            else if (typeof val === 'number') displayVal = \`<span class="text-amber-400">\${val}</span>\`;
            else displayVal = \`<span class="text-gray-200 truncate max-w-xs block">\${String(val)}</span>\`;

            html += \`<td class="py-2.5 px-3 whitespace-nowrap">\${displayVal}</td>\`;
          });
          html += '</tr>';
        });

        html += \`
                </tbody>
              </table>
            </div>
          </div>
        \`;
        container.innerHTML = html;
      }
    }

    function syntaxHighlight(json) {
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
            if (match.includes('_id') || /"[0-9a-f]{24}"/.test(match)) cls = 'oid';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    // Init
    loadCollections();
  </script>
</body>
</html>`);
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(PORT, () => {
    console.log(`🚀 MongoDB Web Viewer running on http://localhost:${PORT}`);
  });
}

startViewer().catch(err => {
  console.error('Failed to start MongoDB viewer:', err);
  process.exit(1);
});
