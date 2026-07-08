import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  socketId: { type: String, default: null }, // can be null when disconnected
  nickname: { type: String, required: true },
  score: { type: Number, default: 0 }
});

const gameSessionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  roomCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['lobby', 'active', 'finished'], default: 'lobby' },
  players: { type: [playerSchema], default: [] },
  currentQuestionIndex: { type: Number, default: -1 },
  questionStartTime: { type: Date, default: null },
  answersReceived: { type: [String], default: [] }, // Array of nicknames who answered the current question
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

const GameSession = mongoose.model('GameSession', gameSessionSchema);
export default GameSession;
