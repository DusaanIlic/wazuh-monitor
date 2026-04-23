const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');
const { searchAlerts, searchTempActivity } = require('../services/opensearch');

router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50 } = req.query;
    const data = await apiRequest('get', '/syscheck/' + agentId, { limit });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:agentId/alerts', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 100, username } = req.query;
    const data = await searchAlerts(agentId, { limit, username });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:agentId/temp-activity', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 100, username } = req.query;
    const data = await searchTempActivity(agentId, { limit, username });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Privremeni endpoint za testiranje
router.get('/opensearch/indices', async (req, res) => {
  try {
    const axios = require('axios');
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(
      `${process.env.OPENSEARCH_URL}/_cat/indices?v`,
      {
        auth: {
          username: process.env.OPENSEARCH_USER,
          password: process.env.OPENSEARCH_PASSWORD,
        },
        httpsAgent: agent,
      }
    );
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;