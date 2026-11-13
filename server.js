'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const vault = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'vault.json'), 'utf8'));
const AUDIT_FILE = path.join(__dirname, 'data', 'audit.log');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- helpers ---------- */
function humanDowntime(mins) {
  if (mins >= 120) return (mins / 60).toFixed(1) + ' hours';
  if (mins >= 1) return Math.round(mins) + ' minutes';
  return Math.round(mins * 60) + ' seconds';
}
function audit(entry) {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  fs.appendFile(AUDIT_FILE, line + '\n', () => {});
}

/* In-memory state for the 3-2-1 checklist (resets when the server restarts) */
let backupRules = { copies: false, media: false, offsite: false };

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) }));

app.get('/api/tiers', (req, res) => res.json(vault.tiers));
app.get('/api/tiers/:name', (req, res) => {
  const tier = vault.tiers[req.params.name];
  return tier ? res.json(tier) : res.status(404).json({ error: 'Unknown tier. Use hot, warm or cold.' });
});

app.get('/api/lifecycle', (req, res) => res.json(vault.lifecycle));
app.get('/api/targets', (req, res) => res.json(vault.targets));

app.get('/api/access', (req, res) => res.json(vault.access));

/* Check whether a role may open a resource. Every check is logged. */
app.post('/api/access/check', (req, res) => {
  const { role, resource } = req.body || {};
  const rules = vault.access[role];
  if (!rules) return res.status(400).json({ error: 'Unknown role.' });
  const match = rules.find(([name]) => name.toLowerCase() === String(resource || '').toLowerCase());
  if (!match) return res.status(404).json({ error: 'Unknown resource for this role.' });
  const allowed = match[1] === 1;
  audit({ role, resource: match[0], allowed });
  res.json({ role, resource: match[0], allowed });
});

app.get('/api/audit-log', (req, res) => {
  fs.readFile(AUDIT_FILE, 'utf8', (err, text) => {
    if (err) return res.json([]);
    const rows = text.trim().split('\n').slice(-50).map(l => JSON.parse(l));
    res.json(rows.reverse());
  });
});

/* Yearly downtime allowed at a given availability percentage */
app.get('/api/availability', (req, res) => {
  const percent = parseFloat(req.query.percent);
  if (!(percent >= 90 && percent < 100)) {
    return res.status(400).json({ error: 'percent must be at least 90 and below 100.' });
  }
  const minutes = (1 - percent / 100) * 365 * 24 * 60;
  res.json({ percent, downtimeMinutesPerYear: +minutes.toFixed(2), downtime: humanDowntime(minutes) });
});

/* 3-2-1 backup checklist */
app.get('/api/backup', (req, res) => {
  const done = Object.values(backupRules).filter(Boolean).length;
  res.json({ rules: backupRules, done, complete: done === 3 });
});
app.post('/api/backup', (req, res) => {
  const body = req.body || {};
  for (const key of Object.keys(backupRules)) {
    if (typeof body[key] === 'boolean') backupRules[key] = body[key];
  }
  const done = Object.values(backupRules).filter(Boolean).length;
  res.json({ rules: backupRules, done, complete: done === 3 });
});

/* ---------- errors ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`Campus Data Vault running at http://localhost:${PORT}`));
