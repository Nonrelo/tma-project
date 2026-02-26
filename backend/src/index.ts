import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import accountsRouter from './routes/accounts';
import usernamesRouter from './routes/usernames';
import adminRouter from './routes/admin';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, version: '2.0' }));

app.use('/accounts', accountsRouter);
app.use('/usernames', usernamesRouter);
app.use('/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
