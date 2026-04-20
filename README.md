# Francisca — Drive Tracker
### Guia de instalação completo (sem código)

---

## O que vais precisar
- Conta **Supabase** (gratuita) → supabase.com
- Conta **Vercel** (gratuita) → vercel.com
- Conta **GitHub** (gratuita) → github.com

Tempo estimado: **20–30 minutos**

---

## PASSO 1 — Criar projeto no Supabase

1. Vai a **supabase.com** → "Start your project" → cria conta
2. Clica em **"New project"**
3. Dá um nome (ex: `francisca-tracker`) e define uma password forte → **"Create new project"**
4. Aguarda ~2 minutos enquanto o projeto inicia

### Criar a base de dados
5. No menu lateral clica em **"SQL Editor"**
6. Clica em **"New query"**
7. Abre o ficheiro `supabase-schema.sql` (incluído neste projeto), copia tudo e cola no editor
8. Clica em **"Run"** — deves ver "Success"

### Copiar as credenciais
9. No menu lateral vai a **Settings → API**
10. Copia:
    - **Project URL** (algo como `https://xxxx.supabase.co`)
    - **anon public key** (chave longa que começa com `eyJ...`)
    - Guarda estes dois valores — vais precisar no Passo 3

---

## PASSO 2 — Colocar o código no GitHub

1. Vai a **github.com** → cria conta se não tiveres
2. Clica em **"New repository"**
3. Nome: `francisca-tracker` → **"Create repository"**
4. Clica em **"uploading an existing file"**
5. Arrasta **todos os ficheiros desta pasta** para a janela do GitHub
6. Clica em **"Commit changes"**

---

## PASSO 3 — Deploy no Vercel

1. Vai a **vercel.com** → cria conta (podes entrar com o GitHub)
2. Clica em **"Add New Project"**
3. Seleciona o repositório `francisca-tracker`
4. Antes de fazer deploy, clica em **"Environment Variables"** e adiciona:
   - `VITE_SUPABASE_URL` → cola o Project URL do Passo 1
   - `VITE_SUPABASE_ANON_KEY` → cola a anon key do Passo 1
5. Clica em **"Deploy"**
6. Aguarda ~2 minutos — vais receber um link do tipo `francisca-tracker.vercel.app`

**O site está online! 🎉**

---

## PASSO 4 — Criar contas para os utilizadores

1. Vai ao teu projecto no **Supabase**
2. Menu lateral → **Authentication → Users**
3. Clica em **"Add user"** → "Create new user"
4. Insere email e password para cada pessoa:
   - Francisca (atleta)
   - Treinador 1
   - Treinador 2
   - etc.
5. Partilha o link do Vercel + as credenciais com cada pessoa

---

## Domínio personalizado (opcional)

Se quiseres um endereço como `tracker.francisca.com`:
1. No Vercel → Settings → Domains → adiciona o teu domínio
2. Segue as instruções do Vercel para configurar o DNS

---

## Resolução de problemas

**"Invalid API key"** → Verifica se copiaste as variáveis de ambiente correctamente no Vercel

**"Row level security"** → Confirma que correste o SQL do Passo 1 completo

**Página em branco** → No Vercel, vai a "Deployments" e verifica os logs de erro

---

## Estrutura do projecto

```
francisca-tracker/
├── src/
│   ├── App.jsx              ← Gestão de autenticação
│   ├── main.jsx             ← Entrada da aplicação
│   ├── lib/
│   │   └── supabase.js      ← Cliente Supabase
│   └── components/
│       ├── Login.jsx        ← Página de login
│       └── Dashboard.jsx    ← Tracker principal
├── index.html
├── package.json
├── vite.config.js
├── supabase-schema.sql      ← Colar no Supabase SQL Editor
└── .env.example             ← Modelo das variáveis de ambiente
```
