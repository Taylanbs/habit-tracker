# Como configurar a URL do Apps Script — passo a passo

## O que você vai fazer

Editar UMA linha no arquivo `js/app.js`, salvar e subir no GitHub.
Depois disso, toda paciente que usar o app enviará dados automaticamente
para sua planilha — sem precisar configurar nada.

---

## Passo 1 — Abrir o arquivo no VS Code

1. Abra a pasta `habitos-saude` no VS Code
2. No painel esquerdo (Explorer), clique em `js` → `app.js`
3. O arquivo abre no editor

---

## Passo 2 — Encontrar a linha certa

Use o atalho `Ctrl+G` (Windows) ou `Cmd+G` (Mac) e digite `6` → Enter.
Você vai pular direto para a linha 6, que é esta:

```javascript
const SCRIPT_URL = 'COLE_AQUI_SUA_URL_DO_APPS_SCRIPT';
```

---

## Passo 3 — Colar sua URL

Substitua o texto entre aspas simples pela sua URL real do Apps Script.

**Antes:**
```javascript
const SCRIPT_URL = 'COLE_AQUI_SUA_URL_DO_APPS_SCRIPT';
```

**Depois (exemplo):**
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXX/exec';
```

⚠️  Atenção:
- Mantenha as aspas simples ' '
- Não deixe espaço antes nem depois da URL
- A URL termina com /exec

---

## Passo 4 — Salvar

Pressione `Ctrl+S` (Windows) ou `Cmd+S` (Mac).

---

## Passo 5 — Subir no GitHub

Abra o terminal no VS Code com `Ctrl+` ` (backtick) e rode:

```bash
git add js/app.js
git commit -m "fix: configura URL do Apps Script"
git push
```

Aguarde ~1 minuto e o GitHub Pages estará atualizado.

---

## Passo 6 — Testar

1. Abra o app do paciente pelo GitHub Pages
   (ex: https://SEU_USUARIO.github.io/habitos-saude/)
2. Marque qualquer hábito
3. Olhe o canto superior direito — deve aparecer **"Salvo ✓"** em verde
4. Abra sua planilha Google Sheets — deve aparecer uma nova aba
   com o código da paciente e os dados dela

---

## Como gerar links para as pacientes

### Opção A — Pelo Apps Script (método original)

1. Abra script.google.com → seu projeto
2. No seletor de função (topo), escolha `gerarCodigoPaciente`
3. Edite o nome e a URL base dentro da função
4. Clique em ▷ Executar
5. Clique em **Registro de execução** (painel inferior)
6. Clique na aba **Registros** — o link aparece ali

### Opção B — Monte o link manualmente (mais simples)

O link tem este formato:
```
https://SEU_USUARIO.github.io/habitos-saude/?p=CODIGO&n=NOME
```

Basta escolher um código para a paciente (pode ser qualquer coisa,
ex: M001, P001, MARINA) e colocar o nome dela:

```
https://taylan.github.io/habitos-saude/?p=M001&n=Marina%20Silva
```

Para nomes com espaço, substitua o espaço por %20:
- "Marina Silva"  → `Marina%20Silva`
- "Ana Paula"     → `Ana%20Paula`
- "Leticia Souza" → `Leticia%20Souza`

Mande esse link direto para a paciente por WhatsApp. ✅

---

## Se a planilha continuar vazia após os passos acima

Provavelmente o Apps Script precisa ser reimplantado.
Faça isso:

1. Abra script.google.com → seu projeto
2. Clique em **Implantar** → **Gerenciar implantações**
3. Clique no ✏️ lápis da implantação existente
4. Em "Versão", selecione **"Nova versão"**
5. Clique em **Implantar**
6. Copie a nova URL gerada
7. Repita os passos 2-5 deste guia com a nova URL
