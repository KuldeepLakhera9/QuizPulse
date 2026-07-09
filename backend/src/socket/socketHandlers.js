/**
 * ============================================================================
 * HORIZONTAL SCALING & MULTI-SERVER STATE SYNCHRONIZATION (REDIS ADAPTER)
 * ============================================================================
 * 
 * WHY THIS MATTERS:
 * In a production-grade load-balanced architecture, horizontal scaling is achieved
 * by running multiple Node.js/Socket.io server instances behind a load balancer (e.g. Nginx).
 * Without central state persistence, two major problems occur:
 * 
 * 1. SOCKET BROADCAST SPLIT:
 *    If Player A is connected to Server Instance 1, and Player B is connected to Server Instance 2,
 *    an event broadcast from Server Instance 1 (like a question broadcast) will NOT reach Player B 
 *    unless the Socket.io instances are bridged. We solve this by attaching `@socket.io/redis-adapter`
 *    which passes broadcast packets across processes via Redis Pub/Sub channels.
 * 
 * 2. VOLATILE SESSION STATE SPLIT:
 *    Active session variables (player names, active scores, question indices, timer ticks) 
 *    cannot be stored in local server memory (`new Map()`) because subsequent socket requests 
 *    or reconnected players might land on different server instances. We solve this by migrating 
 *    all live room states to Redis Hashes (keyed by `room:<roomCode>`), making active room records 
 *    globally readable and writable by any cluster instance.
 * ============================================================================
 */

import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import PlayerResult from '../models/PlayerResult.js';
import { redisClient } from '../config/redis.js';
import logger from '../config/logger.js';

// Local in-memory registry ONLY for non-serializable Node event intervals/timers
// roomCode => { timerInterval, timeLeft, question }
const localTimerRegistry = new Map();

// Helper to fetch parsed GameSession state from Redis
const getSessionFromRedis = async (roomCode) => {
  try {
    const raw = await redisClient.hgetall(`room:${roomCode}`);
    if (!raw || Object.keys(raw).length === 0) return null;
    return {
      quizId: raw.quizId,
      hostSocketId: raw.hostSocketId,
      status: raw.status,
      currentQuestionIndex: parseInt(raw.currentQuestionIndex, 10),
      players: JSON.parse(raw.players || '[]'),
      answersReceived: JSON.parse(raw.answersReceived || '[]'),
      questionStartTime: raw.questionStartTime ? new Date(parseInt(raw.questionStartTime, 10)) : null
    };
  } catch (err) {
    logger.error('Failed to get session from Redis', { roomCode, error: err.message });
    return null;
  }
};

// Helper to update session state in Redis
const saveSessionToRedis = async (roomCode, data) => {
  try {
    const updates = {};
    if (data.quizId !== undefined) updates.quizId = String(data.quizId);
    if (data.hostSocketId !== undefined) updates.hostSocketId = String(data.hostSocketId);
    if (data.status !== undefined) updates.status = String(data.status);
    if (data.currentQuestionIndex !== undefined) updates.currentQuestionIndex = String(data.currentQuestionIndex);
    if (data.players !== undefined) updates.players = JSON.stringify(data.players);
    if (data.answersReceived !== undefined) updates.answersReceived = JSON.stringify(data.answersReceived);
    if (data.questionStartTime !== undefined) {
      updates.questionStartTime = data.questionStartTime ? String(new Date(data.questionStartTime).getTime()) : '';
    }

    if (Object.keys(updates).length > 0) {
      await redisClient.hset(`room:${roomCode}`, updates);
      await redisClient.expire(`room:${roomCode}`, 86400); // 24 Hours TTL for auto-cleanup
    }
  } catch (err) {
    logger.error('Failed to save session to Redis', { roomCode, error: err.message });
  }
};

