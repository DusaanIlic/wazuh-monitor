const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');

// Dohvati sve agente
router.get('/', async (req, res) => {
  try {
    const data = await apiRequest('get', '/agents');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;