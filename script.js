'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Storage tiers */
const tiers = {
  hot:  { Data: 'Exam portal, learning platform, timetable', Storage: 'Flash disks on a SAN', Protection: 'RAID 10', Access: 'Seconds matter', Cost: 'Highest per GB' },
  warm: { Data: 'Student records, course files, lecture recordings', Storage: 'NAS', Protection: 'RAID 6 with deduplication', Access: 'Daily use', Cost: 'Medium per GB' },
  cold: { Data: 'Alumni records, old exam papers, audit files', Storage: 'Cloud object storage or tape', Protection: 'Kept 7+ years', Access: 'Rarely opened', Cost: 'Lowest per GB' }
};
function showTier(key) {
  $$('.tier').forEach(b => b.setAttribute('aria-selected', b.dataset.tier === key));
  $('#tierDetail').innerHTML = '<dl>' + Object.entries(tiers[key]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';
}
$$('.tier').forEach(b => b.addEventListener('click', () => showTier(b.dataset.tier)));
showTier('hot');

/* 3-2-1 rule */
const boxes = $$('.rule input');
boxes.forEach(b => b.addEventListener('change', () => {
  const n = boxes.filter(x => x.checked).length;
  $('#ruleMsg').textContent = n === 3 ? 'All 3 rules in place. The backup plan is complete.' : `${n} of 3 rules in place.`;
}));

/* Access matrix */
const access = {
  students:  [['Own results and files', 1], ['Other students\u2019 records', 0], ['Marks entry', 0], ['Storage systems', 0], ['Exam content', 0]],
  faculty:   [['Their own courses', 1], ['Their marks entry', 1], ['Student records', 0], ['Storage systems', 0], ['Exam content (own papers)', 1]],
  registrar: [['Student records', 1], ['Marks entry', 0], ['Storage systems', 0], ['Exam content', 0]],
  it:        [['Storage systems', 1], ['Backups and snapshots', 1], ['Exam content', 0], ['Student records content', 0]]
};
function showRole(role) {
  $$('.roles button').forEach(b => b.setAttribute('aria-selected', b.dataset.role === role));
  $('#matrix').innerHTML = access[role].map(([d, ok]) => `<tr><td>${d}</td><td class="${ok ? 'ok' : 'no'}">${ok ? 'Allowed' : 'Blocked'}</td></tr>`).join('');
}
$$('.roles button').forEach(b => b.addEventListener('click', () => showRole(b.dataset.role)));
showRole('students');

/* Lifecycle */
const steps = [
  ['Create', 'Marks, videos and forms enter the system.'],
  ['Store', 'Placed in the hot or warm tier.'],
  ['Protect', 'Snapshot, backup, replicate.'],
  ['Archive', 'Moved to cold storage after a set time.'],
  ['Dispose', 'Securely erased when retention ends.']
];
let cur = 0;
$('#steps').innerHTML = steps.map(([t], i) => `<li><button data-i="${i}"><span class="dot">${i + 1}</span><b>${t}</b></button></li>`).join('');
function renderSteps() {
  $$('#steps li').forEach((li, i) => li.className = i < cur ? 'done' : i === cur ? 'current' : '');
  $('#stepDetail').innerHTML = `<b>${steps[cur][0]}.</b> ${steps[cur][1]}`;
  $('#prev').disabled = cur === 0;
  $('#next').disabled = cur === steps.length - 1;
}
$('#steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { cur = +b.dataset.i; renderSteps(); } });
$('#prev').addEventListener('click', () => { cur--; renderSteps(); });
$('#next').addEventListener('click', () => { cur++; renderSteps(); });
renderSteps();

/* Availability calculator */
function fmt(mins) {
  if (mins >= 120) return (mins / 60).toFixed(1) + ' hours';
  if (mins >= 1) return Math.round(mins) + ' minutes';
  return Math.round(mins * 60) + ' seconds';
}
function updateAvail() {
  const v = parseFloat($('#avail').value);
  $('#availOut').textContent = v.toFixed(2).replace(/0$/, '') + '%';
  $('#downtime').textContent = fmt((1 - v / 100) * 365 * 24 * 60);
}
$('#avail').addEventListener('input', updateAvail);
updateAvail();

/* Highlight current section in nav */
const links = $$('.nav a');
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
$$('main section[id]').forEach(s => io.observe(s));

/* ---------- Backend connection (falls back to the built-in data if the API is offline) ---------- */
(async () => {
  try {
    const [t, a] = await Promise.all([fetch('/api/tiers'), fetch('/api/access')]);
    if (!t.ok || !a.ok) return;
    Object.assign(tiers, await t.json());
    Object.assign(access, await a.json());
    showTier('hot');
    showRole('students');
  } catch (e) { /* static mode: no server running */ }
})();

async function syncAvailability() {
  try {
    const r = await fetch('/api/availability?percent=' + $('#avail').value);
    if (r.ok) $('#downtime').textContent = (await r.json()).downtime;
  } catch (e) { /* keep locally calculated value */ }
}
$('#avail').addEventListener('input', syncAvailability);
syncAvailability();

const ruleKeys = ['copies', 'media', 'offsite'];
boxes.forEach(b => b.addEventListener('change', () => {
  const body = Object.fromEntries(boxes.map((x, i) => [ruleKeys[i], x.checked]));
  fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}));
