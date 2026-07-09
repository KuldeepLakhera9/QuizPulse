# Pulse ⚡

Pulse is a real-time engagement platform for team training sessions, workshops, and live events.

<!-- PLACEHOLDER: Drop your hero screenshot or gameplay GIF here -->
<!-- <img src="docs/hero.gif" alt="Pulse Platform Demo" width="100%" /> -->

---

## Why This Exists
In interactive corporate learning, professional workshops, and remote team check-ins, engagement often lags due to static tools. Pulse was created to solve this by providing a highly responsive, synchronous presenter-led workspace that turns training sessions into lively, interactive exercises. Designed with sub-second synchronization and robust state persistence, Pulse scales horizontally to support thousands of active participants across concurrent workshop rooms.

---

## Features

### 📋 Core Engagement
- **Presenter-Led Sessions**: Presenters control room flows, advancing slides and questions synchronously to all participants.
- **Server-Authoritative Timing**: Prevents client-side manipulation. Timers tick on the backend and enforce points calculations based on speed and accuracy.
- **Standings & Podium**: Real-time leaderboards indicate rank changes dynamically between slides, culminating in an animated podium finish for winners.
- **Resilient Connection Recovery**: Participants retain progress and scores if their connection drops. Reconnecting immediately binds them back to the active room.

### 🤖 AI-Powered Content Creation
- **Insta-Generation via LLM**: Presenters can input any topic and configure question count and difficulty to auto-generate full workshop templates instantly.
- **Smart Schema Validation & Fallback**: The generator validates structure and constraints (such as exact counts, correct options, indexes), executing an automated prompt retry on the backend if a response is malformed.
- **IP Rate Limiting**: Built-in rate limiter controls API overhead costs and mitigates service spam.

### ⚙️ Under The Hood (Production Readiness)
- **Redis Session Storage**: In-memory active room states are moved off the server thread onto Redis hashes for sub-millisecond lookups and updates.
- **Horizontal Scaling Bridge**: Integrated Redis adapter bridges Socket.io instances, allowing active rooms to be spread across multiple backend servers.
- **Zod Schema Gatekeeping**: Public routes validate input shapes at the controller boundary, failing fast with structured `400 Bad Request` states.
- **Structured Logging**: Replaced generic console logging with JSON-based `winston` logging, capturing request durations and diagnostic categories.
- **Automated Test Coverage**: Rigorous test suite using Jest + Supertest (backend routes & live socket clients) and React Testing Library (frontend components).
- **GitHub Actions CI/CD Pipeline**: Triggers automated dependency installs, linters, and full test suites on every pull request.

---

## System Architecture

Pulse utilizes a decoupled, real-time message-brokered architecture designed to support horizontal scaling:

```
[ React Client ] 
       │ 
       ▼ (WebSockets via Socket.io)
[ Nginx Load Balancer / API Gateway ]
       │
       ├───────────────────────────────┐
       ▼                               ▼
[ Express Server (Node - Instance 1) ] [ Express Server (Node - Instance N) ]
       │                               │
       ├───────────────────────────────┴───────────────────────────────┐
       ▼ (Pub/Sub Adapter)                                             ▼ (Session Hash Store)
[ Redis Cluster / Cache ] ─────────────────────────────────────────► [ MongoDB (Persistent DB) ]
       │
       ▼ (Fetch REST)
[ Google Gemini Developer API ]
```

<!-- PLACEHOLDER: Add custom system architecture diagram here -->
<!-- <img src="docs/architecture.png" alt="Pulse System Architecture" width="80%" /> -->

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 (Vite) | High-speed hot module replacement, client-side rendering |
| **Styling** | Tailwind CSS v3 | Elegant layout utilities, transition ease configurations |
| **Real-time Client** | Socket.io-client | Live real-time bidirectional message socket |
| **Backend API** | Node.js + Express | REST routing endpoint engines and process runtime |
| **Real-time Gateway**| Socket.io | Server-side WebSocket connection and event orchestration |
| **Scaling Cache** | Redis (via ioredis) | Fast shared session hash persistence |
| **Inter-Process Sync**| @socket.io/redis-adapter | Message broker enabling horizontal cluster broadcasting |
| **Database Store** | MongoDB (via Mongoose) | Persistent records for quiz templates and historical rankings |
| **Logger Utility** | Winston | Categorized structured JSON stdout logging |
| **Input Validation** | Zod | Strictly enforced request body schema mapping |
| **API Protection** | express-rate-limit | Endpoint requests throttling preventing spam |
| **Test Suites** | Jest + Supertest / RTL | Automated testing of APIs, Sockets, and UI layers |

---

## Local Setup Instructions

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (running locally on port 27017 or a MongoDB Atlas string)
- **Redis** (running locally on port 6379)
- **Google Gemini API Key**

### 1. Clone & Set Up Configuration
```bash
git clone https://github.com/KuldeepLakhera9/QuizPulse.git
cd QuizPulse
```

Create a `.env` file in the **`backend`** directory:
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/quizpulse
REDIS_URL=redis://127.0.0.1:6379
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

### 2. Install & Run Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Install & Run Frontend
```bash
cd ../frontend
npm install --legacy-peer-deps
npm run dev
```
Open **`http://localhost:5173/`** (or the port Vite prints in your console) to view the live dashboard.

### 4. Running Test Suites
To run tests locally:
- **Backend Tests**: `cd backend && npm test`
- **Frontend Tests**: `cd frontend && npm test`

---

## Scaling Notes: Redis & Socket.io Adapter

When a real-time multiplayer application starts to scale, it is common to run multiple instances of the backend node process to handle the CPU load of active timers and connection volumes. However, this introduces two challenges in traditional setups:
1. **Broken Broadcasts**: If Presenter A is connected to Instance 1, and Participant B is connected to Instance 2, a socket broadcast from Instance 1 will not reach Instance 2.
2. **Scattered Memory**: If Instance 1 holds the player list in a local variable, Instance 2 knows nothing about it.

By introducing `@socket.io/redis-adapter`, we transform Redis into a central message broker. Every broadcast event is published to a Redis channel, which is then picked up and transmitted to clients by all other Node instances in the cluster. Combined with storing volatile session states in shared Redis Hashes (`room:<roomCode>`), any backend server in our cluster can instantly fetch, update, and broadcast the authoritative game states. This setup allows Pulse to scale horizontally from a single developer machine to a load-balanced cluster of N servers without code modifications.

---

## License & Contribution
Distributed under the MIT License. Pull Requests (PRs) and suggestions are always welcome!
