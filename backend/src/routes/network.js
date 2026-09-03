const express = require('express');
const router = express.Router();
const { apiRequest } = require('../services/wazuhApi');

router.get('/:agentId/ports', async (req, res) => {
  try {
    const { agentId } = req.params;
    const data = await apiRequest('get', `/syscollector/${agentId}/ports`, {
      limit: 100,
      sort: '-remote_ip'
    });

    if (data?.data?.affected_items) {
      data.data.affected_items = data.data.affected_items.filter(p =>
        (p.state === 'established' || p.state === 'listening') &&
        p.process &&
        p.process !== 'System'
      );
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:agentId/interfaces', async (req, res) => {
  try {
    const { agentId } = req.params;
    const data = await apiRequest('get', `/syscollector/${agentId}/netiface`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;