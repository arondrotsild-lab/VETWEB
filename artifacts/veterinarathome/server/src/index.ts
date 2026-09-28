import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './db';
import authRoutes from './routes/auth';
import petsRoutes from './routes/pets';
import servicesRoutes from './routes/services';
import ordersRoutes from './routes/orders';
import vetsRoutes from './routes/vets';
import suggestionsRoutes from './routes/suggestions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof Error && error.name === 'PayloadTooLargeError') {
    res.status(413).json({ error: 'Фотография слишком большая. Выберите файл размером до 5 МБ.' });
    return;
  }
  next(error);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/vets', vetsRoutes);
app.use('/api/suggestions', suggestionsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 ВетДом API запущен на порту ${PORT}`);
  });
}

start().catch(console.error);
