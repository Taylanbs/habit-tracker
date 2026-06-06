// ═══════════════════════════════════════════════════════════════
//  HÁBITOS & SAÚDE — Google Apps Script  (versão corrigida)
//
//  COMO USAR:
//  1. Cole este código em script.google.com
//  2. Substitua o ID da planilha abaixo
//  3. Implantar → Nova implantação → App da Web
//     - Executar como: Você mesmo
//     - Acesso: Qualquer pessoa
//  4. Copie a URL gerada e cole em js/app.js (linha 6)
//     e no campo do dashboard
// ═══════════════════════════════════════════════════════════════

var SPREADSHEET_ID = '1wZFgLuHvN2VZ3_qP0BXENfm9tDSI9erTbRGxzMGFy-Q';

// ── RECEBE DADOS DO APP (POST) ───────────────────────────────────
function doPost(e) {
  try {
    // Aceita tanto application/json quanto text/plain
    var raw = '';
    if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e.parameter && e.parameter.data) {
      raw = e.parameter.data;
    }

    var payload = JSON.parse(raw);

    var patientCode = payload.patientCode || 'SEM_CODIGO';
    var patientName = payload.patientName || 'Paciente';
    var date        = payload.date        || '';
    var habitId     = payload.habitId     || '';
    var habitName   = payload.habitName   || '';
    var habitGroup  = payload.habitGroup  || '';
    var checked     = payload.checked     ? 'SIM' : 'NÃO';
    var timestamp   = payload.timestamp   || new Date().toISOString();

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getOrCreateSheet(ss, patientCode, patientName);

    // Atualiza linha existente ou adiciona nova
    var data    = sheet.getDataRange().getValues();
    var updated = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(date) &&
          String(data[i][3]) === String(habitId)) {
        sheet.getRange(i + 1, 7).setValue(checked);
        sheet.getRange(i + 1, 8).setValue(timestamp);
        updated = true;
        break;
      }
    }

    if (!updated) {
      sheet.appendRow([
        date, patientCode, patientName,
        habitId, habitName, habitGroup,
        checked, timestamp
      ]);
    }

    colorRows(sheet);

    return buildResponse({ status: 'ok', message: 'Salvo com sucesso' });

  } catch(err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

// ── RETORNA DADOS PARA O DASHBOARD (GET) ────────────────────────
function doGet(e) {
  try {
    var action = e.parameter.action || '';
    var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Lista todos os pacientes
    if (action === 'patients') {
      var index = ss.getSheetByName('_index');
      if (!index) return buildResponse([]);
      var rows     = index.getDataRange().getValues();
      var patients = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0]) {
          patients.push({
            code:  String(rows[i][0]),
            name:  String(rows[i][1]),
            since: String(rows[i][2])
          });
        }
      }
      return buildResponse(patients);
    }

    // Dados de um paciente específico
    if (action === 'patient') {
      var code  = e.parameter.code || '';
      var sheet = ss.getSheetByName(code);
      if (!sheet) return buildResponse([]);

      var rows    = sheet.getDataRange().getValues();
      var records = [];
      for (var i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        records.push({
          date:      String(rows[i][0]),
          code:      String(rows[i][1]),
          name:      String(rows[i][2]),
          habitId:   String(rows[i][3]),
          habitName: String(rows[i][4]),
          group:     String(rows[i][5]),
          checked:   String(rows[i][6]) === 'SIM',
          timestamp: String(rows[i][7])
        });
      }
      return buildResponse(records);
    }

    // Teste de conexão
    if (action === 'ping') {
      return buildResponse({ status: 'ok', message: 'Conexão funcionando!' });
    }

    return buildResponse({ status: 'error', message: 'Ação inválida: ' + action });

  } catch(err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

// ── HELPERS ──────────────────────────────────────────────────────
function buildResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getOrCreateSheet(ss, code, name) {
  var sheet = ss.getSheetByName(code);
  if (!sheet) {
    sheet = ss.insertSheet(code);

    // Cabeçalho
    var header = [['Data','Código','Paciente','ID Hábito','Hábito','Categoria','Realizado','Timestamp']];
    sheet.getRange(1, 1, 1, 8).setValues(header);

    // Formatar cabeçalho
    var hRange = sheet.getRange(1, 1, 1, 8);
    hRange.setBackground('#3AADAB');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(5, 220);
    sheet.setColumnWidth(8, 200);

    // Registra no índice
    registerPatient(ss, code, name);
  }
  return sheet;
}

function registerPatient(ss, code, name) {
  var index = ss.getSheetByName('_index');
  if (!index) {
    index = ss.insertSheet('_index', 0);
    var h = [['Código','Nome','Desde']];
    index.getRange(1, 1, 1, 3).setValues(h);
    var hRange = index.getRange(1, 1, 1, 3);
    hRange.setBackground('#1a2e2d');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    index.setFrozenRows(1);
  }

  // Verifica se já existe
  var rows = index.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(code)) return;
  }
  index.appendRow([code, name, Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd')]);
}

function colorRows(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var start  = Math.max(2, last - 30);
  var range  = sheet.getRange(start, 1, last - start + 1, 8);
  var values = range.getValues();
  var colors = values.map(function(r) {
    var color = r[6] === 'SIM' ? '#e8f7f6' : '#fff9f0';
    return [color, color, color, color, color, color, color, color];
  });
  range.setBackgrounds(colors);
}

// ── GERA LINK PARA PACIENTE ──────────────────────────────────────
// Execute esta função manualmente para gerar o link de uma paciente.
// Veja o resultado em: Visualizar → Registros
function gerarLinkPaciente() {
  var nome    = 'Nome da Paciente';  // ← altere aqui
  var baseUrl = 'https://SEU_USUARIO.github.io/habitos-saude/'; // ← altere aqui

  var codigo = 'P' + new Date().getTime().toString(36).toUpperCase().slice(-5);
  var link   = baseUrl + '?p=' + codigo + '&n=' + encodeURIComponent(nome);

  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('Paciente : ' + nome);
  Logger.log('Código   : ' + codigo);
  Logger.log('Link     : ' + link);
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('Envie este link para a paciente.');
}

// ── TESTE DE CONEXÃO ─────────────────────────────────────────────
// Execute esta função para confirmar que o script está funcionando.
function testarConexao() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✓ Conectado à planilha: ' + ss.getName());
    Logger.log('✓ Script funcionando corretamente.');
  } catch(e) {
    Logger.log('✗ Erro: ' + e.toString());
    Logger.log('Verifique se o SPREADSHEET_ID está correto.');
  }
}
