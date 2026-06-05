// ═══════════════════════════════════════════════════════
//  utils.js — Funções utilitárias compartilhadas
//  entre app (index.html) e dashboard (dashboard.html)
// ═══════════════════════════════════════════════════════

// ── STORAGE ──────────────────────────────────────────────
/**
 * Lê um valor do localStorage com fallback seguro.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Salva um valor no localStorage como JSON.
 * @param {string} key
 * @param {*} value
 */
export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── DATAS ─────────────────────────────────────────────────
/**
 * Retorna uma chave de data no formato YYYY-MM-DD.
 * @param {number} offsetFromToday - dias a partir de hoje (negativo = passado)
 * @returns {string}
 */
export function dateKey(offsetFromToday = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return d.toISOString().slice(0, 10);
}

/**
 * Gera um array de chaves de datas dos últimos N dias.
 * @param {number} days
 * @returns {string[]}
 */
export function lastNDays(days) {
  return Array.from({ length: days }, (_, i) => dateKey(-i));
}

/**
 * Formata uma data para exibição em pt-BR.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatDate(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return d.toLocaleDateString('pt-BR', options);
}

// ── TOAST ─────────────────────────────────────────────────
let toastTimer = null;

/**
 * Exibe uma mensagem de feedback temporária.
 * @param {string} message
 * @param {number} duration - milissegundos (padrão: 2200)
 */
export function showToast(message, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ── CHART HELPERS ─────────────────────────────────────────
export const CHART_DEFAULTS = {
  font:      { family: 'DM Sans', size: 11 },
  color:     '#6b8583',
  gridColor: 'rgba(58, 173, 171, 0.07)',
};

export const COLORS = {
  teal:    'rgb(58, 173, 171)',
  sage:    'rgb(181, 216, 193)',
  gold:    '#f2dc6d',
  amber:   '#f2a03d',
  tealA:   'rgba(58, 173, 171, 0.12)',
  sageA:   'rgba(181, 216, 193, 0.4)',
  palette: [
    'rgba(58,173,171,0.8)',
    'rgba(181,216,193,0.8)',
    'rgba(242,220,109,0.8)',
    'rgba(242,160,61,0.8)',
    'rgba(58,173,171,0.5)',
    'rgba(181,216,193,0.5)',
  ],
};

/** Destrói e recria um Chart.js instance. */
export function makeChart(registry, id, config) {
  if (registry[id]) { registry[id].destroy(); }
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return null;
  registry[id] = new Chart(ctx, config);
  return registry[id];
}

/** Opções padrão de escala para gráficos de porcentagem. */
export function pctScaleOptions(axis = 'y') {
  return {
    min: 0,
    max: 100,
    ticks: {
      callback: (v) => v + '%',
      font: CHART_DEFAULTS.font,
      color: CHART_DEFAULTS.color,
    },
    grid: { color: CHART_DEFAULTS.gridColor },
  };
}

export function labelScaleOptions() {
  return {
    ticks: { font: CHART_DEFAULTS.font, color: CHART_DEFAULTS.color },
    grid: { display: false },
  };
}

// ── HÁBITOS ───────────────────────────────────────────────
export const GROUP_ICONS = {
  'Nutrição':   '🥗',
  'Hidratação': '💧',
  'Movimento':  '🏃',
  'Sono':       '🌙',
  'Mente':      '🧠',
  'Intestino':  '🦠',
  'Outros':     '✦',
};

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DEFAULT_HABITS = [
  { id: 'h1',  name: 'Beber 2L de água',                    group: 'Hidratação' },
  { id: 'h2',  name: 'Café da manhã equilibrado',            group: 'Nutrição'   },
  { id: 'h3',  name: 'Almoço com vegetais',                  group: 'Nutrição'   },
  { id: 'h4',  name: 'Probiótico / fermentado',              group: 'Intestino'  },
  { id: 'h5',  name: 'Fibras na refeição',                   group: 'Intestino'  },
  { id: 'h6',  name: 'Atividade física',                     group: 'Movimento'  },
  { id: 'h7',  name: 'Dormir ≥ 7h',                         group: 'Sono'       },
  { id: 'h8',  name: 'Sem telas 30 min antes de dormir',     group: 'Sono'       },
  { id: 'h9',  name: 'Meditação / respiração',               group: 'Mente'      },
  { id: 'h10', name: 'Sem ultraprocessados',                  group: 'Nutrição'   },
];
