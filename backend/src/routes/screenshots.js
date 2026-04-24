const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Prima screenshot kao base64 JSON
router.post('/upload/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const { image, timestamp } = req.body;

    if (!image) return res.status(400).json({ error: 'Nema slike' });

    const filename = `${agentId}_${timestamp || Date.now()}.png`;
    const filePath = path.join(screenshotDir, filename);

    const buffer = Buffer.from(image, 'base64');
    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      filename,
      url: `/api/screenshots/view/${filename}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista screenshotova za agenta
router.get('/list/:agentId', (req, res) => {
  const { agentId } = req.params;
  try {
    const files = fs.readdirSync(screenshotDir)
      .filter(f => f.startsWith(agentId))
      .map(f => {
        const stats = fs.statSync(path.join(screenshotDir, f));
        return {
          filename: f,
          timestamp: stats.mtime,
          url: `/api/screenshots/view/${f}`
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ data: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prikaži screenshot
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

    const result = await apiRequest('put', `/active-response?agents_list=${agentId}`, {
      command: 'take-screenshot0',
      custom: true,
      arguments: []
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('Trigger error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: err.message,
      details: err.response?.data 
    });
  }
});

module.exports = router;