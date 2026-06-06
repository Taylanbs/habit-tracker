// ═══════════════════════════════════════════════════════
//  dashboard.js — Painel da nutricionista
//  Vanilla JS puro — sem import/export
// ═══════════════════════════════════════════════════════

var DASH_SCRIPT_KEY = 'dash_script_url';
var allData         = {};
var patients        = [];
var selectedPatient = null;
var dashCharts      = {};
var DAY_NAMES_DASH  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var PALETTE = [
  'rgba(58,173,171,0.8)','rgba(181,216,193,0.8)',
  'rgba(242,220,109,0.8)','rgba(242,160,61,0.8)',
  'rgba(58,173,171,0.5)','rgba(181,216,193,0.5)'
];

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem(DASH_SCRIPT_KEY) || '';
  if (saved) {
    document.getElementById('scriptUrlDash').value = saved;
    setStatus('loading', 'Carregando…');
    loadAllData();
  }
});

function saveDashUrl() {
  var url = document.getElementById('scriptUrlDash').value.trim();
  localStorage.setItem(DASH_SCRIPT_KEY, url);
}

// ── STATUS ────────────────────────────────────────────────
function setStatus(state, label) {
  var dot = document.getElementById('statusDot');
  if (dot) dot.className = 'status-dot' + (state ? ' ' + state : '');
  var lbl = document.getElementById('statusLabel');
  if (lbl) lbl.textContent = label;
}

// ── NAVEGAÇÃO ─────────────────────────────────────────────
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
  var titles = { pacientes:'Todos os pacientes', individual:'Análise individual', habitos:'Por hábito' };
  var tt = document.getElementById('topbarTitle');
  if (tt) tt.textContent = titles[name] || '';
  if (name === 'habitos')    renderHabitsPage();
  if (name === 'individual') renderPatientChips();
}

// ── CARREGAR DADOS ────────────────────────────────────────
function loadAllData() {
  var url = (document.getElementById('scriptUrlDash').value || '').trim();
  if (!url) { setStatus('err', 'URL não configurada'); return; }
  localStorage.setItem(DASH_SCRIPT_KEY, url);
  setStatus('loading', 'Carregando…');

  // Busca lista de pacientes
  fetchJSON(url + '?action=patients', function(err, pats) {
    if (err || !Array.isArray(pats)) {
      setStatus('err', 'Erro ao carregar — verifique a URL');
      return;
    }
    patients = pats;
    if (!patients.length) {
      setStatus('ok', 'Nenhum paciente ainda');
      renderPatientsPage();
      return;
    }

    // Carrega dados de cada paciente sequencialmente
    allData = {};
    var idx = 0;
    function loadNext() {
      if (idx >= patients.length) {
        setStatus('ok', patients.length + ' paciente' + (patients.length > 1 ? 's' : '') + ' · atualizado agora');
        renderPatientsPage();
        renderPatientChips();
        return;
      }
      var p = patients[idx++];
      fetchJSON(url + '?action=patient&code=' + p.code, function(err2, records) {
        allData[p.code] = err2 ? [] : records;
        loadNext();
      });
    }
    loadNext();
  });
}

// XMLHttpRequest com JSONP fallback para contornar CORS
function fetchJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    try {
      var data = JSON.parse(xhr.responseText);
      callback(null, data);
    } catch(e) {
      callback(e, null);
    }
  };
  xhr.onerror = function() { callback(new Error('network error'), null); };
  xhr.send();
}

// ── HELPERS ───────────────────────────────────────────────
function getDateKey(offset) {
  var d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return d.toISOString().slice(0, 10);
}

function lastNDays(n) {
  var days = [];
  for (var i = 0; i < n; i++) days.push(getDateKey(-i));
  return days;
}

function buildMatrix(records) {
  var m = {};
  records.forEach(function(r) {
    if (!m[r.date]) m[r.date] = {};
    m[r.date][r.habitId] = r.checked;
  });
  return m;
}

function getPatientHabits(records) {
  var map = {};
  records.forEach(function(r) {
    map[r.habitId] = { id: r.habitId, name: r.habitName, group: r.group };
  });
  return Object.values(map);
}

function dayPct(matrix, date, hids) {
  if (!hids.length) return 0;
  var day  = matrix[date] || {};
  var done = hids.filter(function(id) { return day[id]; }).length;
  return Math.round(done / hids.length * 100);
}

function avgPct(matrix, dates, hids) {
  if (!dates.length || !hids.length) return 0;
  var sum = dates.reduce(function(s, d) { return s + dayPct(matrix, d, hids); }, 0);
  return Math.round(sum / dates.length);
}

