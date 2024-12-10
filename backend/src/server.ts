import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { classesRouter } from './api/routes/classes';
import { constraintsRouter } from './api/routes/constraints';
import { scheduleRouter } from './api/routes/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const app = express();
const port = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Set up logging to file
const logFile = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });
const errorFile = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Override console.log and console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const log = util.format(...args) + '\n';
  logFile.write(`[${new Date().toISOString()}] ${log}`);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const log = util.format(...args) + '\n';
  errorFile.write(`[${new Date().toISOString()}] ERROR: ${log}`);
  originalConsoleError.apply(console, args);
};

// Middleware
app.use(cors());
app.use(json());

// Routes
app.use('/api/classes', classesRouter);
app.use('/api/constraints', constraintsRouter);
app.use('/api/schedule', scheduleRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 