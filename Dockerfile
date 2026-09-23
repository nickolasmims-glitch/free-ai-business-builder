FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV OWNER_CLOUD_PORT=8787
ENV OWNER_CLOUD_WORKER_INTERVAL_MS=900000
VOLUME ["/app/platform/data"]
EXPOSE 8787
CMD ["node", "platform/worker-supervisor.mjs"]