function calcStreak(matrix, hids) {
  var s = 0;
  for (var i = 0; i <= 365; i++) {
    var dk   = getDateKey(-i);
    var day  = matrix[dk] || {};
    var done = hids.filter(function(id) { return day[id]; }).length;
    if (hids.length > 0 && done >= hids.length * 0.5) s++;
    else if (i > 0) break;
  }
  return s;
}

function makeChart(id, config) {
  if (dashCharts[id]) { dashCharts[id].destroy(); }
  var el = document.getElementById(id);
  if (!el) return;
  dashCharts[id] = new Chart(el.getContext('2d'), config);
}

function pctYScale() {
  return { min:0, max:100,
    ticks:{callback:function(v){return v+'%';},font:{family:'DM Sans',size:11},color:'#6b8583'},
    grid:{color:'rgba(58,173,171,0.07)'}
  };
}
function labelScale() {
  return { ticks:{font:{family:'DM Sans',size:11},color:'#6b8583'}, grid:{display:false} };
}

function arrAvg(arr) {
  return arr.length ? Math.round(arr.reduce(function(a,b){return a+b;},0)/arr.length) : 0;
}

// ── PÁGINA: PACIENTES ─────────────────────────────────────
function renderPatientsPage() {
  var today  = getDateKey(0);
  var last7  = lastNDays(7);
  var last30 = lastNDays(30);

  var todayScores=[], w7Scores=[], w30Scores=[], streaks=[];
  patients.forEach(function(p) {
    var records = allData[p.code] || [];
    var matrix  = buildMatrix(records);
    var hids    = getPatientHabits(records).map(function(h){return h.id;});
    if (!hids.length) return;
    todayScores.push(dayPct(matrix, today, hids));
    w7Scores.push(avgPct(matrix, last7, hids));
    w30Scores.push(avgPct(matrix, last30, hids));
    streaks.push(calcStreak(matrix, hids));
  });

  var maxStreak = streaks.length ? Math.max.apply(null, streaks) : 0;

  document.getElementById('kpiRowGlobal').innerHTML =
    '<div class="kpi-dash k1"><div class="kpi-icon">📅</div>' +
    '<div class="kpi-label">Adesão hoje (média)</div>' +
    '<div class="kpi-value">' + arrAvg(todayScores) + '<sup>%</sup></div>' +
    '<div class="kpi-delta">' + patients.length + ' paciente' + (patients.length!==1?'s':'') + ' ativo' + (patients.length!==1?'s':'') + '</div></div>' +

    '<div class="kpi-dash k2"><div class="kpi-icon">📆</div>' +
    '<div class="kpi-label">Média 7 dias</div>' +
    '<div class="kpi-value">' + arrAvg(w7Scores) + '<sup>%</sup></div></div>' +

    '<div class="kpi-dash k3"><div class="kpi-icon">📊</div>' +
    '<div class="kpi-label">Média 30 dias</div>' +
    '<div class="kpi-value">' + arrAvg(w30Scores) + '<sup>%</sup></div></div>' +

    '<div class="kpi-dash k4"><div class="kpi-icon">🔥</div>' +
    '<div class="kpi-label">Maior sequência</div>' +
    '<div class="kpi-value">' + maxStreak + '<sup> dias</sup></div></div>';

  // Gráfico global 30d
  var hist = last30.slice().reverse();
  var globalData = hist.map(function(d) {
    var scores = patients.map(function(p) {
      var m    = buildMatrix(allData[p.code]||[]);
      var hids = getPatientHabits(allData[p.code]||[]).map(function(h){return h.id;});
      return hids.length ? dayPct(m, d, hids) : null;
    }).filter(function(v){return v!==null;});
    return scores.length ? arrAvg(scores) : 0;
  });

  makeChart('globalChart', {
    type: 'line',
    data: { labels: hist.map(function(d,i){return i%5===0?new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}):'';}),
      datasets: [{data:globalData, borderColor:'rgb(58,173,171)', backgroundColor:'rgba(58,173,171,0.1)',
        borderWidth:2.5, tension:0.4, fill:true, pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:pctYScale(),x:labelScale()}}
  });

  // Donut categorias
  var groupMap = {};
  patients.forEach(function(p) {
    (allData[p.code]||[]).forEach(function(r) {
      if (!groupMap[r.group]) groupMap[r.group] = {sum:0,count:0};
      groupMap[r.group].count++;
      if (r.checked) groupMap[r.group].sum++;
    });
  });
  var catLabels = Object.keys(groupMap);
  var catData   = catLabels.map(function(g){ return groupMap[g].count ? Math.round(groupMap[g].sum/groupMap[g].count*100):0; });

  makeChart('categoryChart', {
    type: 'doughnut',
    data: {labels:catLabels, datasets:[{data:catData, backgroundColor:PALETTE, borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'right',labels:{font:{family:'DM Sans',size:11},color:'#6b8583',boxWidth:12,padding:12}}}}
  });

  // Cards de pacientes
  document.getElementById('patientCount').textContent =
    patients.length + ' ativo' + (patients.length!==1?'s':'');

  if (!patients.length) {
    document.getElementById('patientList').innerHTML =
      '<div class="empty-state" style="grid-column:1/-1"><div class="emoji">🌿</div><p>Nenhum paciente ainda.</p></div>';
    return;
  }

  var html = '';
  patients.forEach(function(p) {
    var records = allData[p.code]||[];
    var matrix  = buildMatrix(records);
    var hids    = getPatientHabits(records).map(function(h){return h.id;});
    var w7  = avgPct(matrix, last7, hids);
    var w30v = avgPct(matrix, last30, hids);
    html +=
      '<div class="patient-card" onclick="openPatient(\'' + p.code + '\')">' +
      '<div class="pc-code">#' + p.code + ' · desde ' + (p.since||'—') + '</div>' +
      '<div class="pc-name">' + p.name + '</div>' +
      '<div class="pc-stats">' +
      '<div class="pc-stat">7 dias: <strong>' + w7 + '%</strong></div>' +
      '<div class="pc-stat">30 dias: <strong>' + w30v + '%</strong></div>' +
      '</div>' +
      '<div class="pc-bar"><div class="pc-fill" style="width:' + w7 + '%"></div></div>' +
      '</div>';
  });
  document.getElementById('patientList').innerHTML = html;
}

