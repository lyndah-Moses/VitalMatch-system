# VitalMatch

## Overview

VitalMatch is a real-time geospatial blood donation platform connecting verified hospitals in Kenya with voluntary blood donors. Built as a Final Year Project demonstration.

**Brand:** VitalMatch - "Connecting Life in Real-Time"
**Primary:** Medical Red (#D32F2F) | **Success:** Healthy Green (#388E3C) | **Background:** White (#FFFFFF)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/vitalmatch)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: Gemini (via Replit AI Integrations) for AICheck Eligibility Assistant
- **Maps**: react-leaflet + OpenStreetMap
- **Charts**: recharts
- **Auth**: Custom JWT with SHA-256 hashing
- **Build**: esbuild (ESM bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API server (port 8080, path /api)
│   └── vitalmatch/          # React+Vite frontend (port 18411, path /)
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   ├── db/                  # Drizzle ORM schema + DB connection
│   └── integrations-gemini-ai/  # Gemini AI integration client
└── scripts/                 # Utility scripts
```

## Database Schema

- `users` - All users (hospitals and donors) with role-based auth
- `hospitals` - Hospital profiles with GPS coordinates
- `donors` - Donor profiles with blood type, location, badges
- `appeals` - Emergency blood appeal requests
- `appeal_responses` - Donor responses (accept/decline) with QR tokens
- `donations` - Donation tracking with status pipeline
- `conversations` - Gemini AI chat conversations
- `messages` - Chat messages

## Demo Accounts

All demo accounts use password: `password`

- **Hospital**: nairobi@vitalmatch.ke (Nairobi Hospital)
- **Donor 1**: alice@vitalmatch.ke (O+ blood, Silver Donor)
- **Donor 2**: bob@vitalmatch.ke (A- blood, Gold Donor)
- **Donor 3**: carol@vitalmatch.ke (B+ blood, First Donor)

## Features

### Hospital Dashboard
- Emergency blood appeal creation with Critical/Urgent/Standard levels
- Live donor map (Leaflet.js) showing donors within 10km radius
- QR code verification portal for donor identity verification
- Reports & analytics with charts

### Donor Dashboard
- Health Passport with blood type and 56-day eligibility countdown
- Nearby emergency alerts with Accept/Decline functionality
- QR token generation for hospital verification
- Impact tracker with gamification badges
- Donation transparency feed (Confirmed → Collected → Screened → Transfused)
- AICheck Eligibility Assistant (Gemini AI chatbot)
- Community leaderboard

### Security
- JWT authentication (custom HMAC-SHA256)
- Time-sensitive QR tokens for donor verification handshake
- Role-based access control (hospital vs donor)
- 10km geofencing for blood type matching

## API Routes

All routes under `/api`:
- `POST /api/auth/login` - Login
- `POST /api/auth/register/donor` - Donor registration
- `POST /api/auth/register/hospital` - Hospital registration
- `GET /api/auth/me` - Current user
- `GET /api/hospitals/me` - Hospital profile
- `GET /api/hospitals/me/appeals` - Hospital's appeals
- `GET /api/hospitals/me/donors-map` - Nearby donors for map
- `GET /api/hospitals/me/stats` - Analytics data
- `POST /api/hospitals/me/verify-donor` - Verify QR token
- `POST /api/appeals` - Create appeal
- `GET /api/appeals/nearby` - Nearby appeals for donor
- `POST /api/appeals/{id}/respond` - Accept/decline appeal
- `GET /api/donors/me` - Donor profile
- `GET /api/donors/me/donations` - Donation history
- `GET /api/donors/me/token` - Active QR token
- `GET /api/donors/me/leaderboard` - Leaderboard
- `POST /api/gemini/conversations/{id}/messages` - AI chat (SSE streaming)

## Commands

- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API types
- `pnpm --filter @workspace/db run push` — Push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/vitalmatch run dev` — Start frontend
