FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin ./bin
COPY lib ./lib
ENV NODE_ENV=production
ENTRYPOINT ["node", "bin/statable-mcp.js"]
