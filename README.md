# Campus Data Vault

An interactive website for the Information Storage and Management (ISM) mini project: a storage and protection plan that keeps a 5,000-student college's records, exams and lectures safe, fast and affordable.

## Features
- **Storage tiers:** select Hot, Warm or Cold to see the storage type, RAID level and cost.
- **3-2-1 backup rule:** tick each rule and track progress.
- **Who can see what:** switch between Students, Faculty, Registrar and IT admins.
- **File lifecycle:** step through Create, Store, Protect, Archive and Dispose.
- **Design targets:** RPO 4 hours, RTO 2 hours, 99.9% availability, plus a slider that converts any availability % into yearly downtime.

## Project structure
```
campus-data-vault/
├── public/              # frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
├── data/vault.json      # tiers, roles, lifecycle and targets served by the API
├── server.js            # Node.js + Express backend
├── package.json
├── .env.example
└── README.md
```

## Run locally
Requires Node.js 18 or newer.
```
npm install
npm start
```
Open http://localhost:3000. Use `npm run dev` to restart automatically on changes. Copy `.env.example` to `.env` to see the port setting (set `PORT` in your shell to change it).

The frontend still works if you open `public/index.html` directly: it falls back to built-in data when the API is offline.

## API
| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Server status |
| GET | `/api/tiers`, `/api/tiers/:name` | Hot, warm and cold tier details |
| GET | `/api/access` | Role permissions |
| POST | `/api/access/check` | Body `{ "role", "resource" }`. Returns allowed or blocked and logs the check |
| GET | `/api/audit-log` | Last 50 access checks (newest first) |
| GET | `/api/lifecycle` | The five lifecycle steps |
| GET | `/api/targets` | RPO, RTO, availability and cost targets |
| GET | `/api/availability?percent=99.9` | Yearly downtime allowed at that availability |
| GET / POST | `/api/backup` | 3-2-1 checklist state (`copies`, `media`, `offsite`). Kept in memory |

Example:
```
curl -X POST localhost:3000/api/access/check -H "Content-Type: application/json" -d '{"role":"students","resource":"Marks entry"}'
```

## Deploy
Host the whole folder on any Node.js host (Render, Railway, Fly.io, a VPS). Build command: `npm install`. Start command: `npm start`. GitHub Pages only serves static files, so it will show the frontend with built-in data and no API.

## Note
The RPO, RTO and availability figures are planning targets for the design, not measured results.
