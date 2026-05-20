const express = require('express');
const router = express.Router();

let stanje = {
  aktivan: false,
  pocetak: null,
  kraj: null,
};

router.post('/start', (req, res) => {
  stanje = { aktivan: true, pocetak: new Date().toISOString(), kraj: null };
  res.json({ success: true, pocetak: stanje.pocetak });
});

router.post('/stop', (req, res) => {
  stanje = { ...stanje, aktivan: false, kraj: new Date().toISOString() };
  res.json({ success: true, kraj: stanje.kraj });
});

router.get('/status', (req, res) => {
  res.json({ data: stanje });
});

module.exports = router;
