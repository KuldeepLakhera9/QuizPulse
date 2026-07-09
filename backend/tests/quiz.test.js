import request from 'supertest';
import mongoose from 'mongoose';
import { app, server } from '../src/server.js';
import { validateAiQuestions } from '../src/routes/quizRoutes.js';
import { redisClient, pubClient, subClient } from '../src/config/redis.js';

describe('Quiz API & AI Schema Validation Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Ensure database connection is ready
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quizpulse');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await new Promise((resolve) => server.close(resolve));
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
  });

  describe('validateAiQuestions helper function', () => {
    it('should validate a correct question array schema', () => {
      const validQuestions = [
        {
          text: 'What hook is used for performing side effects?',
          options: ['useState', 'useEffect', 'useContext', 'useReducer'],
          correctIndex: 1,
          difficulty: 'medium'
        }
      ];
      expect(validateAiQuestions(validQuestions, 1)).toBe(true);
    });

    it('should fail validation when count of questions does not match target', () => {
      const validQuestions = [
        {
          text: 'Question text?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
          difficulty: 'medium'
        }
      ];
      // Expected length is 2, actual is 1
      expect(validateAiQuestions(validQuestions, 2)).toBe(false);
    });

    it('should fail validation if options list length is not exactly 4', () => {
      const invalidQuestions = [
        {
          text: 'Question text?',
          options: ['useState', 'useEffect'],
          correctIndex: 1,
          difficulty: 'medium'
        }
      ];
      expect(validateAiQuestions(invalidQuestions, 1)).toBe(false);
    });

    it('should fail validation when correctIndex is out of bounds', () => {
      const invalidQuestions = [
        {
          text: 'Question text?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 4, // Must be 0-3
          difficulty: 'easy'
        }
      ];
      expect(validateAiQuestions(invalidQuestions, 1)).toBe(false);
    });
  });

  describe('POST /api/quizzes Validation', () => {
    it('should return 400 Bad Request with details if validation schemas fail', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .send({
          title: '', // Empty: Invalid
          hostName: 'Trainer A',
          questions: [] // Empty list: Invalid
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Validation Error');
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 if correctIndex is missing or invalid', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .send({
          title: 'Zod Test',
          hostName: 'Trainer B',
          questions: [
            {
              text: 'Is Jest fast?',
              options: ['Yes', 'No', 'Maybe', 'Never'],
              correctIndex: 9 // Out of range: Invalid
            }
          ]
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Validation Error');
    });
  });
});
