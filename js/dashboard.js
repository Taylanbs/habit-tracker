// ═══════════════════════════════════════════════════════
//  dashboard.js — Lógica do painel da nutricionista
// ═══════════════════════════════════════════════════════

import {
  load, save, dateKey, lastNDays, formatDate,
  showToast, makeChart, COLORS, CHART_DEFAULTS,
  pctScaleOptions, labelScaleOptions, DAY_NAMES,
} from './utils.js';

// ── ESTADO ────────────────────────────────────────────────
const SCRIPT_KEY = 'dash_script_url';
let allData         = {};   // { [patientCode]: Record[] }
let patients        = [];   // { code, name, since }[]
let selectedPatient = null;
const charts        = {};

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const url = localStorage.getItem(SCRIPT_KEY) || '';
  if (url) {
    document.getElementById('scriptUrlDash').value = url;
    setStatus('loading', 'Carregando…');
    loadAllData();
  }
});

window.saveScriptUrl = function () {
  localStorage.setItem(SCRIPT_KEY, document.getElementById('scriptUrlDash').value.trim());
};

// ── STATUS ────────────────────────────────────────────────
function setStatus(state, label) {
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot' + (state ? ' ' + state : '');
  document.getElementById('statusLabel').textContent = label;
}

// ── NAVEGAÇÃO ─────────────────────────────────────────────
window.showPage = function (name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  event.currentTarget.classList.add('active');

  const titles = {
    pacientes:  'Todos os pacientes',
    individual: 'Análise individual',
    habitos:    'Por hábito',
  };
  document.getElementById('topbarTitle').textContent = titles[name] || '';

  if (name === 'habitos')    renderHabitsPage();
  if (name === 'individual') renderPatientChips();
};

// ── CARREGAMENTO DE DADOS ─────────────────────────────────
window.loadAllData = async function () {
  const url = document.getElementById('scriptUrlDash').value.trim();
  if (!url) { setStatus('err', 'URL não configurada'); return; }
  localStorage.setItem(SCRIPT_KEY, url);
  setStatus('loading', 'Carregando…');

  try {
    const res = await fetch(`${url}?action=patients`);
    patients  = await res.json();

    if (!Array.isArray(patients) || patients.length === 0) {
      setStatus('ok', 'Nenhum paciente ainda');
      renderPatientsPage();
      return;
    }

    allData = {};
    for (const p of patients) {
      const r = await fetch(`${url}?action=patient&code=${p.code}`);
      allData[p.code] = await r.json();
    }

    setStatus('ok', `${patients.length} paciente${patients.length > 1 ? 's' : ''} · atualizado agora`);
    renderPatientsPage();
    renderPatientChips();
  } catch (err) {
    setStatus('err', 'Erro ao carregar dados');
    console.error(err);
  }
};

// ── HELPERS ───────────────────────────────────────────────
const getRecords = (code) => allData[code] || [];

/** Constrói matriz { [date]: { [habitId]: boolean } } */
function buildMatrix(records) {
  return records.reduce((m, r) => {
    if (!m[r.date]) m[r.date] = {};
    m[r.date][r.habitId] = r.checked;
    return m;
  }, {});
}

function getPatientHabits(records) {
  const map = {};
  records.forEach(r => { map[r.habitId] = { id: r.habitId, name: r.habitName, group: r.group }; });
  return Object.values(map);
}

function dayPct(matrix, date, hids) {
  if (!hids.length) return 0;
  const day  = matrix[date] || {};
  const done = hids.filter(id => day[id]).length;
  return Math.round(done / hids.length * 100);
}

function avgPct(matrix, dates, hids) {
  if (!dates.length || !hids.length) return 0;
  return Math.round(dates.reduce((s, d) => s + dayPct(matrix, d, hids), 0) / dates.length);
}

function calcStreak(matrix, hids) {
  let s = 0;
  for (let i = 0; i <= 365; i++) {
    const dk   = dateKey(-i);
    const day  = matrix[dk] || {};
    const done = hids.filter(id => day[id]).length;
    if (hids.length > 0 && done >= hids.length * 0.5) s++;
    else if (i > 0) break;
  }
  return s;
}

