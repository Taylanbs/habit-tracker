// ═══════════════════════════════════════════════════════
//  app.js — App do paciente
//  Vanilla JS puro — sem import/export — funciona em
//  todos os navegadores (Chrome, Safari, Firefox, Edge)
// ═══════════════════════════════════════════════════════

// ── ⚙️  ÚNICA LINHA QUE VOCÊ PRECISA EDITAR ─────────────
var SCRIPT_URL = 'COLE_AQUI_SUA_URL_DO_APPS_SCRIPT';
// Exemplo:
// var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
// ────────────────────────────────────────────────────────

// ── CONSTANTES ────────────────────────────────────────────
var DEFAULT_HABITS = [
  { id: 'h1',  name: 'Beber 2L de água',                 group: 'Hidratação' },
  { id: 'h2',  name: 'Café da manhã equilibrado',         group: 'Nutrição'   },
  { id: 'h3',  name: 'Almoço com vegetais',               group: 'Nutrição'   },
  { id: 'h4',  name: 'Probiótico / fermentado',           group: 'Intestino'  },
  { id: 'h5',  name: 'Fibras na refeição',                group: 'Intestino'  },
  { id: 'h6',  name: 'Atividade física',                  group: 'Movimento'  },
  { id: 'h7',  name: 'Dormir ≥ 7h',                      group: 'Sono'       },
  { id: 'h8',  name: 'Sem telas 30min antes de dormir',   group: 'Sono'       },
  { id: 'h9',  name: 'Meditação / respiração',            group: 'Mente'      },
  { id: 'h10', name: 'Sem ultraprocessados',              group: 'Nutrição'   },
];

var GROUP_ICONS = {
  'Nutrição': '🥗', 'Hidratação': '💧', 'Movimento': '🏃',
  'Sono': '🌙', 'Mente': '🧠', 'Intestino': '🦠', 'Outros': '✦'
};

var DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── ESTADO ────────────────────────────────────────────────
var currentDateOffset = 0;
var appCharts = {};

// ── STORAGE ───────────────────────────────────────────────
function storageLoad(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}

function storageSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getHabits()     { return storageLoad('habits_list', DEFAULT_HABITS); }
function getChecked(dk)  { return storageLoad('checked_' + dk, []); }
function setChecked(dk, arr) { storageSave('checked_' + dk, arr); }

// ── DATAS ─────────────────────────────────────────────────
function getDateKey(offset) {
  offset = offset || 0;
  var d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function lastNDays(n) {
  var days = [];
  for (var i = 0; i < n; i++) days.push(getDateKey(-i));
  return days;
}

function formatDatePtBR(date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

// ── TOAST ─────────────────────────────────────────────────
var toastTimer = null;
function showToast(msg) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2200);
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var params     = new URLSearchParams(window.location.search);
  var urlCode    = params.get('p');
  var urlName    = params.get('n');
  var savedCode  = storageLoad('patient_code', '');

  // Se a URL tem um código DIFERENTE do salvo → é outra paciente
  // Limpa TUDO do localStorage para não misturar dados
  if (urlCode && urlCode !== savedCode) {
    localStorage.clear();
    storageSave('patient_code', urlCode);
    if (urlName) storageSave('patient_name', decodeURIComponent(urlName));
  } else if (urlCode) {
    // Mesmo código — só atualiza o nome se vier na URL
    storageSave('patient_code', urlCode);
    if (urlName) storageSave('patient_name', decodeURIComponent(urlName));
  }
  // Se não tem código na URL → usa o que está salvo (paciente abrindo de novo sem link)

  var code = storageLoad('patient_code', '');
  var name = storageLoad('patient_name', 'Paciente');

  var elCode = document.getElementById('welcomeCode');
  var elName = document.getElementById('welcomeName');
  var elSub  = document.getElementById('welcomeSub');
  if (elCode) elCode.textContent = code ? '#' + code : '';
  if (elName) elName.textContent = 'Olá, ' + name.split(' ')[0] + ' 👋';
  if (elSub)  elSub.textContent  = formatDatePtBR(new Date());

  // Status da conexão
  var elStatus = document.getElementById('configStatus');
  if (elStatus) {
    var ativo = SCRIPT_URL && SCRIPT_URL.indexOf('COLE_AQUI') === -1;
    elStatus.textContent = ativo ? 'configurado ✓' : 'não configurado — edite js/app.js';
    elStatus.style.color = ativo ? '#5cb85c' : '#e05c5c';
  }

  renderToday();
  renderSettings();
});

