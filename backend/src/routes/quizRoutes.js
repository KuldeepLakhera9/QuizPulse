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

// Helper validation for AI generated questions
const validateAiQuestions = (questions, numQuestions) => {
  if (!Array.isArray(questions)) return false;
  if (questions.length !== numQuestions) return false;
  
  for (const q of questions) {
    if (!q.text || typeof q.text !== 'string' || q.text.trim() === '') return false;
    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false;
    for (const opt of q.options) {
      if (typeof opt !== 'string' || opt.trim() === '') return false;
    }
    if (q.correctIndex === undefined || typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) return false;
    if (!q.difficulty || typeof q.difficulty !== 'string' || !['easy', 'medium', 'hard'].includes(q.difficulty.toLowerCase())) return false;
  }
  return true;
};

// Simple in-memory rate limiter (max 5 requests per minute per IP)
const ipRequestCounts = new Map();
const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 5;

  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, []);
  }

  const requests = ipRequestCounts.get(ip).filter(timestamp => now - timestamp < windowMs);
  if (requests.length >= maxRequests) {
    return res.status(429).json({ message: 'Rate limit exceeded: Max 5 requests per minute.' });
  }

  requests.push(now);
  ipRequestCounts.set(ip, requests);
  next();
};

// @desc    Generate questions using AI
// @route   POST /api/quiz/generate-ai
router.post('/generate-ai', rateLimiter, async (req, res) => {
  try {
    const { topic, difficulty, numQuestions } = req.body;

    // Validate inputs
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ message: 'Invalid or empty topic.' });
    }

    const cleanDifficulty = (difficulty || 'medium').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(cleanDifficulty)) {
      return res.status(400).json({ message: 'Difficulty must be Easy, Medium, or Hard.' });
    }

    const count = parseInt(numQuestions, 10);
    if (isNaN(count) || ![5, 10, 15].includes(count)) {
      return res.status(400).json({ message: 'Number of questions must be 5, 10, or 15.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not defined.');
      return res.status(500).json({ message: 'Gemini API Configuration Error: Key is missing.' });
    }

    const basePrompt = `Generate a quiz with exactly ${count} questions about the topic "${topic}".
The difficulty level for all questions must be "${cleanDifficulty}".
Return the output strictly in this JSON format (valid JSON array of objects, no markdown formatting blocks, no surrounding codeblock tags, just plain JSON text):
[
  {
    "text": "Question text here?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctIndex": 0,
    "difficulty": "${cleanDifficulty}"
  }
]`;

    let currentPrompt = basePrompt;
    let attempts = 0;
    let questions = null;
    let success = false;
    let lastErrorMsg = '';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    while (attempts < 2 && !success) {
      attempts++;
      try {
        const apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (!apiResponse.ok) {
          throw new Error(`Gemini API returned status ${apiResponse.status}: ${apiResponse.statusText}`);
        }

        const result = await apiResponse.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResponse) {
          throw new Error('Received an empty response from Gemini API.');
        }

        // Parse JSON
        questions = JSON.parse(textResponse.trim());

        // Validate structure
        if (validateAiQuestions(questions, count)) {
          success = true;
        } else {
          throw new Error('AI output failed schema validation constraints.');
        }
      } catch (err) {
        console.warn(`Attempt ${attempts} failed: ${err.message}`);
        lastErrorMsg = err.message;
        if (attempts < 2) {
          // Stricter prompt for second attempt
          currentPrompt = `${basePrompt}\n\nCRITICAL WARNING: Your previous response was invalid or failed schema checks. You must return a valid JSON array matching the request. Specifically:
- You must generate EXACTLY ${count} questions.
- Each question must have EXACTLY 4 options.
- The correctIndex must be a number between 0 and 3.
- The difficulty for all questions must be "${cleanDifficulty}".`;
        }
      }
    }

    if (success) {
      return res.json(questions);
    } else {
      return res.status(502).json({ 
        message: `Failed to generate a valid quiz after 2 attempts. Last error: ${lastErrorMsg}`
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

