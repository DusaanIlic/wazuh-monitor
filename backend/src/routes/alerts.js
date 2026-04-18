const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');

// Dohvati alerte
router.get('/', async (req, res) => {
  try {
    const { agentId, limit = 50 } = req.query;
    
    const params = { limit };
    if (agentId) params.agents_list = agentId;
    
    const data = await apiRequest('get', '/syscheck/' + (agentId || '003'), params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;