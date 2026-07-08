import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import CreateQuiz from './components/CreateQuiz';
import JoinGame from './components/JoinGame';
import HostLobby from './components/HostLobby';
import HostActive from './components/HostActive';
import PlayerActive from './components/PlayerActive';
import Leaderboard from './components/Leaderboard';
import FinalResults from './components/FinalResults';
import { Award, Play, HelpCircle, Layers, PlusCircle, Gamepad2, Wifi, WifiOff } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // landing, create-quiz, join-game, lobby, active-game, leaderboard, final-results
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  
  // Game states
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [questionData, setQuestionData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null);
  const [finalResults, setFinalResults] = useState([]);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  
  // App system states
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [quizzesLoading, setQuizzesLoading] = useState(false);

  // Load quizzes on landing view
  useEffect(() => {
    if (currentView === 'landing') {
      fetchQuizzes();
    }
  }, [currentView]);

  const fetchQuizzes = async () => {
    setQuizzesLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes`);
      if (!response.ok) throw new Error('Failed to load quiz templates');
      const data = await response.json();
      setQuizzes(data);
      if (data.length > 0) {
        setSelectedQuizId(data[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError('Could not fetch quiz list from backend. Make sure the backend server is running.');
    } finally {
      setQuizzesLoading(false);
    }
  };

  // Socket connection and listener management
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setError('');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleError = (data) => {
      setError(data.message || 'An error occurred');
    };

    const handleHostCreateRoomSuccess = ({ roomCode, session }) => {
      setRoomCode(roomCode);
      setIsHost(true);
      setPlayers(session.players);
      setCurrentView('lobby');
    };

    const handlePlayerJoinSuccess = ({ roomCode, nickname, sessionStatus, currentQuestionIndex }) => {
      setRoomCode(roomCode);
      setNickname(nickname);
      setIsHost(false);
      setCurrentView('lobby');
      
      if (sessionStatus === 'active') {
        setCurrentView('active-game');
      }
    };

    const handlePlayersUpdated = (updatedPlayers) => {
      setPlayers(updatedPlayers);
      // Update answers count based on active players
      setTotalPlayers(updatedPlayers.filter(p => p.socketId !== null).length);
    };

    const handleQuestionBroadcast = ({ questionText, options, timeLimit, index, total, timeLeft: currentLeft, alreadyAnswered: reconnectedAnswered }) => {
      setQuestionData({ questionText, options, timeLimit, index, total });
      setTimeLeft(currentLeft !== undefined ? currentLeft : timeLimit);
      setIsTimerRunning(true);
      setCorrectIndex(null);
      setPlayerFeedback(null);
      setAnswersCount(0);
      setAlreadyAnswered(reconnectedAnswered || false);
      setCurrentView('active-game');
    };

    const handleTimerTick = ({ timeLeft }) => {
      setTimeLeft(timeLeft);
      if (timeLeft <= 0) {
        setIsTimerRunning(false);
      }
    };

    const handlePlayerSubmitFeedback = (feedback) => {
      setPlayerFeedback(feedback);
      setAlreadyAnswered(true);
    };

    const handleAnswerSubmitted = ({ answersCount, totalPlayers: serverTotal }) => {
      setAnswersCount(answersCount);
      setTotalPlayers(serverTotal);
    };

    const handleLeaderboardUpdate = ({ players: updatedPlayers, correctIndex: serverCorrectIndex, isLastQuestion }) => {
      setIsTimerRunning(false);
      setCorrectIndex(serverCorrectIndex);
      setPlayers(updatedPlayers);
      
      // Auto transition to leaderboard after 2.5 seconds if player, or stay on Host screen until host clicks next
      if (!isHost) {
        setTimeout(() => {
          setCurrentView('leaderboard');
        }, 2000);
      } else {
        // Host remains on HostActive to view who answered, showing option breakdown
        // Then clicks continue to reveal leaderboard
      }
    };

    const handleFinalResults = ({ results }) => {
      setFinalResults(results);
      setCurrentView('final-results');
    };

    // Bind listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('host:create-room-success', handleHostCreateRoomSuccess);
    socket.on('player:join-success', handlePlayerJoinSuccess);
    socket.on('room:players-updated', handlePlayersUpdated);
    socket.on('server:question-broadcast', handleQuestionBroadcast);
    socket.on('server:timer-tick', handleTimerTick);
    socket.on('player:submit-feedback', handlePlayerSubmitFeedback);
    socket.on('room:answer-submitted', handleAnswerSubmitted);
    socket.on('server:leaderboard-update', handleLeaderboardUpdate);
    socket.on('server:final-results', handleFinalResults);

    // Initial state check
    setIsConnected(socket.connected);

    return () => {
      // Cleanup listeners on unmount
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('host:create-room-success', handleHostCreateRoomSuccess);
      socket.off('player:join-success', handlePlayerJoinSuccess);
      socket.off('room:players-updated', handlePlayersUpdated);
      socket.off('server:question-broadcast', handleQuestionBroadcast);
      socket.off('server:timer-tick', handleTimerTick);
      socket.off('player:submit-feedback', handlePlayerSubmitFeedback);
      socket.off('room:answer-submitted', handleAnswerSubmitted);
      socket.off('server:leaderboard-update', handleLeaderboardUpdate);
      socket.off('server:final-results', handleFinalResults);
    };
  }, [isHost]);

  // Host Action Handlers
  const handleHostGame = () => {
    if (!selectedQuizId) {
      setError('Please select or create a quiz first.');
      return;
    }
    setError('');
    socket.emit('host:create-room', { quizId: selectedQuizId, nickname: 'Host' });
  };

  const handleStartGame = () => {
    socket.emit('host:start-quiz', { roomCode });
  };

  const handleNextQuestion = () => {
    socket.emit('host:next-question', { roomCode });
  };

  const handleEndQuiz = () => {
    socket.emit('host:end-quiz', { roomCode });
  };

  // Player Action Handlers
  const handleJoinRoom = ({ roomCode, nickname }) => {
    setError('');
    socket.emit('player:join-room', { roomCode, nickname });
  };

  const handleSubmitAnswer = (selectedIndex) => {
    socket.emit('player:submit-answer', { roomCode, nickname, selectedIndex });
  };

  const handleReturnHome = () => {
    // Reset states
    setRoomCode('');
    setNickname('');
    setPlayers([]);
    setQuestionData(null);
    setCorrectIndex(null);
    setPlayerFeedback(null);
    setFinalResults([]);
    setIsHost(false);
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navbar Header */}
      <header className="glass border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Gamepad2 className="text-white" size={22} />
          </div>
          <span 
            onClick={handleReturnHome}
            className="text-xl font-black tracking-tight cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 hover:opacity-90"
          >
            QuizPulse
          </span>
        </div>

        {/* Network Connectivity Badge */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-inner shadow-emerald-500/5">
              <Wifi size={13} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full animate-pulse">
              <WifiOff size={13} /> Disconnected
            </span>
          )}
        </div>
      </header>

      {/* Main Body Containers */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full">
          {error && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          {/* VIEW: LANDING PAGE */}
          {currentView === 'landing' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 py-10 px-4">
              {/* Host Setup Card */}
              <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-600/10 to-transparent blur-xl rounded-full"></div>
                <div>
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400 mb-4">
                    <Layers size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Host a Game</h2>
                  <p className="text-slate-400 text-sm mt-1">Select an existing quiz template or create a new one to start playing.</p>

                  <div className="mt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose Quiz</label>
                    {quizzesLoading ? (
                      <div className="h-12 bg-slate-800/40 rounded-xl border border-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-500">
                        Loading quizzes...
                      </div>
                    ) : quizzes.length === 0 ? (
                      <div className="p-4 bg-slate-800/20 border border-dashed border-slate-700 rounded-xl text-center text-sm text-slate-500">
                        No quizzes found. Create one to begin.
                      </div>
                    ) : (
                      <select 
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        {quizzes.map((q) => (
                          <option key={q._id} value={q._id}>{q.title} (by {q.hostName})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={handleHostGame}
                    disabled={quizzes.length === 0}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={18} fill="currentColor" /> Host Chosen Quiz
                  </button>
                  <button
                    onClick={() => setCurrentView('create-quiz')}
                    className="w-full py-3.5 border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={18} /> Create Custom Quiz
                  </button>
                </div>
              </div>

              {/* Player Join Card */}
              <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-600/10 to-transparent blur-xl rounded-full"></div>
                <div>
                  <div className="w-12 h-12 bg-pink-500/10 border border-pink-500/30 rounded-xl flex items-center justify-center text-pink-400 mb-4">
                    <Gamepad2 size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Play Game</h2>
                  <p className="text-slate-400 text-sm mt-1">Join a quiz room hosted by a friend to test your knowledge.</p>
                </div>

                <div className="pt-10">
                  <button
                    onClick={() => setCurrentView('join-game')}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-lg rounded-xl shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Join with Room Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CREATE QUIZ FORM */}
          {currentView === 'create-quiz' && (
            <CreateQuiz 
              onBack={handleReturnHome}
              onQuizCreated={(newQuiz) => {
                fetchQuizzes();
                setSelectedQuizId(newQuiz._id);
                setCurrentView('landing');
              }}
            />
          )}

          {/* VIEW: JOIN GAME LOBBY ENTRY */}
          {currentView === 'join-game' && (
            <JoinGame 
              onBack={handleReturnHome}
              onJoinRoom={handleJoinRoom}
              error={error}
            />
          )}

          {/* VIEW: ROOM LOBBY (HOST & PLAYER WAITING) */}
          {currentView === 'lobby' && (
            <HostLobby 
              roomCode={roomCode}
              players={players}
              onStartGame={handleStartGame}
              isHost={isHost}
            />
          )}

          {/* VIEW: ACTIVE GAMEPLAY (HOST OR PLAYER DISPLAYS) */}
          {currentView === 'active-game' && (
            isHost ? (
              <HostActive 
                questionText={questionData?.questionText}
                options={questionData?.options}
                timeLimit={questionData?.timeLimit}
                timeLeft={timeLeft}
                index={questionData?.index}
                total={questionData?.total}
                answersCount={answersCount}
                totalPlayers={totalPlayers}
                isTimerRunning={isTimerRunning}
                correctIndex={correctIndex}
                onNextQuestion={() => setCurrentView('leaderboard')}
              />
            ) : (
              <PlayerActive 
                questionText={questionData?.questionText}
                options={questionData?.options}
                timeLeft={timeLeft}
                index={questionData?.index}
                total={questionData?.total}
                onSubmitAnswer={handleSubmitAnswer}
                alreadyAnswered={alreadyAnswered}
                feedback={playerFeedback}
                isTimerRunning={isTimerRunning}
              />
            )
          )}

          {/* VIEW: LEADERBOARD BETWEEN QUESTIONS */}
          {currentView === 'leaderboard' && (
            <Leaderboard 
              players={players}
              isHost={isHost}
              onNextQuestion={handleNextQuestion}
              isLastQuestion={questionData ? questionData.index + 1 === questionData.total : false}
            />
          )}

          {/* VIEW: FINAL STANDINGS PODIUM */}
          {currentView === 'final-results' && (
            <FinalResults 
              results={finalResults}
              onHome={handleReturnHome}
            />
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-800/40 bg-slate-900/10">
        &copy; {new Date().getFullYear()} QuizPulse. Built for real-time collaborative gameplay.
      </footer>
    </div>
  );
}

export default App;
