// --- server.js ---
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express       = require('express');
const cors          = require('cors');
const { initDB }    = require('./config/db');
const authRoutes    = require('./routes/authRoutes');
const caseRoutes    = require('./routes/caseRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000','http://localhost:3001','https://dmcamaster.com','https://www.dmcamaster.com'],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',  authRoutes);
app.use('/api',       caseRoutes);   // covers /api/cases/* AND /api/admin/*
app.use('/api',       contactRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'OK', message: 'DMCA Master API is running' }));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('  DMCA Master Backend');
    console.log('  -------------------');
    console.log('  Running at : http://localhost:' + PORT);
    console.log('  API base   : http://localhost:' + PORT + '/api');
    console.log('');
  });
});
