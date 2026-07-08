# QuizPulse 🎮⚡

QuizPulse is a real-time collaborative quiz application (similar to Kahoot) built using the MERN stack and Socket.io. It supports server-authoritative timer ticking, dynamic live leaderboards, animated rank change podiums, and seamless player disconnection/reconnection handling.

---

## Technical Stack

- **Frontend**: React (Vite) + Tailwind CSS + Socket.io-client
- **Backend**: Node.js + Express + Socket.io server
- **Database**: MongoDB + Mongoose (schemas: `Quiz`, `GameSession`, `PlayerResult`)
- **Real-Time Synchronization**: WebSockets via Socket.io

---

## Folder Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/db.js          # Database connection setup
│   │   ├── models/               # Mongoose Schemas (Quiz, GameSession, PlayerResult)
│   │   ├── routes/quizRoutes.js  # Quiz CRUD REST endpoints
│   │   ├── socket/handlers.js    # Authoritative socket event controllers
│   │   └── server.js             # HTTP/Express entrypoint
│   └── .env                      # Server configuration variables
└── frontend/
    ├── src/
    │   ├── components/           # Modular UI screens (Lobby, Active Game, Leaderboard, Podium)
    │   ├── socket.js             # Client Socket.io connection manager
    │   ├── App.jsx               # Core view routing and Socket listener hook
    │   └── index.css             # Base styles, animations, and Tailwind directives
    └── tailwind.config.js
```

---

## Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/quizpulse
NODE_ENV=development
```

### Frontend (`frontend/.env` - Optional)
If your backend is running on a different URL/port than `http://localhost:5001`, you can create a `.env` file in the `frontend/` directory:

```env
VITE_BACKEND_URL=http://localhost:5001
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB installed and running locally on port `27017`

### 1. Run the Backend Server
```bash
cd backend
npm install
npm run dev
```
The server will start on port `5001` and connect to the local MongoDB database.

### 2. Run the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Interview Talking Points: Real-time State Synchronization

When presenting this project in an interview, focus on these synchronization challenges and how they were solved:

> **Real-Time State Synchronization Challenge & Solution:**
> In QuizPulse, the primary challenge was implementing a server-authoritative quiz flow that maintains absolute sync between all clients (host and multiple players) while resisting client-side tampering. Rather than relying on fragile local client timers, the backend Node.js server drives the countdown loop (`server:timer-tick`) and manages state changes. Player scores are calculated server-side immediately upon answer reception by checking correctness and measuring milliseconds elapsed (`Date.now() - questionStartTime`) against the authoritative start timestamp saved in MongoDB. To ensure a seamless user experience, we handled edge cases like sudden player disconnection or page reloads mid-game: the backend preserves the player's session profile, score, and state in MongoDB. When a disconnected player re-enters the room code and nickname, the socket server dynamically updates their socket association, joins them back to the room, and broadcasts the current game's exact question, timer, and state, resuming gameplay smoothly without breaking room integrity.