// ── NAVEGAÇÃO ─────────────────────────────────────────────
function switchTab(name) {
  var tabs = ['hoje', 'semana', 'configurar'];
  document.querySelectorAll('.tab').forEach(function(t, i) {
    t.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active');
  });
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'semana')     renderWeek();
  if (name === 'configurar') renderSettings();
}

// ── HOJE ──────────────────────────────────────────────────
function renderToday() {
  var dk      = getDateKey(currentDateOffset);
  var d       = new Date();
  d.setDate(d.getDate() + currentDateOffset);

  var habits  = getHabits();
  var checked = getChecked(dk);

  var elMain = document.getElementById('dateMain');
  var elSub  = document.getElementById('dateSub');
  var elNext = document.getElementById('btnNext');
  if (elMain) elMain.textContent = formatDatePtBR(d);
  if (elSub)  elSub.textContent  = dk;
  if (elNext) elNext.disabled    = currentDateOffset >= 0;

  var todayPct = habits.length
    ? Math.round(checked.length / habits.length * 100) : 0;

  var elToday    = document.getElementById('scoreToday');
  var elFill     = document.getElementById('progressFill');
  var elLabel    = document.getElementById('progressLabel');
  if (elToday) elToday.innerHTML = todayPct + '<sup>%</sup>';
  if (elFill)  elFill.style.width = todayPct + '%';
  if (elLabel) elLabel.textContent =
    checked.length + ' de ' + habits.length + ' hábitos concluídos';

  // Média semanal
  var weekDays = lastNDays(7);
  var weekSum  = 0;
  weekDays.forEach(function(dk2) { weekSum += getChecked(dk2).length; });
  var weekAvg = habits.length ? Math.round(weekSum / habits.length / 7 * 100) : 0;

  var elWeek   = document.getElementById('scoreWeek');
  var elStreak = document.getElementById('scoreStreak');
  if (elWeek)   elWeek.innerHTML   = weekAvg + '<sup>%</sup>';
  if (elStreak) elStreak.innerHTML = calcStreak() + '<sup> dias</sup>';

  // Renderiza grupos de hábitos
  var groups = {};
  habits.forEach(function(h) {
    if (!groups[h.group]) groups[h.group] = [];
    groups[h.group].push(h);
  });

  var container = document.getElementById('habitGroups');
  if (!container) return;

  if (!habits.length) {
    container.innerHTML =
      '<div class="empty-state"><div class="emoji">🌱</div>' +
      '<p>Vá em <strong>Hábitos</strong> para adicionar.</p></div>';
    return;
  }

  var html = '';
  Object.keys(groups).forEach(function(group) {
    var items = groups[group];
    html += '<div class="group-title">' +
      '<div class="icon">' + (GROUP_ICONS[group] || '✦') + '</div>' +
      group + '</div>';
    html += '<div class="habits-grid">';
    items.forEach(function(h) {
      var done = checked.indexOf(h.id) > -1;
      html +=
        '<div class="habit-card ' + (done ? 'checked' : '') +
        '" onclick="toggleHabit(\'' + h.id + '\')">' +
        '<div class="check-box">' + (done ? '✓' : '') + '</div>' +
        '<div class="habit-name">' + h.name + '</div>' +
        '<div class="habit-syncing" id="sync_' + h.id + '"></div>' +
        '</div>';
    });
    html += '</div>';
  });
  container.innerHTML = html;
}

