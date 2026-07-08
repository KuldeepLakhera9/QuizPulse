import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, Clock } from 'lucide-react';

const PlayerActive = ({ 
  questionText, 
  options, 
  timeLeft, 
  index, 
  total, 
  onSubmitAnswer,
  alreadyAnswered: initialAlreadyAnswered,
  feedback, // feedback from server: { isCorrect, correctIndex, pointsEarned, totalScore }
  isTimerRunning
}) => {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [submitted, setSubmitted] = useState(initialAlreadyAnswered);

  // Sync state if alreadyAnswered comes from parent (like on reconnect)
  useEffect(() => {
    if (initialAlreadyAnswered) {
      setSubmitted(true);
    }
  }, [initialAlreadyAnswered]);

  // Reset local submission state when question changes
  useEffect(() => {
    setSelectedIdx(null);
    setSubmitted(false);
  }, [questionText]);

  const handleSelect = (idx) => {
    if (submitted || !isTimerRunning) return;
    setSelectedIdx(idx);
    setSubmitted(true);
    onSubmitAnswer(idx);
  };

  const letters = ['A', 'B', 'C', 'D'];
  const baseColors = [
    'bg-red-500 hover:bg-red-600 border-red-400/30',
    'bg-blue-500 hover:bg-blue-600 border-blue-400/30',
    'bg-yellow-500 hover:bg-yellow-600 border-yellow-400/30',
    'bg-green-500 hover:bg-green-600 border-green-400/30'
  ];

  return (
    <div className="max-w-md mx-auto py-8 px-4 text-center">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6 glass px-5 py-3 rounded-2xl border border-slate-700/50">
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
          Q{index + 1} of {total}
        </span>
        {isTimerRunning && (
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
            <Clock size={14} className="text-purple-400 animate-pulse-subtle" />
            <span>Time: <strong>{timeLeft}s</strong></span>
          </div>
        )}
        {!isTimerRunning && (
          <span className="text-xs uppercase font-bold text-rose-400">Time's Up!</span>
        )}
      </div>

      {/* Question Text */}
      <div className="glass p-6 rounded-2xl border border-slate-700/50 shadow-xl mb-6">
        <h3 className="text-lg font-bold text-slate-100 leading-snug">
          {questionText}
        </h3>
      </div>

      {/* Game State Displays */}
      {/* CASE 1: Question is Active and Player hasn't submitted yet */}
      {!submitted && isTimerRunning && (
        <div className="grid grid-cols-1 gap-3.5">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl text-left font-bold text-white text-lg shadow-lg border transition-all hover:scale-[1.01] active:scale-[0.99] ${baseColors[idx]}`}
            >
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-extrabold">
                {letters[idx]}
              </span>
              <span className="truncate">{option}</span>
            </button>
          ))}
        </div>
      )}

      {/* CASE 2: Player has submitted and waiting for timer to expire */}
      {submitted && isTimerRunning && (
        <div className="glass py-12 px-6 rounded-3xl border border-slate-700/50 shadow-xl flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-bounce">
            <Clock size={28} />
          </div>
          <h4 className="text-xl font-bold text-slate-200">Answer Submitted!</h4>
          <p className="text-sm text-slate-400 max-w-xs">
            Waiting for other players to submit or for the countdown timer to finish.
          </p>
          {selectedIdx !== null && (
            <div className="mt-2 text-xs font-semibold text-slate-400 uppercase bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              You picked: <strong className="text-purple-400">{letters[selectedIdx]}</strong>
            </div>
          )}
        </div>
      )}

      {/* CASE 3: Timer expired, showing feedback results */}
      {!isTimerRunning && feedback && (
        <div className="space-y-6">
          <div className={`glass p-8 rounded-3xl border shadow-xl flex flex-col items-center gap-4 ${
            feedback.isCorrect 
              ? 'border-emerald-500/30 bg-emerald-950/10' 
              : 'border-rose-500/30 bg-rose-950/10'
          }`}>
            {feedback.isCorrect ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle size={44} />
                </div>
                <h4 className="text-3xl font-extrabold text-emerald-400">CORRECT!</h4>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  +{feedback.pointsEarned} pts
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                  <XCircle size={44} />
                </div>
                <h4 className="text-3xl font-extrabold text-rose-400">INCORRECT</h4>
                <p className="text-slate-400 text-sm">
                  Correct Answer: <strong className="text-emerald-400">{options[feedback.correctIndex]}</strong>
                </p>
              </>
            )}

            <div className="w-full mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 font-semibold text-sm">Your Total Score</span>
              <span className="text-white font-extrabold text-lg flex items-center gap-1.5">
                <Award size={18} className="text-purple-400" />
                {feedback.totalScore} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CASE 4: Timer expired, but player had not submitted any answer (idle reconnect/join) */}
      {!isTimerRunning && !feedback && (
        <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle size={28} />
          </div>
          <h4 className="text-xl font-bold text-slate-200">No Answer Submitted</h4>
          <p className="text-sm text-slate-400">
            You did not submit an answer in time for this question.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerActive;
