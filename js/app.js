// ═══════════════════════════════════════════════════════
//  app.js — Lógica do app do paciente (index.html)
// ═══════════════════════════════════════════════════════

import {
  load, save, dateKey, lastNDays, formatDate,
  showToast, makeChart, COLORS, CHART_DEFAULTS,
  pctScaleOptions, labelScaleOptions,
  GROUP_ICONS, DAY_NAMES, DEFAULT_HABITS,
} from './utils.js';

// ── ⚙️  ÚNICA LINHA QUE VOCÊ PRECISA EDITAR ──────────────
//  Cole aqui a URL do seu Google Apps Script
const SCRIPT_URL = 'COLE_AQUI_SUA_URL_DO_APPS_SCRIPT';
// Exemplo:
// const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
// ─────────────────────────────────────────────────────────

// ── ESTADO ────────────────────────────────────────────────
let currentDateOffset = 0;
const charts = {};

// ── STORAGE HELPERS ───────────────────────────────────────
const getHabits  = () => load('habits_list', DEFAULT_HABITS);
const getChecked = (dk) => load('checked_' + dk, []);
const setChecked = (dk, arr) => save('checked_' + dk, arr);

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Lê parâmetros da URL: ?p=CODIGO&n=Nome
  const params = new URLSearchParams(window.location.search);
  if (params.get('p')) save('patient_code', params.get('p'));
  if (params.get('n')) save('patient_name', decodeURIComponent(params.get('n')));

  const code = load('patient_code', '');
  const name = load('patient_name', 'Paciente');

  // Preenche o cabeçalho de boas-vindas
  const elCode = document.getElementById('welcomeCode');
  const elName = document.getElementById('welcomeName');
  const elSub  = document.getElementById('welcomeSub');
  if (elCode) elCode.textContent = code ? `#${code}` : '';
  if (elName) elName.textContent = `Olá, ${name.split(' ')[0]} 👋`;
  if (elSub)  elSub.textContent  = formatDate(new Date());

  // Mostra status do script na aba Configurar
  const elStatus = document.getElementById('configStatus');
  if (elStatus) {
    const ativo = SCRIPT_URL && !SCRIPT_URL.includes('COLE_AQUI');
    elStatus.textContent = ativo ? 'configurado ✓' : 'não configurado';
    elStatus.style.color = ativo ? '#5cb85c' : '#e05c5c';
  }

  renderToday();
  renderSettings();
});

// ── NAVEGAÇÃO DE ABAS ─────────────────────────────────────
window.switchTab = function (name) {
  document.querySelectorAll('.tab').forEach((t, i) =>
    t.classList.toggle('active', ['hoje', 'semana', 'configurar'][i] === name)
  );
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'semana')     renderWeek();
  if (name === 'configurar') renderSettings();
};

