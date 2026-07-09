import { z } from 'zod';
import logger from '../config/logger.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      logger.warn('Validation failed for request body', { errorDetails, url: req.originalUrl });
      return res.status(400).json({ 
        message: 'Validation Error: Invalid input parameters.',
        errors: errorDetails
      });
    }
    next(error);
  }
};

// Quiz Creation Schema
export const createQuizSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  hostName: z.string().trim().min(1, 'Host nickname is required.'),
  questions: z.array(
    z.object({
      text: z.string().trim().min(1, 'Question text is required.'),
      options: z.array(z.string().trim().min(1, 'Option text cannot be empty.')).length(4, 'Exactly 4 options are required.'),
      correctIndex: z.number().int().min(0).max(3, 'Correct index must be between 0 and 3.'),
      timeLimit: z.number().int().positive().default(20),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium')
    })
  ).min(1, 'At least one question is required.')
});

// AI Question Generation Schema
export const generateAiSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required.'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard']).transform(val => val.toLowerCase()),
  numQuestions: z.union([z.number(), z.string().transform(Number)]).pipe(
    z.number().int().refine(val => [5, 10, 15].includes(val), {
      message: 'Questions count must be 5, 10, or 15.'
    })
  )
});
