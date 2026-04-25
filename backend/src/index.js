const express = require('express');
const cors = require('cors');
require('dotenv').config();
const agentsRouter = require('./routes/agents');
const eventsRouter = require('./routes/events');
const alertsRouter = require('./routes/alerts');
const screenshotsRouter = require('./routes/screenshots');
const networkRouter = require('./routes/network');

const app = express();
app.use(cors());
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString('sr-RS')} ${req.method} ${req.url}`);
  next();
});
//app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/agents', agentsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/screenshots', screenshotsRouter);
app.use('/api/network', networkRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});