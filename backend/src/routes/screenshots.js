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

module.exports = router;