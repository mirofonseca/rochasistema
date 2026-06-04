# Rocha Reboques — Sistema de Gestão

## 🚀 Deploy no Railway

1. Acesse [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Selecione `mirofonseca/rochasistema`
3. Após o build → **Settings → Networking → Generate Domain**

### ⚠️ Volume (banco persistente — fazer UMA vez)
Sem isso o banco apaga a cada redeploy:
1. No serviço → **Add Volume**
2. **Mount Path:** `/data`
3. Clique **Create**

### ⚙️ Variável de ambiente (obrigatória)
No Railway → **Variables → Add Variable:**
```
DATA_DIR = /data
```

---

## 💻 Rodar Local

```bash
git clone https://github.com/mirofonseca/rochasistema.git
cd rochasistema
npm install
npm start
# Acesse http://localhost:3000
```

## 🐳 Docker Local

```bash
docker-compose up --build
# Acesse http://localhost:3000
```

---

## 🔑 Acesso
| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `admin123` |

---

## 💾 Backup do Banco
Na tela **Configurações** do sistema:
- **Backup Banco (.db)** — baixa o arquivo do banco antes de deploys
- **Restaurar Banco** — sobe um backup para recuperar dados

---

## 🛠️ Scripts
```bash
npm start       # Inicia o servidor
npm run dev     # Hot-reload
npm run db:info # Info do banco
npm run db:reset # Apaga o banco
```
