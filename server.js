require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const blogRoutes = require('./routes/blogRoutes');

const printError = (label, error) => {
  console.error(label);

  if (!error) {
    console.error('Unknown error: no error object was returned.');
    return;
  }

  // console.error(error) is important for AggregateError because its normal
  // message can be blank while the nested TCP/DNS errors contain the cause.
  console.error(error);

  const details = {
    name: error.name,
    message: error.message,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    address: error.address,
    port: error.port,
    sqlState: error.sqlState,
    sqlMessage: error.sqlMessage,
  };
  console.error('[ERROR DETAILS]', details);

  if (Array.isArray(error.errors) && error.errors.length) {
    console.error('[NESTED ERRORS]');
    error.errors.forEach((nested, index) => {
      console.error(`#${index + 1}`, {
        name: nested?.name,
        message: nested?.message,
        code: nested?.code,
        errno: nested?.errno,
        syscall: nested?.syscall,
        address: nested?.address,
        port: nested?.port,
      });
    });
  }
};

process.on('unhandledRejection', reason => printError('[Unhandled rejection]', reason));
process.on('uncaughtException', error => printError('[Uncaught exception]', error));

const app = express();
app.disable('x-powered-by');
const PORT = Number.parseInt(process.env.PORT || '5000', 10);
app.set('trust proxy', 1);

const configuredOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',').map(x => x.trim()).filter(Boolean);
const allowedOrigins = configuredOrigins.length ? configuredOrigins : [
  'http://localhost:3000', 'http://localhost:3001',
  'https://dmcamaster.com', 'https://www.dmcamaster.com',
];
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d', immutable: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', caseRoutes);
app.use('/api', contactRoutes);
app.use('/api', blogRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'OK', message: 'DMCA Master API is running' }));
app.use((err, _req, res, next) => {
  if (!err) return next();
  printError('[REQUEST ERROR]', err);
  res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: err.message || 'Request failed.' });
});
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const startServer = async () => {
  const maxAttempts = Math.max(1, Number.parseInt(process.env.DB_STARTUP_RETRIES || '5', 10));
  const baseDelay = Math.max(500, Number.parseInt(process.env.DB_STARTUP_RETRY_DELAY_MS || '3000', 10));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`[STARTUP] Database initialization attempt ${attempt}/${maxAttempts}...`);
      await initDB();

      const server = app.listen(PORT, () => {
        console.log(`DMCA Master API running on port ${PORT}`);
      });

      server.on('error', error => {
        printError('[SERVER LISTEN ERROR]', error);
        process.exitCode = 1;
      });
      return;
    } catch (error) {
      printError(`[STARTUP ERROR] Database initialization attempt ${attempt}/${maxAttempts} failed.`, error);

      if (attempt < maxAttempts) {
        const delay = baseDelay * attempt;
        console.log(`[STARTUP] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error('[STARTUP ERROR] Backend could not connect to/synchronize the database after all retry attempts.');
  console.error('[STARTUP ERROR] Run: npm run db:diagnose');
  process.exit(1);
};

startServer();
