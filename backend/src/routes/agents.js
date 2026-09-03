const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { apiRequest } = require('../services/wazuhApi');
const { searchAlerts, searchAgentAlerts } = require('../services/opensearch');

const STATE_FILE = path.join(__dirname, '../../kolokvijum-state.json');

function loadKolokvijumState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return { isActive: false, startTime: null, endTime: null };
}

// Dohvati sve agente
router.get('/', async (req, res) => {
  try {
    const data = await apiRequest('get', '/agents');
    if (data?.data?.affected_items) {
      data.data.affected_items = data.data.affected_items.filter(a => a.id !== '000');
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Risk level za agenta
router.get('/:agentId/risk', async (req, res) => {
  try {
    const { agentId } = req.params;

    const state = loadKolokvijumState();
    if (state.isActive !== true) {
      return res.json({ data: { risk: 'ok', critical: 0, warning: 0, total: 0 } });
    }

    // Dohvati alerte od početka kolokvijuma
    const alerts = await searchAlerts(agentId, { limit: 50, from: state.startTime });

    const isUsbAlert = (a) =>
      a.rule?.groups?.includes('usb') ||
      a.syscheck?.path?.toLowerCase().includes('usb') ||
      String(a.rule?.id) === '18101';

    const isCopilotAlert = (a) =>
      a.rule?.description?.toLowerCase().includes('copilot');

    const isForcedCritical = (a) => isUsbAlert(a) || isCopilotAlert(a);

    const isSyscheckAlert = (a) => a.rule?.groups?.some(g => g.includes('syscheck'));

    const critical = alerts.filter(a => isForcedCritical(a) || (!isSyscheckAlert(a) && a.rule?.level >= 10)).length;
    const warning = alerts.filter(a => !isForcedCritical(a) && !isSyscheckAlert(a) && a.rule?.level >= 5 && a.rule?.level < 10).length;
    
    let risk = 'low';
    if (critical > 0) risk = 'critical';
    else if (warning > 3) risk = 'warning';
    
    res.json({ data: { risk, critical, warning, total: alerts.length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alertovi za agenta iz OpenSearch
router.get('/:id/alerts', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '24h', from } = req.query;
    const alerts = await searchAgentAlerts(id, timeRange, from || null);
    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;