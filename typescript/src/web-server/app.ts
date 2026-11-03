import express from 'express';
import cors from 'cors';
import type { components } from './generated/schema.js';

export const app = express();
app.use(cors({ origin: [process.env.WEB_ORIGIN ?? 'http://localhost:3000'] }));

app.get('/health', (_request, response) => {
  const health: components['schemas']['HealthResponse'] = { status: 'ok' };
  response.json(health);
});
