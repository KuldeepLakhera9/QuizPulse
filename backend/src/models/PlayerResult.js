import mongoose from 'mongoose';

const answerResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selected: { type: Number, required: true }, // index of selected option (0-3)
  correct: { type: Boolean, required: true },
  timeTakenMs: { type: Number, required: true }
});

const playerResultSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameSession', required: true },
  nickname: { type: String, required: true },
  answers: { type: [answerResultSchema], default: [] },
  finalScore: { type: Number, required: true },
  rank: { type: Number, required: true }
}, { timestamps: true });

const PlayerResult = mongoose.model('PlayerResult', playerResultSchema);
export default PlayerResult;
