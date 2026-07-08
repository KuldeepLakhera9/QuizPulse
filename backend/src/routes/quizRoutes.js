import express from 'express';
import Quiz from '../models/Quiz.js';

const router = express.Router();

// @desc    Create a new quiz
// @route   POST /api/quizzes
router.post('/', async (req, res) => {
  try {
    const { title, hostName, questions } = req.body;
    
    if (!title || !hostName) {
      return res.status(400).json({ message: 'Title and Host Name are required' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Validate structure of questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({ message: `Question ${i + 1} must have text and exactly 4 options` });
      }
      if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) {
        return res.status(400).json({ message: `Question ${i + 1} must have a correctIndex between 0 and 3` });
      }
    }

    const quiz = new Quiz({ title, hostName, questions });
    const createdQuiz = await quiz.save();
    res.status(201).json(createdQuiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all quizzes
// @route   GET /api/quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get a specific quiz by ID
// @route   GET /api/quizzes/:id
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a specific quiz
// @route   DELETE /api/quizzes/:id
router.delete('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    await Quiz.deleteOne({ _id: req.params.id });
    res.json({ message: 'Quiz removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