// Helper to generate a unique 6-character room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info('New client socket connected', { id: socket.id });

    // --- HOST: CREATE ROOM ---
    socket.on('host:create-room', async ({ quizId, nickname }) => {
      try {
        if (!quizId) {
          socket.emit('error', { message: 'Quiz ID is required' });
          return;
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
          socket.emit('error', { message: 'Quiz template not found' });
          return;
        }

        let roomCode = generateRoomCode();
        let exists = await redisClient.exists(`room:${roomCode}`);
        while (exists) {
          roomCode = generateRoomCode();
          exists = await redisClient.exists(`room:${roomCode}`);
        }

        // Initialize active state in Redis
        await saveSessionToRedis(roomCode, {
          quizId: quiz._id,
          hostSocketId: socket.id,
          status: 'lobby',
          currentQuestionIndex: -1,
          players: [],
          answersReceived: [],
          questionStartTime: null
        });

        // Mirror backing session in MongoDB
        const session = new GameSession({
          quizId: quiz._id,
          roomCode,
          status: 'lobby',
          players: [],
          currentQuestionIndex: -1
        });
        await session.save();

        // Assign metadata to host socket
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.isHost = true;
        socket.nickname = nickname || 'Host';

        logger.info('Lobby room created and stored in Redis', { roomCode, hostId: socket.id });
        socket.emit('host:create-room-success', { roomCode, session });
      } catch (error) {
        logger.error('Error in host:create-room', { error: error.message });
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // --- PLAYER: JOIN ROOM ---
    socket.on('player:join-room', async ({ roomCode, nickname }) => {
      try {
        if (!roomCode || !nickname) {
          socket.emit('error', { message: 'Room code and nickname are required' });
          return;
        }

        const formattedCode = roomCode.trim().toUpperCase();
        const cleanNickname = nickname.trim();

        // Retrieve from Redis instead of hitting MongoDB for fast lookup
        const session = await getSessionFromRedis(formattedCode);
        if (!session) {
          socket.emit('error', { message: 'Room not found or game has concluded' });
          return;
        }

        // Handle reconnect scenario
        const playerIndex = session.players.findIndex(p => p.nickname.toLowerCase() === cleanNickname.toLowerCase());

        if (playerIndex !== -1) {
          session.players[playerIndex].socketId = socket.id;
          await saveSessionToRedis(formattedCode, { players: session.players });

          socket.join(formattedCode);
          socket.roomCode = formattedCode;
          socket.isHost = false;
          socket.nickname = cleanNickname;

          logger.info('Participant reconnected, updated socket ID in Redis', { formattedCode, nickname: cleanNickname, socketId: socket.id });
          
          socket.emit('player:join-success', { 
            roomCode: formattedCode, 
            nickname: cleanNickname,
            sessionStatus: session.status,
            currentQuestionIndex: session.currentQuestionIndex
          });

          io.to(formattedCode).emit('room:players-updated', session.players);

          // If session is already active, push the question state immediately
          if (session.status === 'active' && session.currentQuestionIndex >= 0) {
            const quiz = await Quiz.findById(session.quizId);
            const question = quiz.questions[session.currentQuestionIndex];
            const localTimer = localTimerRegistry.get(formattedCode);

            socket.emit('server:question-broadcast', {
              questionText: question.text,
              options: question.options,
              timeLimit: question.timeLimit,
              index: session.currentQuestionIndex,
              total: quiz.questions.length,
              alreadyAnswered: session.answersReceived.includes(cleanNickname),
              timeLeft: localTimer ? localTimer.timeLeft : 0
            });
          }
          return;
        }

        if (session.status === 'active') {
          socket.emit('error', { message: 'Session is currently active. Cannot join now.' });
          return;
        }

        // Register new player in Redis
        session.players.push({
          socketId: socket.id,
          nickname: cleanNickname,
          score: 0
        });
        await saveSessionToRedis(formattedCode, { players: session.players });

        socket.join(formattedCode);
        socket.roomCode = formattedCode;
        socket.isHost = false;
        socket.nickname = cleanNickname;

        logger.info('New participant registered in Redis hash', { formattedCode, nickname: cleanNickname });

        socket.emit('player:join-success', { 
          roomCode: formattedCode, 
          nickname: cleanNickname,
          sessionStatus: session.status,
          currentQuestionIndex: -1
        });

        io.to(formattedCode).emit('room:players-updated', session.players);
      } catch (error) {
        logger.error('Error in player:join-room', { error: error.message });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // --- HOST: START QUIZ ---
    socket.on('host:start-quiz', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const session = await getSessionFromRedis(formattedCode);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (!socket.isHost && session.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized: Only the host can start the session' });
          return;
        }

        // Update active status in Redis
        await saveSessionToRedis(formattedCode, {
          status: 'active',
          currentQuestionIndex: 0
        });

        // Sync state back to MongoDB
        await GameSession.findOneAndUpdate({ roomCode: formattedCode }, {
          status: 'active',
          currentQuestionIndex: 0
        });

        const quiz = await Quiz.findById(session.quizId);
        if (!quiz || quiz.questions.length === 0) {
          socket.emit('error', { message: 'Session template questions are missing' });
          return;
        }

        broadcastQuestion(io, formattedCode, 0, quiz);
      } catch (error) {
        logger.error('Error in host:start-quiz', { error: error.message });
        socket.emit('error', { message: 'Failed to start session' });
      }
    });

    // --- PLAYER: SUBMIT ANSWER ---
    socket.on('player:submit-answer', async ({ roomCode, nickname, selectedIndex }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const session = await getSessionFromRedis(formattedCode);
        const localTimer = localTimerRegistry.get(formattedCode);

        if (!session || !localTimer || !localTimer.question) {
          socket.emit('error', { message: 'No active question found for this session.' });
          return;
        }

        if (session.answersReceived.includes(nickname)) {
          socket.emit('error', { message: 'Answer has already been submitted.' });
          return;
        }

        const currentQuestion = localTimer.question;
        const timeTakenMs = Date.now() - session.questionStartTime.getTime();
        const timeTakenSeconds = timeTakenMs / 1000;
        const isCorrect = selectedIndex === currentQuestion.correctIndex;

        let pointsEarned = 0;
        if (isCorrect) {
          const basePoints = 1000;
          const ratio = timeTakenSeconds / currentQuestion.timeLimit;
          pointsEarned = Math.round(basePoints * (1 - ratio));
          pointsEarned = Math.max(100, Math.min(basePoints, pointsEarned));
        }

        const player = session.players.find(p => p.nickname === nickname);
        if (player) {
          player.score += pointsEarned;
        }

        session.answersReceived.push(nickname);
        await saveSessionToRedis(formattedCode, {
          players: session.players,
          answersReceived: session.answersReceived
        });

        // Persist progress to MongoDB asynchronously in the background
        PlayerResult.findOneAndUpdate(
          { sessionId: session._id || await getSessionMongoId(formattedCode), nickname },
          { 
            $push: { 
              answers: { 
                questionId: currentQuestion._id, 
                selected: selectedIndex, 
                correct: isCorrect, 
                timeTakenMs 
              } 
            },
            $set: { finalScore: player ? player.score : 0 }
          },
          { upsert: true }
        ).catch(err => logger.error('MongoDB async player result update failed', { error: err.message }));

        // Emit feedback directly to player
        socket.emit('player:submit-feedback', {
          isCorrect,
          correctIndex: currentQuestion.correctIndex,
          pointsEarned,
          totalScore: player ? player.score : 0
        });

        // Notify Host
        const activePlayersCount = session.players.filter(p => p.socketId !== null).length;
        io.to(formattedCode).emit('room:answer-submitted', {
          answersCount: session.answersReceived.length,
          totalPlayers: activePlayersCount
        });

        // If everyone connection-active has responded, reveal question early
        if (session.answersReceived.length >= activePlayersCount) {
          revealQuestionResults(io, formattedCode);
        }
      } catch (error) {
        logger.error('Error in player:submit-answer', { error: error.message });
        socket.emit('error', { message: 'Failed to submit response.' });
      }
    });

    // --- HOST: NEXT QUESTION ---
    socket.on('host:next-question', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const session = await getSessionFromRedis(formattedCode);

        if (!session || session.status !== 'active') {
          socket.emit('error', { message: 'Session is not active' });
          return;
        }

        const quiz = await Quiz.findById(session.quizId);
        const nextIndex = session.currentQuestionIndex + 1;

        if (nextIndex >= quiz.questions.length) {
          await endGameAndBroadcastResults(io, formattedCode, session);
        } else {
          await saveSessionToRedis(formattedCode, {
            currentQuestionIndex: nextIndex,
            answersReceived: []
          });

          await GameSession.findOneAndUpdate({ roomCode: formattedCode }, {
            currentQuestionIndex: nextIndex
          });

          broadcastQuestion(io, formattedCode, nextIndex, quiz);
        }
      } catch (error) {
        logger.error('Error in host:next-question', { error: error.message });
        socket.emit('error', { message: 'Failed to advance to next question' });
      }
    });

    // --- HOST: END QUIZ ---
    socket.on('host:end-quiz', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const session = await getSessionFromRedis(formattedCode);
        if (session) {
          await endGameAndBroadcastResults(io, formattedCode, session);
        }
      } catch (error) {
        logger.error('Error in host:end-quiz', { error: error.message });
        socket.emit('error', { message: 'Failed to end session' });
      }
    });

    // --- CLEANUP ON DISCONNECT ---
    socket.on('disconnect', async () => {
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      const formattedCode = roomCode.toUpperCase();
      const session = await getSessionFromRedis(formattedCode);
      if (!session) return;

      if (socket.isHost) {
        logger.warn('Host disconnected, starting grace period', { formattedCode, hostId: socket.id });
        
        // Use a timeout to verify if host re-registers on this or another cluster node
        // In Redis, we could set a lock or handle locally. To keep it clean, set local timeout:
        const localTimer = localTimerRegistry.get(formattedCode) || {};
        if (localTimer.hostTimeout) clearTimeout(localTimer.hostTimeout);
        
        localTimer.hostTimeout = setTimeout(async () => {
          logger.info('Host reconnect window expired, concluding room session', { formattedCode });
          const freshSession = await getSessionFromRedis(formattedCode);
          if (freshSession && freshSession.status !== 'finished') {
            await endGameAndBroadcastResults(io, formattedCode, freshSession);
          }
        }, 60000); // 60s
        localTimerRegistry.set(formattedCode, localTimer);
      } else {
        // Player disconnected: update socket ID to null in Redis
        const player = session.players.find(p => p.socketId === socket.id);
        if (player) {
          logger.info('Participant socket disconnected', { formattedCode, nickname: player.nickname });
          player.socketId = null;
          await saveSessionToRedis(formattedCode, { players: session.players });
          io.to(formattedCode).emit('room:players-updated', session.players);
        }
      }
    });

    // --- RECONNECT HOST ---
    socket.on('host:reconnect-room', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const session = await getSessionFromRedis(formattedCode);

        if (!session) {
          socket.emit('error', { message: 'Session concluded or not found.' });
          return;
        }

        // Cancel the concluding grace period timeout
        const localTimer = localTimerRegistry.get(formattedCode);
        if (localTimer && localTimer.hostTimeout) {
          clearTimeout(localTimer.hostTimeout);
          localTimer.hostTimeout = null;
        }

        await saveSessionToRedis(formattedCode, { hostSocketId: socket.id });

        socket.join(formattedCode);
        socket.roomCode = formattedCode;
        socket.isHost = true;
        socket.nickname = 'Host';

        logger.info('Host successfully reconnected to session', { formattedCode, hostId: socket.id });
        socket.emit('host:reconnect-success', { roomCode: formattedCode, session });
        socket.emit('room:players-updated', session.players);
      } catch (error) {
        logger.error('Error in host:reconnect-room', { error: error.message });
        socket.emit('error', { message: 'Failed to reconnect host.' });
      }
    });
  });
};