// ── PÁGINA: PACIENTES ─────────────────────────────────────
function renderPatientsPage() {
  const today  = dateKey(0);
  const last7  = lastNDays(7);
  const last30 = lastNDays(30);

  const kpiData = patients.map(p => {
    const records = getRecords(p.code);
    const matrix  = buildMatrix(records);
    const hids    = getPatientHabits(records).map(h => h.id);
    if (!hids.length) return null;
    return {
      today: dayPct(matrix, today, hids),
      w7:    avgPct(matrix, last7,  hids),
      w30:   avgPct(matrix, last30, hids),
      streak: calcStreak(matrix, hids),
    };
  }).filter(Boolean);

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const maxStreak = kpiData.length ? Math.max(...kpiData.map(k => k.streak)) : 0;

  document.getElementById('kpiRowGlobal').innerHTML = `
    <div class="kpi-dash k1"><div class="kpi-icon">📅</div><div class="kpi-label">Adesão hoje (média)</div>
      <div class="kpi-value">${avg(kpiData.map(k => k.today))}<sup>%</sup></div>
      <div class="kpi-delta">${patients.length} paciente${patients.length > 1 ? 's' : ''} ativos</div></div>
    <div class="kpi-dash k2"><div class="kpi-icon">📆</div><div class="kpi-label">Média 7 dias</div>
      <div class="kpi-value">${avg(kpiData.map(k => k.w7))}<sup>%</sup></div></div>
    <div class="kpi-dash k3"><div class="kpi-icon">📊</div><div class="kpi-label">Média 30 dias</div>
      <div class="kpi-value">${avg(kpiData.map(k => k.w30))}<sup>%</sup></div></div>
    <div class="kpi-dash k4"><div class="kpi-icon">🔥</div><div class="kpi-label">Maior sequência</div>
      <div class="kpi-value">${maxStreak}<sup> dias</sup></div></div>
  `;

  // Linha de 30 dias
  const globalLabels = [...last30].reverse().map((d, i) =>
    i % 5 === 0 ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : ''
  );
  const globalData = [...last30].reverse().map(d => {
    const scores = patients.map(p => {
      const r    = getRecords(p.code);
      const m    = buildMatrix(r);
      const hids = getPatientHabits(r).map(h => h.id);
      return hids.length ? dayPct(m, d, hids) : null;
    }).filter(v => v !== null);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  });

  makeChart(charts, 'globalChart', {
    type: 'line',
    data: {
      labels: globalLabels,
      datasets: [{ label: 'Adesão média (%)', data: globalData,
        borderColor: COLORS.teal, backgroundColor: COLORS.tealA,
        borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 0 }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: pctScaleOptions(), x: labelScaleOptions() } },
  });

  // Donut categorias
  const groupMap = {};
  patients.forEach(p => {
    getRecords(p.code).forEach(r => {
      if (!groupMap[r.group]) groupMap[r.group] = { sum: 0, count: 0 };
      groupMap[r.group].count++;
      if (r.checked) groupMap[r.group].sum++;
    });
  });
  const catLabels = Object.keys(groupMap);
  const catData   = catLabels.map(g => groupMap[g].count ? Math.round(groupMap[g].sum / groupMap[g].count * 100) : 0);

  makeChart(charts, 'categoryChart', {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: COLORS.palette, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { family: 'DM Sans', size: 11 }, color: '#6b8583', boxWidth: 12, padding: 12 } } } },
  });

  // Cards de pacientes
  document.getElementById('patientCount').textContent =
    `${patients.length} ativo${patients.length !== 1 ? 's' : ''}`;

  const list = document.getElementById('patientList');
  if (!patients.length) {
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="emoji">🌿</div><p>Nenhum paciente ainda.</p></div>`;
    return;
  }

  list.innerHTML = patients.map(p => {
    const records = getRecords(p.code);
    const matrix  = buildMatrix(records);
    const hids    = getPatientHabits(records).map(h => h.id);
    const w7      = avgPct(matrix, last7, hids);
    const w30     = avgPct(matrix, last30, hids);
    return `
      <div class="patient-card" onclick="openPatient('${p.code}')">
        <div class="pc-code">#${p.code} · desde ${p.since || '—'}</div>
        <div class="pc-name">${p.name}</div>
        <div class="pc-stats">
          <div class="pc-stat">7 dias: <strong>${w7}%</strong></div>
          <div class="pc-stat">30 dias: <strong>${w30}%</strong></div>
        </div>
        <div class="pc-bar"><div class="pc-fill" style="width:${w7}%"></div></div>
      </div>`;
  }).join('');
}

// ── PÁGINA: INDIVIDUAL ────────────────────────────────────
function renderPatientChips() {
  const chips = document.getElementById('patientChips');
  if (!patients.length) {
    chips.innerHTML = `<span class="no-patients">Carregue os dados primeiro</span>`;
    return;
  }
  chips.innerHTML = patients.map(p => `
    <div class="chip ${selectedPatient === p.code ? 'active' : ''}" onclick="openPatient('${p.code}')">${p.name}</div>
  `).join('');
}

window.openPatient = function (code) {
  selectedPatient = code;

  // Muda para a aba individual
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n, i) => n.classList.toggle('active', i === 1));
  document.getElementById('page-individual').classList.add('active');
  document.getElementById('topbarTitle').textContent = 'Análise individual';

  const records = getRecords(code);
  const matrix  = buildMatrix(records);
  const habits  = getPatientHabits(records);
  const hids    = habits.map(h => h.id);

  const today  = dateKey(0);
  const last7  = lastNDays(7);
  const last30 = lastNDays(30);

  document.getElementById('indToday').innerHTML  = `${dayPct(matrix, today, hids)}<sup>%</sup>`;
  document.getElementById('ind7d').innerHTML     = `${avgPct(matrix, last7, hids)}<sup>%</sup>`;
  document.getElementById('ind30d').innerHTML    = `${avgPct(matrix, last30, hids)}<sup>%</sup>`;
  document.getElementById('indStreak').innerHTML = `${calcStreak(matrix, hids)}<sup> dias</sup>`;

  renderPatientChips();

  // Linha histórica 30 dias
  const hist = [...last30].reverse();
  makeChart(charts, 'indHistChart', {
    type: 'line',
    data: {
      labels: hist.map((d, i) =>
        i % 5 === 0 ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : ''
      ),
      datasets: [{
        label: '%', data: hist.map(d => dayPct(matrix, d, hids)),
        borderColor: COLORS.teal, backgroundColor: COLORS.tealA,
        borderWidth: 2.5, tension: 0.4, fill: true,
        pointRadius: 3, pointBackgroundColor: COLORS.teal,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: pctScaleOptions(), x: labelScaleOptions() } },
  });

  // Barra semanal
  const week7 = [...last7].reverse();
  makeChart(charts, 'indWeekChart', {
    type: 'bar',
    data: {
      labels: week7.map(d => DAY_NAMES[new Date(d + 'T12:00:00').getDay()]),
      datasets: [{
        data: week7.map(d => dayPct(matrix, d, hids)),
        backgroundColor: week7.map(d =>
          dayPct(matrix, d, hids) >= 80 ? 'rgba(58,173,171,0.85)' : 'rgba(181,216,193,0.75)'
        ),
        borderRadius: 8, borderSkipped: false,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: pctScaleOptions(), x: labelScaleOptions() } },
  });

  // Heatmap
  const hmH = document.getElementById('hmHeader');
  hmH.innerHTML = DAY_NAMES.map(d => `<div class="hm-lbl">${d}</div>`).join('');
  const hm = document.getElementById('heatmap');
  hm.innerHTML  = '';
  const todayD  = new Date();
  const pad     = todayD.getDay();

  for (let p = 0; p < pad; p++) {
    const fd = new Date(todayD); fd.setDate(todayD.getDate() - pad + p);
    const dk = fd.toISOString().slice(0, 10);
    const pct = dayPct(matrix, dk, hids);
    const lvl = pct === 0 ? 0 : pct < 40 ? 25 : pct < 70 ? 50 : pct < 100 ? 75 : 100;
    hm.innerHTML += `<div class="hm-cell" data-pct="${lvl}" data-tip="${dk}: ${pct}%"></div>`;
  }
  for (let i = 27; i >= 0; i--) {
    const d2  = new Date(todayD); d2.setDate(todayD.getDate() - i);
    const dk  = d2.toISOString().slice(0, 10);
    const pct = dayPct(matrix, dk, hids);
    const lvl = pct === 0 ? 0 : pct < 40 ? 25 : pct < 70 ? 50 : pct < 100 ? 75 : 100;
    const outline = i === 0 ? 'style="outline:2px solid var(--teal);outline-offset:2px;"' : '';
    hm.innerHTML += `<div class="hm-cell" data-pct="${lvl}" data-tip="${dk}: ${pct}%" ${outline}></div>`;
  }

  // Tabela de hábitos
  const habitStats = habits
    .map(h => ({
      ...h,
      pct: Math.round(last30.filter(d => (matrix[d] || {})[h.id]).length / 30 * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  document.getElementById('indHabitTable').innerHTML = `
    <tr><th>Hábito</th><th>Categoria</th><th>Adesão 30d</th></tr>
    ${habitStats.map(h => `
      <tr>
        <td>${h.name}</td>
        <td style="color:var(--text-muted)">${h.group}</td>
        <td><div class="bar-cell">
          <div class="mini-bar"><div class="mini-fill" style="width:${h.pct}%"></div></div>
          <div class="pct-text">${h.pct}%</div>
        </div></td>
      </tr>`).join('')}
  `;
};

// ── PÁGINA: HÁBITOS ───────────────────────────────────────
function renderHabitsPage() {
  const last30   = lastNDays(30);
  const habitMap = {};

  patients.forEach(p => {
    getRecords(p.code).forEach(r => {
      if (!habitMap[r.habitId])
        habitMap[r.habitId] = { name: r.habitName, group: r.group, done: 0, total: 0 };
      habitMap[r.habitId].total++;
      if (r.checked) habitMap[r.habitId].done++;
    });
  });

  const habits = Object.values(habitMap).sort((a, b) =>
    (b.done / b.total || 0) - (a.done / a.total || 0)
  );
  const pcts = habits.map(h => Math.round(h.done / h.total * 100));

  makeChart(charts, 'allHabitsChart', {
    type: 'bar',
    data: {
      labels: habits.map(h => h.name.length > 22 ? h.name.slice(0, 20) + '…' : h.name),
      datasets: [{
        data: pcts,
        backgroundColor: pcts.map(v =>
          v >= 80 ? 'rgba(58,173,171,0.85)' :
          v >= 50 ? 'rgba(181,216,193,0.8)' :
                    'rgba(242,220,109,0.7)'
        ),
        borderRadius: 6, borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: pctScaleOptions('x'), y: labelScaleOptions() },
    },
  });

  document.getElementById('allHabitsTable').innerHTML = `
    <tr><th>#</th><th>Hábito</th><th>Categoria</th><th>Adesão média</th></tr>
    ${habits.map((h, i) => `
      <tr>
        <td style="color:var(--text-muted);font-family:'Cormorant Garamond',serif;font-size:18px">${i + 1}</td>
        <td>${h.name}</td>
        <td style="color:var(--text-muted)">${h.group}</td>
        <td><div class="bar-cell">
          <div class="mini-bar"><div class="mini-fill" style="width:${pcts[i]}%"></div></div>
          <div class="pct-text">${pcts[i]}%</div>
        </div></td>
      </tr>`).join('')}
  `;
}
