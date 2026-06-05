# Hábitos & Saúde

App de rastreamento de hábitos com dashboard clínico.  
Desenvolvido por **Taylan Souza dos Santos** · Nutricionista.

---

## Estrutura do projeto

```
habitos-saude/
│
├── index.html          # App do paciente
├── dashboard.html      # Painel da nutricionista
├── README.md
│
├── css/
│   ├── base.css        # Variáveis, reset e componentes compartilhados
│   ├── app.css         # Estilos específicos do app do paciente
│   └── dashboard.css   # Estilos específicos do dashboard
│
├── js/
│   ├── utils.js        # Utilitários compartilhados (storage, datas, charts)
│   ├── app.js          # Lógica do app do paciente
│   └── dashboard.js    # Lógica do dashboard da nutricionista
│
└── google-apps-script/
    └── Code.gs         # Script para Google Sheets (backend)
```

**Linguagem:** JavaScript (ES Modules — `import`/`export`)  
**CSS:** CSS puro com variáveis customizadas (`--var`)  
**HTML:** Semântico, sem frameworks  
**Charts:** Chart.js 4.4 (CDN)  
**Dados:** `localStorage` (paciente) + Google Sheets via Apps Script  
**Hospedagem:** GitHub Pages (zero servidor)

---

## Como subir no GitHub (passo a passo)

### 1. Instale o Git e o VS Code

- Git: https://git-scm.com/downloads
- VS Code: https://code.visualstudio.com

### 2. Configure o Git (uma vez só)

Abra o terminal no VS Code (`Ctrl+` `` ` ``) e rode:

```bash
git config --global user.name "Taylan Souza"
git config --global user.email "seu@email.com"
```

### 3. Crie o repositório no GitHub

1. Acesse https://github.com/new
2. Nome: `habitos-saude`
3. Visibilidade: **Public** (necessário para GitHub Pages grátis)
4. **Não** marque "Add a README" — já temos um
5. Clique em **Create repository**

### 4. Inicialize o Git na pasta do projeto

No terminal do VS Code, dentro da pasta `habitos-saude/`:

```bash
# Inicializa o repositório local
git init

# Adiciona todos os arquivos
git add .

# Primeiro commit
git commit -m "feat: projeto inicial — app do paciente e dashboard"

# Conecta ao GitHub (substitua SEU_USUARIO pelo seu @)
git remote add origin https://github.com/SEU_USUARIO/habitos-saude.git

# Sobe o código
git branch -M main
git push -u origin main
```

### 5. Ative o GitHub Pages

1. No repositório → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/ (root)`
4. Clique **Save**

Em ~2 minutos seu app estará em:  
`https://SEU_USUARIO.github.io/habitos-saude/`

---

## Fluxo de atualizações (dia a dia)

Sempre que editar algum arquivo:

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar as mudanças
git add .

# 3. Registrar com uma mensagem clara
git commit -m "fix: corrige cálculo de sequência"

# 4. Subir para o GitHub
git push
```

O GitHub Pages atualiza automaticamente em ~1 minuto.

---

## Extensões recomendadas no VS Code

Instale pelo painel de extensões (`Ctrl+Shift+X`):

| Extensão | Para que serve |
|---|---|
| **ESLint** | Aponta erros no JavaScript |
| **Prettier** | Formata o código automaticamente |
| **Live Server** | Abre o HTML no navegador com reload automático |
| **GitLens** | Visualiza histórico do Git inline |
| **CSS Variables** | Autocomplete para variáveis CSS |

Para rodar localmente com Live Server: clique com botão direito no `index.html` → **Open with Live Server**.

> ⚠️ Os módulos ES (`import`/`export`) **não funcionam** ao abrir o arquivo diretamente no navegador (`file://`). Use o Live Server ou um servidor local.

---

## Configurar o Google Apps Script

1. Crie uma planilha em https://sheets.google.com
2. Copie o ID da URL da planilha
3. Acesse https://script.google.com → Novo projeto
4. Cole o conteúdo de `google-apps-script/Code.gs`
5. Substitua `COLE_O_ID_DA_SUA_PLANILHA_AQUI` pelo ID
6. Implantar → Nova implantação → App da Web
   - Executar como: **Você mesmo**
   - Acesso: **Qualquer pessoa**
7. Copie a URL gerada

---

## Gerar link para paciente

No editor do Apps Script, edite a função `gerarCodigoPaciente()`:

```javascript
const nome    = 'Nome da Paciente';
const baseUrl = 'https://SEU_USUARIO.github.io/habitos-saude/';
```

Execute a função e copie o link gerado no **Log** (`Ctrl+Enter`).  
Envie o link para a paciente — o código dela já vai embutido na URL.
