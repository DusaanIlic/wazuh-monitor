const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const screenshotDir = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const screenshotScript = path.join(__dirname, '../../../scripts/take-screenshot.ps1');

function takeScreenshot(agentId) {
  return new Promise((resolve, reject) => {
    const filename = `${agentId}_${Date.now()}.png`;
    const outputPath = path.join(screenshotDir, filename);

    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', screenshotScript, '-OutputPath', outputPath],
      { timeout: 8000 },
      (err) => {
        if (err || !fs.existsSync(outputPath)) {
          return reject(err || new Error('Screenshot fajl nije kreiran'));
        }
        resolve(filename);
      }
    );
  });
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

router.post('/trigger/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { apiRequest } = require('../services/wazuhApi');

    const agentsData = await apiRequest('get', '/agents', {}, { agents_list: agentId });
    const agent = agentsData.data.affected_items?.[0];

    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentId} nije pronađen` });
    }

    try {
      const filename = await takeScreenshot(agentId);
      console.log(`Screenshot napravljen za agenta ${agentId}: ${filename}`);
      res.json({ success: true, filename, url: `/api/screenshots/view/${filename}` });
    } catch (err) {
      console.error(`Screenshot nije uspeo za agenta ${agentId}:`, err.message);
      res.status(500).json({ error: `Screenshot nije uspeo za agenta ${agentId}: ${err.message}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const recentAutoScreenshots = new Set();
const AUTO_SCREENSHOT_COOLDOWN_MS = 5 * 60 * 1000;

async function checkAndTriggerAutoScreenshots() {
  try {
    const { searchAlerts } = require('../services/opensearch');
    const { apiRequest } = require('../services/wazuhApi');

    const agentsData = await apiRequest('get', '/agents', { status: 'active' });
    const agents = agentsData.data.affected_items.filter(a => a.id !== '000');

    for (const agent of agents) {
      if (recentAutoScreenshots.has(agent.id)) continue;

      const alerts = await searchAlerts(agent.id, { timeRange: '5m', limit: 10 });

      const hasCriticalAlert = alerts.some(a =>
        a.rule?.level >= 10 || a.rule?.groups?.includes('usb')
      );

      if (hasCriticalAlert) {
        console.log(`Automatski screenshot okinut za agenta ${agent.id} (${agent.name || ''})`);
        recentAutoScreenshots.add(agent.id);
        setTimeout(() => recentAutoScreenshots.delete(agent.id), AUTO_SCREENSHOT_COOLDOWN_MS);
        try {
          await takeScreenshot(agent.id);
        } catch (err) {
          console.error(`Automatski screenshot nije uspeo za agenta ${agent.id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Auto screenshot greška:', err.message);
  }
}

setInterval(checkAndTriggerAutoScreenshots, 30000);

module.exports = router;