import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [
      (val) => val.length === 4,
      'A question must have exactly 4 options'
    ]
  },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
  timeLimit: { type: Number, default: 20 }, // in seconds
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  hostName: { type: String, required: true },
  questions: { type: [questionSchema], default: [] }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
