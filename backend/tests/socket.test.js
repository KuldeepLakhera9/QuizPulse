import { io as Client } from 'socket.io-client';
import mongoose from 'mongoose';
import { server } from '../src/server.js';
import { redisClient, pubClient, subClient } from '../src/config/redis.js';

describe('Socket.io Real-time Event Handlers Tests', () => {
  let clientSocket;
  let port;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    
    // Ensure database connection is ready
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quizpulse_test');
    }

    // Since server.js automatically runs listen on import, we inspect the active port
    if (server.listening) {
      const address = server.address();
      port = address && typeof address === 'object' ? address.port : 5001;
    } else {
      await new Promise((resolve) => {
        server.listen(0, () => {
          port = server.address().port;
          resolve();
        });
      });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await new Promise((resolve) => server.close(resolve));
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
  });

  beforeEach((done) => {
    clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      'force new connection': true
    });
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('player:join-room', () => {
    it('should return error if room does not exist in Redis', (done) => {
      clientSocket.emit('player:join-room', { roomCode: 'FAKE12', nickname: 'Tester' });
      
      clientSocket.on('error', (data) => {
        expect(data.message).toContain('Room not found');
        done();
      });
    });

    it('should join successfully if room exists in Redis', (done) => {
      const roomCode = 'ROOM12';
      
      // Seed active session state in Redis directly
      redisClient.hset(`room:${roomCode}`, {
        quizId: new mongoose.Types.ObjectId().toString(),
        hostSocketId: 'host-socket-mock-id',
        status: 'lobby',
        currentQuestionIndex: '-1',
        players: '[]',
        answersReceived: '[]'
      }).then(() => {
        clientSocket.emit('player:join-room', { roomCode, nickname: 'Kuldeep' });
      });

      clientSocket.on('player:join-success', (data) => {
        expect(data.roomCode).toBe(roomCode);
        expect(data.nickname).toBe('Kuldeep');
        expect(data.sessionStatus).toBe('lobby');
        done();
      });
    });
  });
});
