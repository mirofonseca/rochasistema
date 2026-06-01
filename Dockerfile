FROM node:20-alpine

WORKDIR /app

# Copia dependências
COPY package*.json ./
RUN npm install --production

# Copia projeto
COPY . .

# Cria pasta de dados
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/server.js"]
