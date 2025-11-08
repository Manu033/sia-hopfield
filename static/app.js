const N = 81;
const grid = document.getElementById('grid');
const vectorOut = document.getElementById('vectorOut');
const stepsDiv = document.getElementById('steps');
const wDiv = document.getElementById('wtable');
const learnedDiv = document.getElementById('learned');
const status = document.getElementById('status');

// Construir 4×4
let cells = [];
for (let i = 0; i < N; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.onclick = () => { c.classList.toggle('on'); showVector(); };
    grid.appendChild(c);
    cells.push(c);
}

function getVector() {
    // 1 negro (on), -1 blanco (off)
    return cells.map(c => c.classList.contains('on') ? 1 : -1);
}

function renderMini(vec) {
    const wrap = document.createElement('div');
    wrap.className = 'mini';
    for (let i = 0; i < vec.length; i++) {
        const p = document.createElement('div');
        p.className = 'px' + (vec[i] === 1 ? ' on' : '');
        wrap.appendChild(p);
    }
    return wrap;
}

function showVector() {
    const v = getVector();
    vectorOut.textContent = 'vector: [' + v.join(', ') + ']';
}

function clearGrid() {
    cells.forEach(c => c.classList.remove('on'));
    showVector();
}

async function api(path, method = 'GET', body = null) {
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(path, opt);
    return await r.json();
}

async function trainDefault() {
    status.textContent = 'Cargando letras de ejemplo…';
    await api('/api/train_default', 'POST', {});
    await fetchW();
    await refreshLearned();
    status.textContent = 'Listo: letras de ejemplo cargadas';
}

async function addToStore() {
    const lab = (document.getElementById('label').value || '').trim();
    if (!lab) { alert('Ingresá una etiqueta (ej: A)'); return; }
    const vec = getVector();
    status.textContent = 'Guardando…';
    await api('/api/store', 'POST', { patterns: [{ label: lab, vector: vec }] });
    await fetchW();
    await refreshLearned();
    status.textContent = 'Patrón guardado y W actualizada';
}

async function fetchW() {
    const data = await api('/api/W');
    const W = data.W;
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    for (let j = 0; j <= W.length; j++) {
        const th = document.createElement('th');
        th.textContent = j === 0 ? 'i/j' : j - 1;
        thr.appendChild(th);
    }
    thead.appendChild(thr);
    tbl.appendChild(thead);
    const tb = document.createElement('tbody');
    for (let i = 0; i < W.length; i++) {
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.textContent = i; tr.appendChild(th);
        for (let j = 0; j < W.length; j++) {
            const td = document.createElement('td');
            td.textContent = W[i][j];
            tr.appendChild(td);
        }
        tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    wDiv.innerHTML = '';
    wDiv.appendChild(tbl);
}

async function refreshLearned() {
    const data = await api('/api/letters');
    learnedDiv.innerHTML = '';
    const list = document.createElement('div');
    const labels = data.labels || [];
    for (const lab of labels) {
        const vec = data.patterns[lab];
        const row = document.createElement('div');
        row.className = 'row';
        const tag = document.createElement('span');
        tag.className = 'kbd';
        tag.textContent = lab;
        row.appendChild(tag);
        row.appendChild(renderMini(vec));
        const txt = document.createElement('span');
        txt.className = 'muted';
        txt.textContent = '  [' + vec.join(', ') + ']';
        row.appendChild(txt);
        list.appendChild(row);
    }
    learnedDiv.appendChild(list);
}

async function recognize() {
    const vec = getVector();
    status.textContent = 'Reconociendo…';
    const data = await api('/api/recognize', 'POST', { vector: vec, max_steps: 12 });
    status.textContent = 'Listo';
    // Render pasos
    stepsDiv.innerHTML = '';
    data.steps.forEach(st => {
        const k = st.k; const h = st.h; const s = st.s;
        const card = document.createElement('div');
        card.className = 'card';
        const h3 = document.createElement('h3'); h3.textContent = `Paso ${k}`; card.appendChild(h3);
        const r1 = document.createElement('div'); r1.className = 'row';
        const hlabel = document.createElement('span'); hlabel.className = 'kbd'; hlabel.textContent = 'h = W·x';
        const htext = document.createElement('span'); htext.className = 'muted'; htext.textContent = ' [' + h.join(', ') + ']';
        r1.appendChild(hlabel); r1.appendChild(htext); card.appendChild(r1);
        const r2 = document.createElement('div'); r2.className = 'row';
        const slabel = document.createElement('span'); slabel.className = 'kbd'; slabel.textContent = 's = sgn(h)';
        const stext = document.createElement('span'); stext.className = 'muted'; stext.textContent = ' [' + s.join(', ') + ']';
        r2.appendChild(slabel); r2.appendChild(stext); r2.appendChild(renderMini(s));
        card.appendChild(r2);
        stepsDiv.appendChild(card);
    });
    // Diagnóstico final
    const diag = document.getElementById('diag');
    diag.innerHTML = '';
    const finalRow = document.createElement('div'); finalRow.className = 'row';
    finalRow.appendChild(renderMini(data.final));
    const txt = document.createElement('div');
    txt.innerHTML = `
        <div>Final: <span class="kbd">[${data.final.join(', ')}]</span></div>
        <div>Match exacto: <b>${data.match ?? '—'}</b></div>
        <div>Más cercano (Hamming): <b>${data.nearest_label ?? '—'}</b> (dist = ${data.nearest_hamming ?? '—'})</div>
        <div>Energía final: <span class="kbd">${Number(data.energy_final).toFixed(1)}</span></div>
      `;
    finalRow.appendChild(txt);
    diag.appendChild(finalRow);
}

// Estado inicial
(async () => {
    await refreshLearned();
    await fetchW();
    showVector();
})();