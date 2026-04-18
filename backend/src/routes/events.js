const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');

// Dohvati evente za agenta
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50, offset = 0, type } = req.query;
    
    const data = await apiRequest('get', '/syscheck/' + agentId, {
      limit,
      offset,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;