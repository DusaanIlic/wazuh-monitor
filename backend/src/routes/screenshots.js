const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pendingScreenshots = new Set();

const screenshotDir = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

router.post('/upload/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const { image, timestamp } = req.body;
    if (!image) return res.status(400).json({ error: 'Nema slike' });
    const filename = `${agentId}_${timestamp || Date.now()}.png`;
    const filePath = path.join(screenshotDir, filename);
    const buffer = Buffer.from(image, 'base64');
    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, filename, url: `/api/screenshots/view/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list/:agentId', (req, res) => {
  const { agentId } = req.params;
  try {
    const files = fs.readdirSync(screenshotDir)
      .filter(f => f.startsWith(agentId))
      .map(f => {
        const stats = fs.statSync(path.join(screenshotDir, f));
        return { filename: f, timestamp: stats.mtime, url: `/api/screenshots/view/${f}` };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ data: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/view/:filename', (req, res) => {
  const filePath = path.join(screenshotDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Screenshot nije pronađen' });
  }
  res.sendFile(filePath);
});

router.get('/pending/:agentId', (req, res) => {
    const { agentId } = req.params;
    const pending = pendingScreenshots.has(agentId);
    if (pending) pendingScreenshots.delete(agentId);
    res.json({ pending });
  });
  
  router.post('/trigger/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      pendingScreenshots.add(agentId);
      res.json({ success: true, message: 'Screenshot zahtev kreiran' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const processedAlerts = new Set();

  async function checkAndTriggerScreenshots() {
    try {
      const { searchAlerts } = require('../services/opensearch');
      const { apiRequest } = require('../services/wazuhApi');

      // Dohvati sve agente
      const agentsData = await apiRequest('get', '/agents', { status: 'active' });
      const agents = agentsData.data.affected_items.filter(a => a.id !== '000');

      for (const agent of agents) {
        // Dohvati kritične alerte poslednjih 2 minuta
        const alerts = await searchAlerts(agent.id, { limit: 10 });
        
        const criticalAlerts = alerts.filter(a => {
          const alertId = a.id;
          const isCritical = a.rule?.level >= 10 || 
            a.rule?.groups?.includes('syscheck') ||
            a.rule?.id === '18101'; // USB
          
          // Preskoci vec procesirane alerte
          if (processedAlerts.has(alertId)) return false;
          if (isCritical) processedAlerts.add(alertId);
          return isCritical;
        });

        if (criticalAlerts.length > 0) {
          console.log(`Auto screenshot za agenta ${agent.id} — ${criticalAlerts.length} kritičnih alertova`);
          pendingScreenshots.add(agent.id);
        }
      }

      if (processedAlerts.size > 1000) processedAlerts.clear();

    } catch (err) {
      console.error('Auto screenshot greška:', err.message);
    }
  }

  // Provera na 30 sekundi
  setInterval(checkAndTriggerScreenshots, 30000);

module.exports = router;