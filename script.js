// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('.subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.subpanel').forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.subtab).classList.add('active');
  });
});

// ---------- Helpers ----------
function el(tag, opts = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(opts).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

function renderList(items) {
  const ul = el('ul');
  items.forEach(i => ul.appendChild(el('li', {}, i)));
  return ul;
}

// ---------- Renderers ----------
function renderRules(rules) {
  const wrap = document.getElementById('rules-content');
  wrap.innerHTML = '';

  wrap.appendChild(el('h2', { class: 'section-title' }, rules.buyIn.title));
  wrap.appendChild(el('div', { class: 'card' }, renderList(rules.buyIn.items)));

  wrap.appendChild(el('h2', { class: 'section-title' }, rules.keeperRules.title));
  wrap.appendChild(el('div', { class: 'card' }, renderList(rules.keeperRules.items)));

  wrap.appendChild(el('h2', { class: 'section-title' }, rules.keeperSteps.title));
  const stepsCard = el('div', { class: 'card' });
  stepsCard.appendChild(el('div', { class: 'note-box' }, rules.keeperSteps.deadlineNote));
  stepsCard.appendChild(renderList(rules.keeperSteps.steps));
  wrap.appendChild(stepsCard);

  wrap.appendChild(el('h2', { class: 'section-title' }, rules.tradeRules.title));
  wrap.appendChild(el('div', { class: 'card' }, renderList(rules.tradeRules.items)));
}

// ---------- 2026 Draft grid + search ----------
let allPicks = []; // flat list: { round, pick, manager }

function renderSeason2026(picksData) {
  const table = document.getElementById('draft-grid');
  table.innerHTML = '';
  allPicks = [];

  const thead = el('thead');
  const headRow = el('tr');
  headRow.appendChild(el('th', {}, 'Rd'));
  for (let p = 1; p <= 12; p++) headRow.appendChild(el('th', {}, 'Pick ' + p));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  picksData.draftOrder.forEach(round => {
    const row = el('tr');
    row.appendChild(el('td', {}, String(round.round)));
    round.picks.forEach((manager, i) => {
      allPicks.push({ round: round.round, pick: i + 1, manager });
      const cell = el('td', {
        class: 'pick-cell',
        'data-manager': manager.toLowerCase(),
        title: round.round + '.' + String(i + 1).padStart(2, '0') + ' — ' + manager
      }, manager);
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Build manager quick-filter chips (unique, in league roster order)
  const chipWrap = document.getElementById('manager-chips');
  chipWrap.innerHTML = '';
  const uniqueManagers = [...new Set(allPicks.map(p => p.manager))].sort();
  uniqueManagers.forEach(m => {
    const chip = el('button', { class: 'manager-chip', type: 'button', 'data-manager': m }, m);
    chip.addEventListener('click', () => {
      const input = document.getElementById('draft-search');
      input.value = (input.value.toLowerCase() === m.toLowerCase()) ? '' : m;
      applyDraftFilter(input.value);
    });
    chipWrap.appendChild(chip);
  });

  applyDraftFilter('');
}

function applyDraftFilter(rawTerm) {
  const term = rawTerm.trim().toLowerCase();
  const table = document.getElementById('draft-grid');
  const summary = document.getElementById('draft-summary');
  const cells = table.querySelectorAll('td.pick-cell');
  const chips = document.querySelectorAll('.manager-chip');

  chips.forEach(c => c.classList.toggle('active', c.dataset.manager.toLowerCase() === term));

  if (!term) {
    table.classList.remove('filtering');
    cells.forEach(c => c.classList.remove('match'));
    summary.textContent = '';
    return;
  }

  table.classList.add('filtering');
  let matchCount = 0;
  cells.forEach(c => {
    const isMatch = c.dataset.manager.includes(term);
    c.classList.toggle('match', isMatch);
    if (isMatch) matchCount++;
  });

  const exact = allPicks.filter(p => p.manager.toLowerCase() === term);
  if (exact.length) {
    const list = exact.map(p => p.round + '.' + String(p.pick).padStart(2, '0')).join(', ');
    summary.textContent = exact[0].manager + ' — ' + exact.length + ' picks: ' + list;
  } else if (matchCount) {
    summary.textContent = matchCount + ' picks match "' + rawTerm.trim() + '"';
  } else {
    summary.textContent = 'No picks match "' + rawTerm.trim() + '"';
  }
}

document.getElementById('draft-search').addEventListener('input', (e) => applyDraftFilter(e.target.value));

// ---------- History: draft order ----------
function renderHistoryDraftOrder(history) {
  document.getElementById('draftorder-note').textContent = history.note;
  const list = document.getElementById('draftorder-list');
  list.innerHTML = '';
  history.draftOrder.forEach(row => {
    const rowEl = el('div', { class: 'order-row' },
      el('span', { class: 'order-pos' }, String(row.pick).padStart(2, '0')),
      el('span', { class: 'order-name' }, row.manager)
    );
    if (row.note) rowEl.appendChild(el('span', { class: 'order-note' }, '\u2014 ' + row.note));
    list.appendChild(rowEl);
  });
}

function renderPickCount(pc) {
  document.getElementById('pickcount-note').textContent = pc.note;
  const table = document.getElementById('pickcount-table');
  table.innerHTML = '';
  const thead = el('thead');
  const headRow = el('tr');
  headRow.appendChild(el('th', {}, 'Team'));
  for (let r = 1; r <= pc.rounds; r++) headRow.appendChild(el('th', {}, String(r)));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  pc.teams.forEach(t => {
    const row = el('tr');
    row.appendChild(el('td', {}, t.team));
    t.picks.forEach(p => row.appendChild(el('td', {}, String(p))));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
}

function renderKeepers(keepers) {
  const grid = document.getElementById('keepers-grid');
  grid.innerHTML = '';
  keepers.forEach(k => {
    const card = el('div', { class: 'keeper-card' });
    card.appendChild(el('h4', {}, k.manager));
    if (k.players.length) {
      card.appendChild(renderList(k.players));
    } else {
      card.appendChild(el('div', { class: 'none' }, 'No keepers'));
    }
    grid.appendChild(card);
  });
}

// ---------- Load data ----------
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    renderSeason2026(data.season2026);
    renderRules(data.rules);
    renderHistoryDraftOrder(data.history2025);
    renderPickCount(data.history2025.pickCount);
    renderKeepers(data.history2025.keepers);
  })
  .catch(err => {
    console.error('Failed to load data.json', err);
    document.getElementById('rules-content').innerHTML =
      '<div class="note-box">Could not load data.json. If you\'re opening this file directly (file://), run a local server instead — e.g. <code>python3 -m http.server</code> — or view it once deployed on GitHub Pages.</div>';
  });
