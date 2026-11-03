FROM node:24.22.1-bookworm-slim

WORKDIR /workspace

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3001
CMD ["node", "--import", "tsx", "src/index.ts"]
