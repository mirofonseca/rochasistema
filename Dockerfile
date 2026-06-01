FROM ghcr.io/railwayapp/function-bun:sha-daf7e7f9c0598fbca55610788e44cb57616c9119

# Instala Node.js (necessário pois o backend usa Node/Express)
RUN apt-get update && apt-get install -y nodejs npm && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia dependências primeiro (cache de layers)
COPY package*.json ./
RUN npm install --production

# Copia todo o projeto
COPY . .

# Cria pasta de dados com permissão de escrita
RUN mkdir -p /app/data && chmod 777 /app/data

# Porta exposta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/server.js"]
