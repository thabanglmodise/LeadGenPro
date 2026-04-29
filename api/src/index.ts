import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { createContext } from './context.js';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:4000',
  ],
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`LeadAI Pro API listening on http://localhost:${port}`);
});
