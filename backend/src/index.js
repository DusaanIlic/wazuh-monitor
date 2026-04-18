const express = require('express');
const cors = require('cors');
require('dotenv').config();
const agentsRouter = require('./routes/agents');
const eventsRouter = require('./routes/events');
const alertsRouter = require('./routes/alerts');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/agents', agentsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/alerts', alertsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});