// Helper: Broadcast question and start timer loop
const broadcastQuestion = async (io, roomCode, questionIndex, quiz) => {
  const question = quiz.questions[questionIndex];
  
  // Set question details in local registry
  const localTimer = localTimerRegistry.get(roomCode) || { timerInterval: null, timeLeft: 0, question: null };
  if (localTimer.timerInterval) {
    clearInterval(localTimer.timerInterval);
  }

  localTimer.question = question;
  localTimer.timeLeft = question.timeLimit;
  localTimerRegistry.set(roomCode, localTimer);

  // Update starting time in Redis
  await saveSessionToRedis(roomCode, {
    questionStartTime: new Date()
  });

  // Broadcast question to all clients
  io.to(roomCode).emit('server:question-broadcast', {
    questionText: question.text,
    options: question.options,
    timeLimit: question.timeLimit,
    index: questionIndex,
    total: quiz.questions.length,
    timeLeft: question.timeLimit
  });

  // Server-authoritative timer interval tick
  localTimer.timerInterval = setInterval(async () => {
    localTimer.timeLeft--;
    io.to(roomCode).emit('server:timer-tick', { timeLeft: localTimer.timeLeft });

    if (localTimer.timeLeft <= 0) {
      clearInterval(localTimer.timerInterval);
      localTimer.timerInterval = null;
      revealQuestionResults(io, roomCode);
    }
  }, 1000);
  localTimerRegistry.set(roomCode, localTimer);
};

