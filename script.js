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
  const wrap = document.getElementById('draft-rounds');
  wrap.innerHTML = '';
  allPicks = [];

  picksData.draftOrder.forEach(round => {
    const card = el('div', { class: 'round-card' });
    card.appendChild(el('div', { class: 'round-card-head' },
      el('span', { class: 'round-badge' }, 'ROUND ' + round.round),
      el('span', { class: 'round-card-meta' }, round.picks.length + ' picks')
    ));

    const grid = el('div', { class: 'pick-grid' });
    round.picks.forEach((manager, i) => {
      allPicks.push({ round: round.round, pick: i + 1, manager });
      grid.appendChild(el('div', {
        class: 'pick-cell',
        'data-manager': manager.toLowerCase()
      },
        el('span', { class: 'pick-slot' }, round.round + '.' + String(i + 1).padStart(2, '0')),
        el('span', { class: 'pick-manager' }, manager)
      ));
    });
    card.appendChild(grid);
    wrap.appendChild(card);
  });

  const chipWrap = document.getElementById('manager-chips');
  chipWrap.innerHTML = '';
  const uniqueManagers = [...new Set(allPicks.map(p => p.manager))].sort();
  uniqueManagers.forEach(m => {
    const chip = el('button', { class: 'manager-chip', type: 'button', 'data-manager': m }, m);
    chip.addEventListener('click', () => {
      const input = document.getElementById('draft-search');
      input.value = (input.value.trim().toLowerCase() === m.toLowerCase()) ? '' : m;
      applyDraftFilter(input.value);
    });
    chipWrap.appendChild(chip);
  });

  applyDraftFilter('');
}

