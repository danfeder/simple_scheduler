import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { classesRouter } from './api/routes/classes';
import { constraintsRouter } from './api/routes/constraints';
import { scheduleRouter } from './api/routes/schedule';

const app = express();
const port = process.env.PORT || 3001;

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