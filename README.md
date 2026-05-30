# Rocha Reboques — Sistema de Gestão

Sistema completo de gestão de aluguel de reboques com autenticação, auditoria e banco de dados SQLite.

## ⚙️ Requisitos
- Node.js ≥ 18

## 🚀 Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
npm start

# 3. Acessar no navegador
http://localhost:3000
```

## 🗄️ Banco de Dados

O banco SQLite é criado automaticamente em `data/rochasistema.db` na primeira execução.

**Tabelas:**
| Tabela       | Descrição                          |
|--------------|------------------------------------|
| `usuarios`   | Usuários do sistema (gerente/auxiliar) |
| `reboques`   | Frota de reboques                  |
| `clientes`   | Cadastro de clientes               |
| `alugueis`   | Registro de aluguéis               |
| `auditoria`  | Log completo de todas as ações     |
| `config`     | Configurações do sistema           |

## 🔑 Credenciais Padrão
- **Usuário:** admin  
- **Senha:** admin123

## 📡 API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| PUT | /api/auth/senha | Alterar própria senha |
| GET | /api/reboques | Listar reboques |
| POST | /api/reboques | Criar reboque |
| PUT | /api/reboques/:id | Editar reboque |
| DELETE | /api/reboques/:id | Excluir reboque |
| GET | /api/clientes | Listar clientes |
| POST | /api/clientes | Criar cliente |
| PUT | /api/clientes/:id | Editar cliente |
| DELETE | /api/clientes/:id | Excluir cliente |
| GET | /api/alugueis | Listar aluguéis |
| POST | /api/alugueis | Criar aluguel |
| PUT | /api/alugueis/:id | Editar aluguel |
| POST | /api/alugueis/:id/encerrar | Encerrar aluguel (requer pag=pago) |
| DELETE | /api/alugueis/:id | Excluir aluguel |
| GET | /api/usuarios | Listar usuários (gerente) |
| POST | /api/usuarios | Criar usuário (gerente) |
| PUT | /api/usuarios/:id | Editar usuário (gerente) |
| DELETE | /api/usuarios/:id | Excluir usuário (gerente) |
| GET | /api/auditoria | Log de auditoria (gerente) |
| GET | /api/relatorios/dashboard | Resumo financeiro |
| GET | /api/health | Health check |

## 🛠️ Scripts úteis

```bash
npm run db:reset   # Apaga o banco (reinicia zerado)
npm run db:info    # Mostra tabelas e contagens no terminal
npm run dev        # Inicia com hot-reload (Node --watch)
```

## 🔐 Autenticação
Todas as rotas (exceto `/api/auth/login` e `/api/health`) requerem o header:
```
x-auth-token: <token_base64>
```
O token é retornado no login e deve ser enviado em todas as requisições subsequentes.