function applyDraftFilter(rawTerm) {
  const term = rawTerm.trim().toLowerCase();
  const container = document.getElementById('draft-rounds');
  const summary = document.getElementById('draft-summary');
  const cells = container.querySelectorAll('.pick-cell');
  const chips = document.querySelectorAll('.manager-chip');

  chips.forEach(c => c.classList.toggle('active', c.dataset.manager.toLowerCase() === term));

  if (!term) {
    container.classList.remove('filtering');
    cells.forEach(c => c.classList.remove('match'));
    summary.textContent = '';
    return;
  }

  container.classList.add('filtering');
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

// ---------- History: year chips + view dropdown ----------
let historyData = null;
let activeYear = null;
let activeView = null;

function renderHistoryChips(history) {
  historyData = history;
  const chipWrap = document.getElementById('year-chips');
  chipWrap.innerHTML = '';
  history.years.forEach(y => {
    const chip = el('button', { class: 'year-chip', type: 'button' }, y.year);
    chip.addEventListener('click', () => selectYear(y.year));
    chipWrap.appendChild(chip);
  });
  selectYear(history.years[history.years.length - 1].year);
}

function selectYear(year) {
  activeYear = year;
  const yearObj = historyData.years.find(y => y.year === year);

  document.querySelectorAll('.year-chip').forEach(c => {
    c.classList.toggle('active', c.textContent === year);
  });

  const sel = document.getElementById('view-select');
  sel.innerHTML = '';
  yearObj.views.forEach(v => {
    sel.appendChild(el('option', { value: v.id }, v.label));
  });

  // A single-view year doesn't need a dropdown
  document.querySelector('.view-select-wrap').style.display =
    yearObj.views.length > 1 ? 'flex' : 'none';

  selectView(yearObj.views[0].id);
}

function selectView(viewId) {
  activeView = viewId;
  document.getElementById('view-select').value = viewId;
  const yearObj = historyData.years.find(y => y.year === activeYear);
  const view = yearObj.views.find(v => v.id === viewId);

  document.getElementById('history-note').textContent = view.note || '';
  const searchInput = document.getElementById('history-search');
  searchInput.value = '';
  document.getElementById('history-summary').textContent = '';

  const isDraft = !!view.rounds;
  document.getElementById('history-search-wrap').style.display = isDraft ? 'block' : 'none';
  searchInput.placeholder = 'Search player or manager...';

  const wrap = document.getElementById('history-content');
  wrap.innerHTML = '';

  if (isDraft) {
    wrap.className = 'draft-rounds';
    view.rounds.forEach(round => {
      const card = el('div', { class: 'round-card' });
      card.appendChild(el('div', { class: 'round-card-head' },
        el('span', { class: 'round-badge' }, 'ROUND ' + round.round),
        el('span', { class: 'round-card-meta' }, activeYear)
      ));
      const list = el('div', { class: 'result-list' });
      round.picks.forEach(p => {
        list.appendChild(el('div', {
          class: 'result-row',
          'data-search': (p.player + ' ' + p.manager).toLowerCase()
        },
          el('span', { class: 'result-slot' }, round.round + '.' + String(p.pick).padStart(2, '0')),
          el('span', { class: 'result-player' }, p.player),
          el('span', { class: 'result-manager' }, p.manager)
        ));
      });
      card.appendChild(list);
      wrap.appendChild(card);
    });
  } else {
    wrap.className = 'keeper-grid';
    view.keepers.forEach(k => {
      const card = el('div', { class: 'keeper-card' });
      card.appendChild(el('h4', {}, k.manager));
      if (k.players.length) {
        const ul = el('ul');
        k.players.forEach(p => {
          const li = el('li', {},
            p.player + (p.round ? ' (Rd ' + p.round + ')' : '')
          );
          if (p.acquired) {
            li.appendChild(el('span', { class: 'acq-note' }, ' \u2014 drafted by ' + p.acquired));
          }
          ul.appendChild(li);
        });
        card.appendChild(ul);
      } else {
        card.appendChild(el('div', { class: 'none' }, 'No keepers'));
      }
      wrap.appendChild(card);
    });
  }
}

document.getElementById('view-select').addEventListener('change', e => selectView(e.target.value));

document.getElementById('history-search').addEventListener('input', e => {
  const term = e.target.value.trim().toLowerCase();
  const wrap = document.getElementById('history-content');
  const rows = wrap.querySelectorAll('.result-row');
  const summary = document.getElementById('history-summary');

  if (!term) {
    rows.forEach(r => r.classList.remove('hidden', 'match'));
    wrap.querySelectorAll('.round-card').forEach(c => c.classList.remove('hidden'));
    summary.textContent = '';
    return;
  }

  let count = 0;
  rows.forEach(r => {
    const hit = r.dataset.search.includes(term);
    r.classList.toggle('hidden', !hit);
    r.classList.toggle('match', hit);
    if (hit) count++;
  });

  // hide rounds with no surviving rows
  wrap.querySelectorAll('.round-card').forEach(card => {
    const visible = card.querySelectorAll('.result-row:not(.hidden)').length;
    card.classList.toggle('hidden', visible === 0);
  });

  summary.textContent = count
    ? count + ' pick' + (count === 1 ? '' : 's') + ' matching "' + e.target.value.trim() + '"'
    : 'No picks match "' + e.target.value.trim() + '"';
});

// ---------- 2026 Keepers: Google Sheet CSV + auto round-cost calc ----------
const KEEPERS_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTg4yWD1olEa1VADq4Pm_P9EVQPEdVux5zl_Qnti2QFnD-91nMi61x9Dr-mAEycGNRiJqv9jh30ZoiV/pub?gid=0&single=true&output=csv";

let keeperLookup = null; // built once from data.json history

// Normalize a name for fuzzy matching: lowercase, strip punctuation,
// drop suffixes (jr/sr/ii/iii/iv), collapse whitespace.
function normalizeNameTokens(name) {
  const SUFFIXES = new Set(["jr","sr","ii","iii","iv","v"]);
  const cleaned = name
    .toLowerCase()
    .replace(/['\u2019]/g, '')     // strip apostrophes: Ja'Marr -> jamarr
    .replace(/-/g, ' ')             // hyphens -> space: Amon-Ra -> amon ra
    .replace(/\./g, '')            // periods removed (not spaced): A.J. -> aj, matches typed "AJ"
    .replace(/[^a-z0-9\s]/g, '')   // strip anything else weird
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (cleaned.length > 1 && SUFFIXES.has(cleaned[cleaned.length - 1])) {
    cleaned.pop();
  }
  return cleaned;
}

// Build a lookup keyed by last-name token -> list of candidate records,
// so fuzzy matching only has to compare within same-last-name buckets.
function buildKeeperLookup(history) {
  const keptList = [];
  const draftedList = [];

  const y2025 = history.years.find(y => y.year === "2025");
  if (y2025) {
    const keeperView = y2025.views.find(v => v.id === "keepers");
    if (keeperView) {
      keeperView.keepers.forEach(k => {
        k.players.forEach(p => {
          keptList.push({ name: p.player, round: p.round, manager: k.manager });
        });
      });
    }
    const draftView = y2025.views.find(v => v.id === "draft");
    if (draftView) {
      draftView.rounds.forEach(r => {
        r.picks.forEach(pk => {
          draftedList.push({ name: pk.player, round: r.round, manager: pk.manager });
        });
      });
    }
  }

  function indexByLastName(list) {
    const idx = {};
    list.forEach(rec => {
      const tokens = normalizeNameTokens(rec.name);
      if (!tokens.length) return;
      const last = tokens[tokens.length - 1];
      rec._tokens = tokens;
      (idx[last] = idx[last] || []).push(rec);
    });
    return idx;
  }

  return {
    keptByLast: indexByLastName(keptList),
    draftedByLast: indexByLastName(draftedList)
  };
}

// Find the best match for a typed name within a last-name-indexed bucket.
// Requires exact last-name match + first-name prefix match (min 3 chars,
// or exact if the typed first name is shorter than 3 chars).
function fuzzyFind(indexByLast, inputName) {
  const tokens = normalizeNameTokens(inputName);
  if (!tokens.length) return null;
  const last = tokens[tokens.length - 1];
  const first = tokens[0];
  const candidates = indexByLast[last];
  if (!candidates) return null;

  for (const rec of candidates) {
    const cFirst = rec._tokens[0];
    if (cFirst === first) return rec;                 // exact first name
    const prefixLen = Math.min(first.length, cFirst.length, 3);
    if (first.length >= 3 && cFirst.startsWith(first)) return rec;   // "ken" -> "kenneth"
    if (cFirst.length >= 3 && first.startsWith(cFirst)) return rec;  // reverse case
  }
  return null; // last-name-only matches are deliberately NOT auto-resolved (too risky)
}

function computeKeeperCost(playerName) {
  const { keptByLast, draftedByLast } = keeperLookup;

  const keptMatch = fuzzyFind(keptByLast, playerName);
  if (keptMatch) {
    const base = keptMatch.round;
    if (base <= 2) return { label: "Not eligible", detail: "Rd " + base + " originally \u2014 1st/2nd round picks can't be kept" };
    return { label: "Costs Rd " + (base - 2), detail: "2nd yr keeper \u2014 matched \"" + keptMatch.name + "\", originally Rd " + base + " (2024)" };
  }

  const draftMatch = fuzzyFind(draftedByLast, playerName);
  if (draftMatch) {
    const base = draftMatch.round;
    if (base <= 2) return { label: "Not eligible", detail: "Rd " + base + " in 2025 \u2014 1st/2nd round picks can't be kept" };
    return { label: "Costs Rd " + (base - 1), detail: "Matched \"" + draftMatch.name + "\", drafted Rd " + base + " (2025)" };
  }

  return { label: "Costs Rd 8", detail: "No match in draft history \u2014 assumed waiver pickup (double-check spelling if this looks wrong)" };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = lines.map(line => {
    // simple CSV split; handles quoted fields with commas
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === ',' && !inQuotes) { cells.push(cur); cur = ''; }
      else { cur += c; }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  });
  return rows;
}

function renderKeepers2026(rows) {
  const pending = document.getElementById('keepers2026-pending');
  const grid = document.getElementById('keepers2026-grid');

  // rows[0] is header: Manager, Player 1, Player 2
  const dataRows = rows.slice(1).filter(r => r[0]);
  const anyPicks = dataRows.some(r => (r[1] && r[1].trim()) || (r[2] && r[2].trim()));

  if (!anyPicks) {
    pending.style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  pending.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = '';

  dataRows.forEach(r => {
    const manager = r[0];
    const players = [r[1], r[2]].filter(p => p && p.trim());
    const card = el('div', { class: 'keeper-card' });
    card.appendChild(el('h4', {}, manager));

    if (players.length) {
      const ul = el('ul');
      players.forEach(p => {
        const cost = computeKeeperCost(p);
        const li = el('li', {}, p + ' \u2014 ' + cost.label);
        li.appendChild(el('span', { class: 'acq-note' }, ' (' + cost.detail + ')'));
        ul.appendChild(li);
      });
      card.appendChild(ul);
    } else {
      card.appendChild(el('div', { class: 'none' }, 'No keepers submitted yet'));
    }
    grid.appendChild(card);
  });
}

function loadKeepers2026() {
  if (!KEEPERS_SHEET_CSV_URL || KEEPERS_SHEET_CSV_URL.indexOf('PASTE_YOUR') === 0) {
    return; // not configured yet, leave the static "pending" screen showing
  }
  fetch(KEEPERS_SHEET_CSV_URL)
    .then(res => res.text())
    .then(text => renderKeepers2026(parseCsv(text)))
    .catch(err => console.error('Failed to load keepers sheet', err));
}

// ---------- Load data ----------
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    renderSeason2026(data.season2026);
    renderRules(data.rules);
    renderHistoryChips(data.history);
    keeperLookup = buildKeeperLookup(data.history);
    loadKeepers2026();
  })
  .catch(err => {
    console.error('Failed to load data.json', err);
    document.getElementById('rules-content').innerHTML =
      '<div class="note-box">Could not load data.json. If you\'re opening this file directly (file://), run a local server instead — e.g. <code>python3 -m http.server</code> — or view it once deployed on GitHub Pages.</div>';
  });
