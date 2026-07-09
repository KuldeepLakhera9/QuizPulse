import React from 'react';
import { Hourglass, Users, ArrowRight, Award } from 'lucide-react';

const HostActive = ({ 
  questionText, 
  options, 
  timeLimit, 
  timeLeft, 
  index, 
  total, 
  answersCount, 
  totalPlayers, 
  isTimerRunning, 
  correctIndex,
  onNextQuestion
}) => {
  const letters = ['A', 'B', 'C', 'D'];
  const colors = [
    'bg-red-500 hover:bg-red-600',
    'bg-blue-500 hover:bg-blue-600',
    'bg-yellow-500 hover:bg-yellow-600',
    'bg-green-500 hover:bg-green-600'
  ];

  const timerRatio = timeLeft / timeLimit;
  const strokeColor = timerRatio < 0.25 ? 'stroke-rose-500' : timerRatio < 0.5 ? 'stroke-amber-500' : 'stroke-purple-500';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-center">
      {/* Header Stats */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8 glass px-6 py-4 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-wider">
            Question {index + 1} of {total}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Users size={16} className="text-purple-400" />
            <span>Answers: <strong className="text-white text-lg">{answersCount}</strong> / {totalPlayers}</span>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl mb-8 relative">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-relaxed max-w-3xl mx-auto">
          {questionText}
        </h2>

        {/* Circular Countdown Timer */}
        {isTimerRunning && (
          <div className="relative w-24 h-24 mx-auto mt-6 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                className={`${strokeColor} transition-all duration-1000`}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 * (1 - timerRatio)}
              />
            </svg>
            <span className="absolute text-2xl font-extrabold font-mono text-slate-100">
              {timeLeft}
            </span>
          </div>
        )}

        {!isTimerRunning && (
          <div className="mt-6 flex flex-col items-center justify-center gap-1">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/25">
              Timer Finished
            </span>
          </div>
        )}
      </div>

      {/* Visual Answer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {options.map((option, idx) => {
          let stateStyle = 'glass border-slate-700/50 text-slate-200';
          
          if (!isTimerRunning) {
            if (idx === correctIndex) {
              // Highlight correct answer in green
              stateStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-500/5';
            } else {
              // Dim incorrect answers
              stateStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
            }
          }

          return (
            <div 
              key={idx} 
              className={`flex items-center gap-4 p-5 rounded-2xl border text-left font-semibold text-lg transition-all ${stateStyle}`}
            >
              <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-extrabold text-white text-base ${colors[idx]}`}>
                {letters[idx]}
              </span>
              <span className="truncate">{option}</span>
            </div>
          );
        })}
      </div>

      {/* Control Actions for Host */}
      {!isTimerRunning && (
        <div className="flex justify-center">
          <button
            onClick={onNextQuestion}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-md shadow-indigo-600/10"
          >
            {index + 1 === total ? (
              <>
                <Award size={20} /> View Final Results
              </>
            ) : (
              <>
                Continue to Leaderboard <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default HostActive;