function calcStreak() {
  var habits = getHabits();
  var streak = 0;
  for (var i = 0; i <= 365; i++) {
    var dk = getDateKey(-i);
    var c  = getChecked(dk);
    if (habits.length > 0 && c.length >= habits.length * 0.5) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function toggleHabit(hid) {
  var dk      = getDateKey(currentDateOffset);
  var checked = getChecked(dk);
  var idx     = checked.indexOf(hid);
  if (idx > -1) checked.splice(idx, 1);
  else          checked.push(hid);
  setChecked(dk, checked);
  renderToday();
  var habit = getHabits().filter(function(h) { return h.id === hid; })[0];
  if (habit) syncHabit(hid, habit, dk, checked.indexOf(hid) > -1);
}

function changeDay(delta) {
  currentDateOffset = Math.min(0, currentDateOffset + delta);
  renderToday();
}

// ── SYNC GOOGLE SHEETS ────────────────────────────────────
function syncHabit(hid, habit, date, checked) {
  if (!SCRIPT_URL || SCRIPT_URL.indexOf('COLE_AQUI') > -1) return;

  var el = document.getElementById('sync_' + hid);
  if (el) el.textContent = '↑';
  setSyncStatus('syncing', 'Sincronizando…');

  var payload = JSON.stringify({
    patientCode: storageLoad('patient_code', 'SEM_CODIGO'),
    patientName: storageLoad('patient_name', 'Paciente'),
    date:        date,
    habitId:     hid,
    habitName:   habit.name,
    habitGroup:  habit.group,
    checked:     checked,
    timestamp:   new Date().toISOString()
  });

  // Usa XMLHttpRequest — funciona em TODOS os navegadores
  var xhr = new XMLHttpRequest();
  xhr.open('POST', SCRIPT_URL, true);
  xhr.setRequestHeader('Content-Type', 'text/plain'); // text/plain evita preflight CORS
  xhr.onload = function() {
    if (el) el.textContent = '';
    setSyncStatus('ok', 'Salvo ✓');
    setTimeout(function() { setSyncStatus('', ''); }, 3000);
  };
  xhr.onerror = function() {
    if (el) el.textContent = '⚠';
    setSyncStatus('err', 'Erro de conexão');
  };
  xhr.send(payload);
}

function setSyncStatus(state, label) {
  var dot = document.getElementById('syncDot');
  if (!dot) return;
  dot.className = 'sync-dot' + (state ? ' ' + state : '');
  var lbl = document.getElementById('syncLabel');
  if (lbl) lbl.textContent = label;
}

// ── SEMANA ────────────────────────────────────────────────
function renderWeek() {
  var habits = getHabits();
  var last7  = lastNDays(7).reverse();
  var labels = last7.map(function(d) {
    return DAY_NAMES[new Date(d + 'T12:00:00').getDay()];
  });
  var data = last7.map(function(d) {
    return habits.length
      ? Math.round(getChecked(d).length / habits.length * 100) : 0;
  });

  var wg = document.getElementById('weekGrid');
  if (wg) {
    var wgHtml = '';
    last7.forEach(function(d, i) {
      var pct   = data[i];
      var cls   = pct === 100 ? 'full' : pct >= 70 ? 'good' : '';
      var today = i === last7.length - 1 ? 'today' : '';
      wgHtml +=
        '<div class="week-day ' + cls + ' ' + today + '">' +
        '<div class="wd-label">' + labels[i] + '</div>' +
        '<div class="wd-pct">' + pct + '%</div></div>';
    });
    wg.innerHTML = wgHtml;
  }

  makeAppChart('weekChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: data.map(function(v) {
          return v >= 80 ? 'rgba(58,173,171,0.85)'
               : v >= 50 ? 'rgba(181,216,193,0.8)'
               :            'rgba(242,220,109,0.7)';
        }),
        borderRadius: 8, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min:0, max:100,
          ticks: { callback: function(v){return v+'%';},
            font:{family:'DM Sans',size:11}, color:'#6b8583' },
          grid: { color:'rgba(58,173,171,0.07)' } },
        x: { ticks:{font:{family:'DM Sans',size:11},color:'#6b8583'},
          grid:{display:false} }
      }
    }
  });

  var habitData = habits.map(function(h) {
    var count = last7.filter(function(d) {
      return getChecked(d).indexOf(h.id) > -1;
    }).length;
    return {
      name: h.name.length > 18 ? h.name.slice(0,16)+'…' : h.name,
      pct:  Math.round(count / 7 * 100)
    };
  });

  makeAppChart('habitChart', {
    type: 'bar',
    data: {
      labels: habitData.map(function(h){return h.name;}),
      datasets: [{
        data: habitData.map(function(h){return h.pct;}),
        backgroundColor: 'rgba(58,173,171,0.7)',
        borderRadius: 6, borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min:0, max:100,
          ticks:{callback:function(v){return v+'%';},
            font:{family:'DM Sans',size:11},color:'#6b8583'},
          grid:{color:'rgba(58,173,171,0.07)'} },
        x: { ticks:{font:{family:'DM Sans',size:11},color:'#6b8583'},
          grid:{display:false} }
      }
    }
  });
}

