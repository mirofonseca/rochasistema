FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# /data = Volume persistente Railway (configurar no dashboard)
# /app/data = fallback para desenvolvimento local
RUN mkdir -p /data /app/data && chmod 777 /data /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/server.js"]
