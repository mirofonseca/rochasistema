# Rocha Reboques — Sistema de Gestão

Sistema completo de gestão de aluguel de reboques com autenticação, auditoria e banco SQLite.

---

## 🚀 Deploy Online — Railway (recomendado)

### Passo a passo:

1. Acesse **[railway.app](https://railway.app)** e clique em **"Start a New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Conecte sua conta GitHub e selecione **`mirofonseca/rochasistema`**
4. Railway detecta o `Dockerfile` automaticamente — clique **"Deploy Now"**
5. Após o build (≈2 min), vá em **Settings → Networking → Generate Domain**
6. Acesse a URL gerada (ex: `https://rochasistema.up.railway.app`)

### ⚠️ Volume para persistência do banco (importante):
Sem volume, o banco SQLite é perdido a cada redeploy.

1. No painel do serviço → **"Add Volume"**
2. Mount Path: `/app/data`
3. Clique **"Add"** — Railway reinicia o serviço com volume persistente

---

## 💻 Rodar Local

```bash
git clone https://github.com/mirofonseca/rochasistema.git
cd rochasistema
npm install
npm start
```
Acesse: **http://localhost:3000**

---

## 🐳 Docker Local

```bash
docker-compose up --build
```
Acesse: **http://localhost:3000**

---

## 🔑 Credenciais Padrão
| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `admin123` |

---

## 🗄️ Banco de Dados

Criado automaticamente em `data/rochasistema.db` na primeira execução.

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Usuários (gerente/auxiliar) |
| `reboques` | Frota de reboques |
| `clientes` | Cadastro de clientes |
| `alugueis` | Registro de aluguéis |
| `auditoria` | Log de todas as ações |
| `config` | Configurações do sistema |

---

## 📡 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status do servidor |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET/POST/PUT/DELETE | `/api/reboques/:id` | CRUD reboques |
| GET/POST/PUT/DELETE | `/api/clientes/:id` | CRUD clientes |
| GET/POST/PUT/DELETE | `/api/alugueis/:id` | CRUD aluguéis |
| POST | `/api/alugueis/:id/encerrar` | Encerrar aluguel |
| GET/POST/PUT/DELETE | `/api/usuarios/:id` | CRUD usuários (gerente) |
| GET/DELETE | `/api/auditoria` | Log de auditoria (gerente) |
| GET | `/api/relatorios/dashboard` | Resumo financeiro |
| GET | `/api/relatorios/receita-reboque` | Receita por reboque |
| GET | `/api/relatorios/top-clientes` | Top clientes |
| GET/PUT | `/api/config` | Configurações |

**Autenticação:** header `x-auth-token: <token>` em todas as rotas (exceto `/api/health` e `/api/auth/login`).

---

## 🛠️ Scripts

```bash
npm start       # Inicia o servidor
npm run dev     # Inicia com hot-reload
npm run db:info # Info do banco no terminal
npm run db:reset # Apaga o banco (reinicia zerado)
```