function makeAppChart(id, config) {
  if (appCharts[id]) { appCharts[id].destroy(); }
  var ctx = document.getElementById(id);
  if (!ctx) return;
  appCharts[id] = new Chart(ctx.getContext('2d'), config);
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────
function renderSettings() {
  var habits = getHabits();
  var el     = document.getElementById('habitsList');
  if (!el) return;

  if (!habits.length) {
    el.innerHTML =
      '<div class="empty-state"><div class="emoji">🌱</div>' +
      '<p>Nenhum hábito ainda.</p></div>';
    return;
  }

  var html = '';
  habits.forEach(function(h) {
    html +=
      '<div class="habit-list-item">' +
      '<div class="hli-dot"></div>' +
      '<div class="hli-name">' + h.name + '</div>' +
      '<div class="hli-group">' + (GROUP_ICONS[h.group]||'') + ' ' + h.group + '</div>' +
      '<button class="btn-del" onclick="deleteHabit(\'' + h.id + '\')" title="Remover">×</button>' +
      '</div>';
  });
  el.innerHTML = html;
}

function addHabit() {
  var name  = document.getElementById('newHabitName').value.trim();
  var group = document.getElementById('newHabitGroup').value;
  if (!name) { showToast('Digite o nome do hábito'); return; }
  var habits = getHabits();
  habits.push({ id: 'h' + Date.now(), name: name, group: group });
  storageSave('habits_list', habits);
  document.getElementById('newHabitName').value = '';
  renderSettings();
  renderToday();
  showToast('Hábito adicionado ✓');
}

function deleteHabit(hid) {
  if (!confirm('Remover este hábito?')) return;
  var habits = getHabits().filter(function(h){ return h.id !== hid; });
  storageSave('habits_list', habits);
  renderSettings();
  renderToday();
}

// ── TESTE DE CONEXÃO (chamado pelo botão na aba Hábitos) ──────────
function testarConexao() {
  if (!SCRIPT_URL || SCRIPT_URL.indexOf('COLE_AQUI') > -1) {
    alert('URL do Apps Script não configurada em js/app.js');
    return;
  }

  var btn = document.getElementById('btnTestar');
  if (btn) btn.textContent = 'Testando…';

  var payload = JSON.stringify({
    patientCode: storageLoad('patient_code', 'TESTE'),
    patientName: storageLoad('patient_name', 'Teste de Conexão'),
    date:        getDateKey(0),
    habitId:     'teste',
    habitName:   'Teste de Conexão',
    habitGroup:  'Outros',
    checked:     true,
    timestamp:   new Date().toISOString()
  });

  var xhr = new XMLHttpRequest();
  xhr.open('POST', SCRIPT_URL, true);
  xhr.setRequestHeader('Content-Type', 'text/plain');
  xhr.onload = function() {
    if (btn) btn.textContent = 'Testar conexão';
    alert('✓ Enviado com sucesso!\n\nVerifique agora se apareceu uma linha na sua planilha do Google Sheets.\n\nSe aparecer: está tudo funcionando.\nSe não aparecer: o problema está no Apps Script — reimplante.');
  };
  xhr.onerror = function() {
    if (btn) btn.textContent = 'Testar conexão';
    alert('✗ Erro de conexão.\n\nVerifique:\n1. A URL em js/app.js está correta?\n2. O script foi implantado como "App da Web"?\n3. O acesso está como "Qualquer pessoa"?');
  };
  xhr.send(payload);
}
