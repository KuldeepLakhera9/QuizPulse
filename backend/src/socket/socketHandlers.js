import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import PlayerResult from '../models/PlayerResult.js';

// In-memory registry for active rooms
// roomCode => { timerInterval, timeLeft, question, hostSocketId, hostTimeout }
const activeRooms = new Map();

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
    console.log(`Socket connected: ${socket.id}`);

    // --- HOST: CREATE ROOM ---
    socket.on('host:create-room', async ({ quizId, nickname }) => {
      try {
        if (!quizId) {
          socket.emit('error', { message: 'Quiz ID is required' });
          return;
        }

        // Find the quiz to ensure it exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
          socket.emit('error', { message: 'Quiz not found' });
          return;
        }

        // Generate a unique room code
        let roomCode = generateRoomCode();
        let sessionExists = await GameSession.findOne({ roomCode, status: { $ne: 'finished' } });
        
        // Loop to handle potential code collisions
        while (sessionExists) {
          roomCode = generateRoomCode();
          sessionExists = await GameSession.findOne({ roomCode, status: { $ne: 'finished' } });
        }

        // Create new game session
        const session = new GameSession({
          quizId,
          roomCode,
          status: 'lobby',
          players: [],
          currentQuestionIndex: -1,
          lastActive: new Date()
        });
        await session.save();

        // Register room details in-memory
        activeRooms.set(roomCode, {
          timerInterval: null,
          timeLeft: 0,
          question: null,
          hostSocketId: socket.id,
          hostTimeout: null
        });

        // Associate metadata to socket
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.isHost = true;
        socket.nickname = nickname || 'Host';

        console.log(`Room created: ${roomCode} by host: ${socket.id}`);
        socket.emit('host:create-room-success', { roomCode, session });
      } catch (error) {
        console.error('Error in host:create-room:', error);
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

        // Find active game session
        const session = await GameSession.findOne({ 
          roomCode: formattedCode, 
          status: { $ne: 'finished' } 
        });

        if (!session) {
          socket.emit('error', { message: 'Room not found or game has finished' });
          return;
        }

        // Check if player is already in this session (reconnection scenario)
        const playerIndex = session.players.findIndex(p => p.nickname.toLowerCase() === cleanNickname.toLowerCase());

        if (playerIndex !== -1) {
          // Reconnection: update socket ID
          session.players[playerIndex].socketId = socket.id;
          session.lastActive = new Date();
          await session.save();

          socket.join(formattedCode);
          socket.roomCode = formattedCode;
          socket.isHost = false;
          socket.nickname = cleanNickname;

          console.log(`Player reconnected: ${cleanNickname} inside room ${formattedCode} (new socket: ${socket.id})`);
          
          // Emit success back to player
          socket.emit('player:join-success', { 
            roomCode: formattedCode, 
            nickname: cleanNickname,
            sessionStatus: session.status,
            currentQuestionIndex: session.currentQuestionIndex
          });

          // Inform all clients in the room
          io.to(formattedCode).emit('room:players-updated', session.players);

          // If game is active, push the current question state immediately to this reconnected player
          if (session.status === 'active' && session.currentQuestionIndex >= 0) {
            const quiz = await Quiz.findById(session.quizId);
            const question = quiz.questions[session.currentQuestionIndex];
            const roomData = activeRooms.get(formattedCode);
            
            socket.emit('server:question-broadcast', {
              questionText: question.text,
              options: question.options,
              timeLimit: question.timeLimit,
              index: session.currentQuestionIndex,
              total: quiz.questions.length,
              // If they already answered, let them know or let them select
              alreadyAnswered: session.answersReceived.includes(cleanNickname),
              timeLeft: roomData ? roomData.timeLeft : 0
            });
          }
          return;
        }

        // If game has already started, do not allow new players to join
        if (session.status === 'active') {
          socket.emit('error', { message: 'Game has already started. Cannot join now.' });
          return;
        }

        // Add new player to session
        session.players.push({
          socketId: socket.id,
          nickname: cleanNickname,
          score: 0
        });
        session.lastActive = new Date();
        await session.save();

        socket.join(formattedCode);
        socket.roomCode = formattedCode;
        socket.isHost = false;
        socket.nickname = cleanNickname;

        console.log(`Player joined: ${cleanNickname} in room ${formattedCode}`);

        // Update activeRooms registry if it is missing (e.g. server restarted but session is in DB)
        if (!activeRooms.has(formattedCode)) {
          activeRooms.set(formattedCode, {
            timerInterval: null,
            timeLeft: 0,
            question: null,
            hostSocketId: null,
            hostTimeout: null
          });
        }

        socket.emit('player:join-success', { 
          roomCode: formattedCode, 
          nickname: cleanNickname,
          sessionStatus: session.status,
          currentQuestionIndex: -1
        });

        // Broadcast updated player list to everyone in room
        io.to(formattedCode).emit('room:players-updated', session.players);
      } catch (error) {
        console.error('Error in player:join-room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // --- HOST: START QUIZ ---
    socket.on('host:start-quiz', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const roomData = activeRooms.get(formattedCode);

        // Verify socket is the host (allow if reconnecting host matches)
        if (!socket.isHost && (!roomData || roomData.hostSocketId !== socket.id)) {
          socket.emit('error', { message: 'Unauthorized: Only the host can start the quiz' });
          return;
        }

        const session = await GameSession.findOne({ roomCode: formattedCode });
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        session.status = 'active';
        session.currentQuestionIndex = 0;
        session.lastActive = new Date();
        await session.save();

        // Load quiz questions
        const quiz = await Quiz.findById(session.quizId);
        if (!quiz || quiz.questions.length === 0) {
          socket.emit('error', { message: 'Quiz has no questions' });
          return;
        }

        // Start broadcasting first question
        broadcastQuestion(io, formattedCode, session, quiz);
      } catch (error) {
        console.error('Error in host:start-quiz:', error);
        socket.emit('error', { message: 'Failed to start quiz' });
      }
    });

    // --- PLAYER: SUBMIT ANSWER ---
    socket.on('player:submit-answer', async ({ roomCode, nickname, selectedIndex }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const roomData = activeRooms.get(formattedCode);

        if (!roomData || !roomData.question) {
          socket.emit('error', { message: 'No active question found' });
          return;
        }

        const session = await GameSession.findOne({ roomCode: formattedCode });
        if (!session || session.status !== 'active') {
          socket.emit('error', { message: 'Active game session not found' });
          return;
        }

        // Check if player has already submitted an answer for this question
        if (session.answersReceived.includes(nickname)) {
          socket.emit('error', { message: 'You have already submitted an answer for this question' });
          return;
        }

        const currentQuestion = roomData.question;
        const timeTakenMs = Date.now() - session.questionStartTime.getTime();
        const timeTakenSeconds = timeTakenMs / 1000;
        const isCorrect = selectedIndex === currentQuestion.correctIndex;

        // Calculate score server-authoritatively
        let pointsEarned = 0;
        if (isCorrect) {
          const basePoints = 1000;
          const ratio = timeTakenSeconds / currentQuestion.timeLimit;
          // Score formula: base_points * (1 - timeTaken/timeLimit)
          pointsEarned = Math.round(basePoints * (1 - ratio));
          // Keep points between 100 and 1000 for correct answers (minimum 100 points for correct to reward correctness)
          pointsEarned = Math.max(100, Math.min(basePoints, pointsEarned));
        }

        // Update player's score and answers list
        const player = session.players.find(p => p.nickname === nickname);
        let previousScore = 0;
        if (player) {
          previousScore = player.score;
          player.score += pointsEarned;
        }

        session.answersReceived.push(nickname);
        session.lastActive = new Date();
        await session.save();

        // Log result details for persisting at the end of quiz
        let playerResult = await PlayerResult.findOne({ sessionId: session._id, nickname });
        if (!playerResult) {
          playerResult = new PlayerResult({
            sessionId: session._id,
            nickname,
            answers: [],
            finalScore: 0,
            rank: 99
          });
        }
        playerResult.answers.push({
          questionId: currentQuestion._id,
          selected: selectedIndex,
          correct: isCorrect,
          timeTakenMs
        });
        playerResult.finalScore = player ? player.score : 0;
        await playerResult.save();

        // Send submission feedback to the specific player
        socket.emit('player:submit-feedback', {
          isCorrect,
          correctIndex: currentQuestion.correctIndex,
          pointsEarned,
          totalScore: player ? player.score : 0
        });

        // Broadcast to host the updated submission count
        io.to(formattedCode).emit('room:answer-submitted', {
          answersCount: session.answersReceived.length,
          totalPlayers: session.players.filter(p => p.socketId !== null).length
        });

        // Optional: If all active connected players have submitted, trigger end of question early
        const connectedPlayers = session.players.filter(p => p.socketId !== null);
        if (session.answersReceived.length >= connectedPlayers.length) {
          revealQuestionResults(io, formattedCode, session);
        }
      } catch (error) {
        console.error('Error in player:submit-answer:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // --- HOST: NEXT QUESTION ---
    socket.on('host:next-question', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const roomData = activeRooms.get(formattedCode);

        // Verify host
        if (!socket.isHost && (!roomData || roomData.hostSocketId !== socket.id)) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const session = await GameSession.findOne({ roomCode: formattedCode });
        if (!session || session.status !== 'active') {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Load quiz questions
        const quiz = await Quiz.findById(session.quizId);
        const nextIndex = session.currentQuestionIndex + 1;

        if (nextIndex >= quiz.questions.length) {
          // If no more questions, end quiz and show final leaderboard
          endGameAndBroadcastResults(io, formattedCode, session);
        } else {
          // Move index and broadcast next question
          session.currentQuestionIndex = nextIndex;
          session.answersReceived = [];
          session.lastActive = new Date();
          await session.save();

          broadcastQuestion(io, formattedCode, session, quiz);
        }
      } catch (error) {
        console.error('Error in host:next-question:', error);
        socket.emit('error', { message: 'Failed to proceed to next question' });
      }
    });

    // --- HOST: END QUIZ ---
    socket.on('host:end-quiz', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const roomData = activeRooms.get(formattedCode);

        // Verify host
        if (!socket.isHost && (!roomData || roomData.hostSocketId !== socket.id)) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const session = await GameSession.findOne({ roomCode: formattedCode });
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        await endGameAndBroadcastResults(io, formattedCode, session);
      } catch (error) {
        console.error('Error in host:end-quiz:', error);
        socket.emit('error', { message: 'Failed to end quiz' });
      }
    });

    // --- CLEANUP ON DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const roomCode = socket.roomCode;
      if (!roomCode) return;

      const formattedCode = roomCode.toUpperCase();
      const roomData = activeRooms.get(formattedCode);

      if (socket.isHost) {
        console.log(`Host disconnected from room ${formattedCode}. Initiating grace period...`);
        
        // Start 60 second timeout for host to reconnect
        if (roomData) {
          if (roomData.hostTimeout) clearTimeout(roomData.hostTimeout);
          
          roomData.hostTimeout = setTimeout(async () => {
            console.log(`Host reconnect timeout expired. Ending room ${formattedCode}.`);
            // Clean up session in DB
            const session = await GameSession.findOne({ roomCode: formattedCode });
            if (session && session.status !== 'finished') {
              await endGameAndBroadcastResults(io, formattedCode, session);
            }
            // Clear memory
            if (roomData.timerInterval) clearInterval(roomData.timerInterval);
            activeRooms.delete(formattedCode);
          }, 60000); // 60s
        }
      } else {
        // Player disconnected: update socket ID to null in the players list
        try {
          const session = await GameSession.findOne({ roomCode: formattedCode });
          if (session) {
            const player = session.players.find(p => p.socketId === socket.id);
            if (player) {
              console.log(`Player ${player.nickname} disconnected from room ${formattedCode}`);
              player.socketId = null;
              session.lastActive = new Date();
              await session.save();

              // Notify room
              io.to(formattedCode).emit('room:players-updated', session.players);
            }
          }
        } catch (error) {
          console.error('Error handling player disconnect:', error);
        }
      }
    });

    // --- RECONNECT HOST ---
    socket.on('host:reconnect-room', async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.toUpperCase();
        const roomData = activeRooms.get(formattedCode);

        // Find active session
        const session = await GameSession.findOne({ roomCode: formattedCode, status: { $ne: 'finished' } });
        if (!session) {
          socket.emit('error', { message: 'Lobby not found or already finished' });
          return;
        }

        // Re-assign host
        if (roomData) {
          if (roomData.hostTimeout) {
            clearTimeout(roomData.hostTimeout);
            roomData.hostTimeout = null;
          }
          roomData.hostSocketId = socket.id;
        } else {
          activeRooms.set(formattedCode, {
            timerInterval: null,
            timeLeft: 0,
            question: null,
            hostSocketId: socket.id,
            hostTimeout: null
          });
        }

        socket.join(formattedCode);
        socket.roomCode = formattedCode;
        socket.isHost = true;
        socket.nickname = 'Host';

        console.log(`Host reconnected successfully to room ${formattedCode}`);
        socket.emit('host:reconnect-success', { roomCode, session });
        
        // Push full state back to host
        socket.emit('room:players-updated', session.players);
      } catch (error) {
        console.error('Error in host:reconnect-room:', error);
        socket.emit('error', { message: 'Failed to reconnect host' });
      }
    });
  });
};