// ── PÁGINA: INDIVIDUAL ────────────────────────────────────
function renderPatientChips() {
  var chips = document.getElementById('patientChips');
  if (!chips) return;
  if (!patients.length) {
    chips.innerHTML = '<span class="no-patients">Carregue os dados primeiro</span>';
    return;
  }
  var html = '';
  patients.forEach(function(p) {
    html += '<div class="chip ' + (selectedPatient===p.code?'active':'') +
      '" onclick="openPatient(\'' + p.code + '\')">' + p.name + '</div>';
  });
  chips.innerHTML = html;
}

function openPatient(code) {
  selectedPatient = code;

  // Ativa página individual
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById('page-individual').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n,i){n.classList.toggle('active',i===1);});
  var tt = document.getElementById('topbarTitle');
  if (tt) tt.textContent = 'Análise individual';

  renderPatientChips();

  var records = allData[code] || [];
  var matrix  = buildMatrix(records);
  var habits  = getPatientHabits(records);
  var hids    = habits.map(function(h){return h.id;});

  var today  = getDateKey(0);
  var last7  = lastNDays(7);
  var last30 = lastNDays(30);

  document.getElementById('indToday').innerHTML  = dayPct(matrix,today,hids) + '<sup>%</sup>';
  document.getElementById('ind7d').innerHTML     = avgPct(matrix,last7,hids) + '<sup>%</sup>';
  document.getElementById('ind30d').innerHTML    = avgPct(matrix,last30,hids) + '<sup>%</sup>';
  document.getElementById('indStreak').innerHTML = calcStreak(matrix,hids) + '<sup> dias</sup>';

  // Linha 30d
  var hist = last30.slice().reverse();
  makeChart('indHistChart', {
    type:'line',
    data:{labels:hist.map(function(d,i){return i%5===0?new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}):'';}),
      datasets:[{data:hist.map(function(d){return dayPct(matrix,d,hids);}),
        borderColor:'rgb(58,173,171)',backgroundColor:'rgba(58,173,171,0.1)',
        borderWidth:2.5,tension:0.4,fill:true,pointRadius:3,pointBackgroundColor:'rgb(58,173,171)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:pctYScale(),x:labelScale()}}
  });

  // Semana
  var week7 = last7.slice().reverse();
  makeChart('indWeekChart', {
    type:'bar',
    data:{labels:week7.map(function(d){return DAY_NAMES_DASH[new Date(d+'T12:00:00').getDay()];}),
      datasets:[{data:week7.map(function(d){return dayPct(matrix,d,hids);}),
        backgroundColor:week7.map(function(d){return dayPct(matrix,d,hids)>=80?'rgba(58,173,171,0.85)':'rgba(181,216,193,0.75)';}),
        borderRadius:8,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:pctYScale(),x:labelScale()}}
  });

  // Heatmap
  var hmH = document.getElementById('hmHeader');
  if (hmH) hmH.innerHTML = DAY_NAMES_DASH.map(function(d){return '<div class="hm-lbl">'+d+'</div>';}).join('');
  var hm = document.getElementById('heatmap');
  if (hm) {
    var hmHtml = '';
    var todayD = new Date();
    var pad = todayD.getDay();
    for (var p=0;p<pad;p++) {
      var fd=new Date(todayD); fd.setDate(todayD.getDate()-pad+p);
      var dk=fd.toISOString().slice(0,10);
      var pct=dayPct(matrix,dk,hids);
      var lvl=pct===0?0:pct<40?25:pct<70?50:pct<100?75:100;
      hmHtml+='<div class="hm-cell" data-pct="'+lvl+'" data-tip="'+dk+': '+pct+'%"></div>';
    }
    for (var i=27;i>=0;i--) {
      var d2=new Date(todayD); d2.setDate(todayD.getDate()-i);
      var dk2=d2.toISOString().slice(0,10);
      var pct2=dayPct(matrix,dk2,hids);
      var lvl2=pct2===0?0:pct2<40?25:pct2<70?50:pct2<100?75:100;
      var outline=i===0?'style="outline:2px solid var(--teal);outline-offset:2px;"':'';
      hmHtml+='<div class="hm-cell" data-pct="'+lvl2+'" data-tip="'+dk2+': '+pct2+'%" '+outline+'></div>';
    }
    hm.innerHTML = hmHtml;
  }

  // Tabela hábitos
  var habitStats = habits.map(function(h) {
    var count = last30.filter(function(d){return (matrix[d]||{})[h.id];}).length;
    return { name:h.name, group:h.group, pct:Math.round(count/30*100) };
  }).sort(function(a,b){return b.pct-a.pct;});

  var tHtml = '<tr><th>Hábito</th><th>Categoria</th><th>Adesão 30d</th></tr>';
  habitStats.forEach(function(h) {
    tHtml += '<tr><td>'+h.name+'</td>' +
      '<td style="color:var(--text-muted)">'+h.group+'</td>' +
      '<td><div class="bar-cell"><div class="mini-bar"><div class="mini-fill" style="width:'+h.pct+'%"></div></div>' +
      '<div class="pct-text">'+h.pct+'%</div></div></td></tr>';
  });
  document.getElementById('indHabitTable').innerHTML = tHtml;
}

// ── PÁGINA: HÁBITOS ───────────────────────────────────────
function renderHabitsPage() {
  var habitMap = {};
  patients.forEach(function(p) {
    (allData[p.code]||[]).forEach(function(r) {
      if (!habitMap[r.habitId]) habitMap[r.habitId]={name:r.habitName,group:r.group,done:0,total:0};
      habitMap[r.habitId].total++;
      if (r.checked) habitMap[r.habitId].done++;
    });
  });

  var habits = Object.values(habitMap).sort(function(a,b){
    return (b.done/b.total||0)-(a.done/a.total||0);
  });
  var pcts = habits.map(function(h){return Math.round(h.done/h.total*100);});

  makeChart('allHabitsChart', {
    type:'bar',
    data:{labels:habits.map(function(h){return h.name.length>22?h.name.slice(0,20)+'…':h.name;}),
      datasets:[{data:pcts,
        backgroundColor:pcts.map(function(v){return v>=80?'rgba(58,173,171,0.85)':v>=50?'rgba(181,216,193,0.8)':'rgba(242,220,109,0.7)';}),
        borderRadius:6,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{min:0,max:100,ticks:{callback:function(v){return v+'%';},font:{family:'DM Sans',size:11},color:'#6b8583'},
        grid:{color:'rgba(58,173,171,0.07)'}},y:labelScale()}}
  });

  var tHtml = '<tr><th>#</th><th>Hábito</th><th>Categoria</th><th>Adesão média</th></tr>';
  habits.forEach(function(h,i) {
    tHtml += '<tr>' +
      '<td style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-size:18px">'+(i+1)+'</td>' +
      '<td>'+h.name+'</td>' +
      '<td style="color:var(--text-muted)">'+h.group+'</td>' +
      '<td><div class="bar-cell"><div class="mini-bar"><div class="mini-fill" style="width:'+pcts[i]+'%"></div></div>' +
      '<div class="pct-text">'+pcts[i]+'%</div></div></td></tr>';
  });
  document.getElementById('allHabitsTable').innerHTML = tHtml;
}
