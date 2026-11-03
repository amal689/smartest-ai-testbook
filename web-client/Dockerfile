FROM node:24.22.1-bookworm-slim AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY tsconfig.json index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:1.30.6-alpine
COPY --from=build /workspace/dist /usr/share/nginx/html
EXPOSE 80