// Helper: Broadcast question and start timer loop
const broadcastQuestion = (io, roomCode, session, quiz) => {
  const roomData = activeRooms.get(roomCode);
  if (!roomData) return;

  // Clear existing timer interval
  if (roomData.timerInterval) {
    clearInterval(roomData.timerInterval);
  }

  const question = quiz.questions[session.currentQuestionIndex];
  roomData.question = question;
  roomData.timeLeft = question.timeLimit;

  // Save the start time for scoring speed calculations
  session.questionStartTime = new Date();
  session.save();

  // Broadcast question details to clients (strip correctIndex for cheating protection)
  io.to(roomCode).emit('server:question-broadcast', {
    questionText: question.text,
    options: question.options,
    timeLimit: question.timeLimit,
    index: session.currentQuestionIndex,
    total: quiz.questions.length,
    timeLeft: roomData.timeLeft
  });

  // Start server-authoritative timer interval
  roomData.timerInterval = setInterval(async () => {
    roomData.timeLeft--;

    // Broadcast tick to all connected clients
    io.to(roomCode).emit('server:timer-tick', { timeLeft: roomData.timeLeft });

    if (roomData.timeLeft <= 0) {
      clearInterval(roomData.timerInterval);
      roomData.timerInterval = null;

      // Timer ended, reveal answers and calculate leaderboard
      const freshSession = await GameSession.findOne({ roomCode });
      if (freshSession && freshSession.status === 'active') {
        revealQuestionResults(io, roomCode, freshSession);
      }
    }
  }, 1000);
};

