// ═══════════════════════════════════════════════════════════════
//  HÁBITOS & SAÚDE — Google Apps Script
//  Cole este código em: script.google.com → novo projeto
//  Depois: Implantar → Nova implantação → App da Web
//  Executar como: Você mesmo | Quem pode acessar: Qualquer pessoa
// ═══════════════════════════════════════════════════════════════

const SPREADSHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI';
// O ID está na URL da sua planilha:
// https://docs.google.com/spreadsheets/d/  >>ID_AQUI<<  /edit

// ── RECEBE DADOS DO APP DO PACIENTE ─────────────────────────────
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const payload = JSON.parse(e.postData.contents);
    const { patientCode, patientName, date, habitId, habitName, habitGroup, checked, timestamp } = payload;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = `${patientCode}`;

    // Cria aba do paciente se não existir
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Cabeçalho
      sheet.getRange(1, 1, 1, 8).setValues([[
        'Data', 'Código', 'Paciente', 'ID Hábito', 'Hábito', 'Categoria', 'Realizado', 'Timestamp'
      ]]);
      // Formatar cabeçalho
      const headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setBackground('#3AADAB');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 100);
      sheet.setColumnWidth(3, 160);
      sheet.setColumnWidth(5, 220);
      sheet.setColumnWidth(6, 120);
      sheet.setColumnWidth(8, 180);

      // Registra paciente no índice
      registerPatient(ss, patientCode, patientName);
    }

    // Procura linha existente para esta data+hábito e atualiza, ou adiciona nova
    const data = sheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === date && data[i][3] === habitId) {
        sheet.getRange(i + 1, 7).setValue(checked ? 'SIM' : 'NÃO');
        sheet.getRange(i + 1, 8).setValue(timestamp);
        updated = true;
        break;
      }
    }

    if (!updated) {
      sheet.appendRow([
        date, patientCode, patientName, habitId,
        habitName, habitGroup, checked ? 'SIM' : 'NÃO', timestamp
      ]);
    }

    // Colorir linha baseado em "realizado"
    colorLastRows(sheet);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── RETORNA DADOS PARA O DASHBOARD ──────────────────────────────
function doGet(e) {
  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Lista todos os pacientes
    if (action === 'patients') {
      const index = ss.getSheetByName('_index');
      if (!index) return jsonResponse([]);
      const rows = index.getDataRange().getValues().slice(1);
      const patients = rows.map(r => ({ code: r[0], name: r[1], since: r[2] }));
      return jsonResponse(patients);
    }

    // Dados de um paciente específico
    if (action === 'patient') {
      const code = e.parameter.code;
      const sheet = ss.getSheetByName(code);
      if (!sheet) return jsonResponse({ error: 'Paciente não encontrado' });

      const rows = sheet.getDataRange().getValues().slice(1); // sem cabeçalho
      const records = rows.map(r => ({
        date: r[0], code: r[1], name: r[2],
        habitId: r[3], habitName: r[4], group: r[5],
        checked: r[6] === 'SIM', timestamp: r[7]
      }));
      return jsonResponse(records);
    }

    return jsonResponse({ error: 'Ação inválida' });

  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ── HELPERS ─────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function registerPatient(ss, code, name) {
  let index = ss.getSheetByName('_index');
  if (!index) {
    index = ss.insertSheet('_index', 0);
    index.getRange(1, 1, 1, 3).setValues([['Código', 'Nome', 'Desde']]);
    const h = index.getRange(1, 1, 1, 3);
    h.setBackground('#1a2e2d');
    h.setFontColor('#ffffff');
    h.setFontWeight('bold');
    index.setFrozenRows(1);
  }
  // Verifica se já existe
  const existing = index.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === code) return;
  }
  index.appendRow([code, name, new Date().toISOString().slice(0, 10)]);
}

function colorLastRows(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  // Só recolore as últimas 20 linhas para performance
  const start = Math.max(2, last - 20);
  const range = sheet.getRange(start, 1, last - start + 1, 8);
  const vals = range.getValues();
  const colors = vals.map(r => Array(8).fill(r[6] === 'SIM' ? '#e8f7f6' : '#fff9f0'));
  range.setBackgrounds(colors);
}

// ── GERA LINK DE PACIENTE ────────────────────────────────────────
// Rode esta função manualmente para gerar um código para um paciente
function gerarCodigoPaciente() {
  const nome = 'Marina Silva'; // ← altere aqui
  const baseUrl = 'https://SEU_USUARIO.github.io/SEU_REPO/'; // ← altere aqui
  const codigo = 'P' + Date.now().toString(36).toUpperCase().slice(-6);
  const link = `${baseUrl}?p=${codigo}&n=${encodeURIComponent(nome)}`;
  Logger.log(`Código: ${codigo}`);
  Logger.log(`Link para o paciente: ${link}`);
  // Cole o link gerado e envie para a paciente
}