// Helper: Reveal answers and leaderboard standing
const revealQuestionResults = async (io, roomCode) => {
  const localTimer = localTimerRegistry.get(roomCode);
  if (localTimer && localTimer.timerInterval) {
    clearInterval(localTimer.timerInterval);
    localTimer.timerInterval = null;
  }

  const session = await getSessionFromRedis(roomCode);
  if (!session) return;

  const quiz = await Quiz.findById(session.quizId);
  const currentQuestion = quiz.questions[session.currentQuestionIndex];
  const isLastQuestion = session.currentQuestionIndex === quiz.questions.length - 1;

  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
  const leaderboardPayload = sortedPlayers.map((player, idx) => ({
    nickname: player.nickname,
    score: player.score,
    rank: idx + 1,
    isConnected: player.socketId !== null
  }));

  io.to(roomCode).emit('server:leaderboard-update', {
    players: leaderboardPayload,
    correctIndex: currentQuestion.correctIndex,
    correctAnswerText: currentQuestion.options[currentQuestion.correctIndex],
    isLastQuestion
  });
};

// Helper: End session and write final rankings to DB
const endGameAndBroadcastResults = async (io, roomCode, session) => {
  const localTimer = localTimerRegistry.get(roomCode);
  if (localTimer && localTimer.timerInterval) {
    clearInterval(localTimer.timerInterval);
  }
  localTimerRegistry.delete(roomCode);

  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
  const finalResults = [];

  // Write rankings database records
  for (let idx = 0; idx < sortedPlayers.length; idx++) {
    const player = sortedPlayers[idx];
    const rank = idx + 1;

    let result = await PlayerResult.findOne({ 
      sessionId: session._id || await getSessionMongoId(roomCode), 
      nickname: player.nickname 
    });

    if (result) {
      result.rank = rank;
      result.finalScore = player.score;
      await result.save();
    } else {
      result = new PlayerResult({
        sessionId: session._id || await getSessionMongoId(roomCode),
        nickname: player.nickname,
        answers: [],
        finalScore: player.score,
        rank
      });
      await result.save();
    }

    finalResults.push({
      nickname: player.nickname,
      finalScore: player.score,
      rank,
      answersCount: result.answers.length,
      correctAnswersCount: result.answers.filter(a => a.correct).length
    });
  }

  // Update backing GameSession in MongoDB
  await GameSession.findOneAndUpdate({ roomCode }, {
    status: 'finished',
    players: session.players
  });

  io.to(roomCode).emit('server:final-results', { results: finalResults });

  // Delete volatile room key from Redis
  await redisClient.del(`room:${roomCode}`);
  logger.info('Cleaned up room state from Redis', { roomCode });
};

// Helper: Load session MongoId from database
const getSessionMongoId = async (roomCode) => {
  const session = await GameSession.findOne({ roomCode });
  return session ? session._id : null;
};