// Helper: Reveal correct answer and send leaderboard updates
const revealQuestionResults = async (io, roomCode, session) => {
  const roomData = activeRooms.get(roomCode);
  if (!roomData) return;

  // Clear timer interval
  if (roomData.timerInterval) {
    clearInterval(roomData.timerInterval);
    roomData.timerInterval = null;
  }

  const quiz = await Quiz.findById(session.quizId);
  const currentQuestion = quiz.questions[session.currentQuestionIndex];
  const isLastQuestion = session.currentQuestionIndex === quiz.questions.length - 1;

  // Compile leaderboard scores
  // Sort players by score descending
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);

  // We want to calculate ranks and score differences (deltas) for active display
  // Let's attach rankings and previous ranks if we want, or just return sorted player list.
  // Standard leaderboard update payload:
  // { players: [{ nickname, score, rankChange }, ...], correctIndex, isLastQuestion }
  
  const leaderboardPayload = sortedPlayers.map((player, idx) => {
    return {
      nickname: player.nickname,
      score: player.score,
      rank: idx + 1,
      isConnected: player.socketId !== null
    };
  });

  io.to(roomCode).emit('server:leaderboard-update', {
    players: leaderboardPayload,
    correctIndex: currentQuestion.correctIndex,
    correctAnswerText: currentQuestion.options[currentQuestion.correctIndex],
    isLastQuestion
  });
};

// Helper: Terminate game session and persist final results
const endGameAndBroadcastResults = async (io, roomCode, session) => {
  const roomData = activeRooms.get(roomCode);
  
  // Clear any running timers
  if (roomData && roomData.timerInterval) {
    clearInterval(roomData.timerInterval);
    roomData.timerInterval = null;
  }

  session.status = 'finished';
  session.lastActive = new Date();
  await session.save();

  // Sort players to assign final ranks
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);

  // Update PlayerResults and broadcast final stats
  const finalResults = [];

  for (let idx = 0; idx < sortedPlayers.length; idx++) {
    const player = sortedPlayers[idx];
    const rank = idx + 1;

    let result = await PlayerResult.findOne({ sessionId: session._id, nickname: player.nickname });
    if (result) {
      result.rank = rank;
      result.finalScore = player.score;
      await result.save();
    } else {
      result = new PlayerResult({
        sessionId: session._id,
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

  io.to(roomCode).emit('server:final-results', { results: finalResults });
  
  // Remove room from active memory registry
  activeRooms.delete(roomCode);
  console.log(`Room ${roomCode} ended and deleted from memory.`);
};
