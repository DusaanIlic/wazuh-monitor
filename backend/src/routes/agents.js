const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');
const { searchAlerts } = require('../services/opensearch');

// Dohvati sve agente
router.get('/', async (req, res) => {
  try {
    const data = await apiRequest('get', '/agents');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Risk level za agenta
router.get('/:agentId/risk', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Dohvati alerte poslednjih sat vremena
    const alerts = await searchAlerts(agentId, { limit: 50 });
    
    const critical = alerts.filter(a => a.rule?.level >= 10).length;
    const warning = alerts.filter(a => a.rule?.level >= 5 && a.rule?.level < 10).length;
    
    let risk = 'low';
    if (critical > 0) risk = 'critical';
    else if (warning > 3) risk = 'warning';
    
    res.json({ data: { risk, critical, warning, total: alerts.length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;