// ── HOJE ──────────────────────────────────────────────────
function renderToday() {
  const dk      = dateKey(currentDateOffset);
  const d       = new Date();
  d.setDate(d.getDate() + currentDateOffset);

  const habits  = getHabits();
  const checked = getChecked(dk);

  document.getElementById('dateMain').textContent      = formatDate(d);
  document.getElementById('dateSub').textContent       = dk;
  document.getElementById('btnNext').disabled          = currentDateOffset >= 0;

  // KPIs
  const todayPct = habits.length
    ? Math.round(checked.length / habits.length * 100)
    : 0;

  document.getElementById('scoreToday').innerHTML        = `${todayPct}<sup>%</sup>`;
  document.getElementById('progressFill').style.width    = todayPct + '%';
  document.getElementById('progressLabel').textContent   =
    `${checked.length} de ${habits.length} hábitos concluídos`;

  const weekDays = lastNDays(7);
  const weekAvg  = habits.length
    ? Math.round(
        weekDays.reduce((s, dk2) => s + getChecked(dk2).length, 0)
        / habits.length / 7 * 100
      )
    : 0;
  document.getElementById('scoreWeek').innerHTML   = `${weekAvg}<sup>%</sup>`;
  document.getElementById('scoreStreak').innerHTML = `${calcStreakGlobal()}<sup> dias</sup>`;

  // Grupos de hábitos
  const groups = {};
  habits.forEach(h => {
    if (!groups[h.group]) groups[h.group] = [];
    groups[h.group].push(h);
  });

  const container = document.getElementById('habitGroups');
  if (!container) return;

  if (!habits.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🌱</div>
        <p>Vá em <strong>Configurar</strong> para adicionar hábitos.</p>
      </div>`;
    return;
  }

  container.innerHTML = Object.entries(groups).map(([group, items]) => `
    <div class="group-title">
      <div class="icon">${GROUP_ICONS[group] || '✦'}</div>
      ${group}
    </div>
    <div class="habits-grid">
      ${items.map(h => {
        const done = checked.includes(h.id);
        return `
          <div class="habit-card ${done ? 'checked' : ''}" onclick="toggleHabit('${h.id}')">
            <div class="check-box">${done ? '✓' : ''}</div>
            <div class="habit-name">${h.name}</div>
            <div class="habit-syncing" id="sync_${h.id}"></div>
          </div>`;
      }).join('')}
    </div>
  `).join('');
}

function calcStreakGlobal() {
  const habits = getHabits();
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const dk = dateKey(-i);
    const c  = getChecked(dk);
    if (habits.length > 0 && c.length >= habits.length * 0.5) streak++;
    else if (i > 0) break;
  }
  return streak;
}

window.toggleHabit = function (hid) {
  const dk      = dateKey(currentDateOffset);
  const checked = getChecked(dk);
  const idx     = checked.indexOf(hid);

  if (idx > -1) checked.splice(idx, 1);
  else          checked.push(hid);

  setChecked(dk, checked);
  renderToday();

  const habit = getHabits().find(h => h.id === hid);
  if (habit) syncHabit(hid, habit, dk, checked.includes(hid));
};

window.changeDay = function (delta) {
  currentDateOffset = Math.min(0, currentDateOffset + delta);
  renderToday();
};

// ── SYNC GOOGLE SHEETS ────────────────────────────────────
function syncHabit(hid, habit, date, checked) {
  // Usa a URL fixa — não depende de localStorage nem de campo no app
  const url = SCRIPT_URL;

  if (!url || url.includes('COLE_AQUI')) {
    console.warn('URL do Apps Script não configurada em app.js');
    return;
  }

  const el = document.getElementById('sync_' + hid);
  if (el) el.textContent = '↑';
  setSyncStatus('syncing', 'Sincronizando…');

  const payload = {
    patientCode: load('patient_code', 'SEM_CODIGO'),
    patientName: load('patient_name', 'Paciente'),
    date,
    habitId:    hid,
    habitName:  habit.name,
    habitGroup: habit.group,
    checked,
    timestamp:  new Date().toISOString(),
  };

  fetch(url, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(() => {
      if (el) el.textContent = '';
      setSyncStatus('ok', 'Salvo ✓');
      setTimeout(() => setSyncStatus('', ''), 3000);
    })
    .catch(() => {
      if (el) el.textContent = '⚠';
      setSyncStatus('err', 'Erro de conexão');
    });
}

function setSyncStatus(state, label) {
  const dot = document.getElementById('syncDot');
  if (!dot) return;
  dot.className = 'sync-dot' + (state ? ' ' + state : '');
  document.getElementById('syncLabel').textContent = label;
}

// ── SEMANA ────────────────────────────────────────────────
function renderWeek() {
  const habits = getHabits();
  const last7  = lastNDays(7).reverse();
  const labels = last7.map(d => DAY_NAMES[new Date(d + 'T12:00:00').getDay()]);
  const data   = last7.map(d =>
    habits.length ? Math.round(getChecked(d).length / habits.length * 100) : 0
  );

  // Mini grid
  const wg = document.getElementById('weekGrid');
  if (wg) {
    wg.innerHTML = last7.map((d, i) => {
      const pct   = data[i];
      const cls   = pct === 100 ? 'full' : pct >= 70 ? 'good' : '';
      const today = i === last7.length - 1 ? 'today' : '';
      return `
        <div class="week-day ${cls} ${today}">
          <div class="wd-label">${labels[i]}</div>
          <div class="wd-pct">${pct}%</div>
        </div>`;
    }).join('');
  }

  makeChart(charts, 'weekChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v =>
          v >= 80 ? 'rgba(58,173,171,0.85)' :
          v >= 50 ? 'rgba(181,216,193,0.8)' :
                    'rgba(242,220,109,0.7)'
        ),
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: pctScaleOptions(), x: labelScaleOptions() },
    },
  });

  const habitData = habits.map(h => {
    const count = last7.filter(d => getChecked(d).includes(h.id)).length;
    return {
      name: h.name.length > 18 ? h.name.slice(0, 16) + '…' : h.name,
      pct:  Math.round(count / 7 * 100),
    };
  });

  makeChart(charts, 'habitChart', {
    type: 'bar',
    data: {
      labels: habitData.map(h => h.name),
      datasets: [{
        data:            habitData.map(h => h.pct),
        backgroundColor: 'rgba(58,173,171,0.7)',
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: pctScaleOptions('x'), y: labelScaleOptions() },
    },
  });
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────
function renderSettings() {
  const habits = getHabits();
  const el     = document.getElementById('habitsList');
  if (!el) return;

  el.innerHTML = habits.length
    ? habits.map(h => `
        <div class="habit-list-item">
          <div class="hli-dot"></div>
          <div class="hli-name">${h.name}</div>
          <div class="hli-group">${GROUP_ICONS[h.group] || ''} ${h.group}</div>
          <button class="btn-del" onclick="deleteHabit('${h.id}')" title="Remover">×</button>
        </div>`).join('')
    : `<div class="empty-state"><div class="emoji">🌱</div><p>Nenhum hábito ainda.</p></div>`;
}

window.addHabit = function () {
  const name  = document.getElementById('newHabitName').value.trim();
  const group = document.getElementById('newHabitGroup').value;
  if (!name) { showToast('Digite o nome do hábito'); return; }

  const habits = getHabits();
  habits.push({ id: 'h' + Date.now(), name, group });
  save('habits_list', habits);
  document.getElementById('newHabitName').value = '';
  renderSettings();
  renderToday();
  showToast('Hábito adicionado ✓');
};

window.deleteHabit = function (hid) {
  if (!confirm('Remover este hábito?')) return;
  save('habits_list', getHabits().filter(h => h.id !== hid));
  renderSettings();
  renderToday();
};
