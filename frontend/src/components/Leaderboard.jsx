import React from 'react';
import { Award, ArrowRight, Activity, Zap, Play } from 'lucide-react';

const Leaderboard = ({ players, isHost, onNextQuestion, isLastQuestion }) => {
  // Sort players just in case
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20 uppercase tracking-wider">
          Round Standings
        </span>
        <h2 className="text-4xl font-black text-slate-100 mt-3 flex items-center justify-center gap-2">
          <Award className="text-purple-400 animate-bounce" size={32} /> Leaderboard
        </h2>
      </div>

      <div className="glass rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700/40 bg-slate-800/20 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rank & Name</span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-[450px] overflow-y-auto">
          {sortedPlayers.map((player, idx) => {
            const rank = idx + 1;
            
            // Visual styles for top 3
            let rankBadge = '';
            let rowStyle = 'hover:bg-slate-800/25';
            let nameStyle = 'text-slate-200';
            
            if (rank === 1) {
              rankBadge = '🏆';
              rowStyle = 'bg-gradient-to-r from-yellow-500/5 to-transparent border-l-4 border-l-yellow-500';
              nameStyle = 'text-yellow-400 font-extrabold';
            } else if (rank === 2) {
              rankBadge = '🥈';
              rowStyle = 'bg-gradient-to-r from-slate-400/5 to-transparent border-l-4 border-l-slate-400';
              nameStyle = 'text-slate-300 font-bold';
            } else if (rank === 3) {
              rankBadge = '🥉';
              rowStyle = 'bg-gradient-to-r from-amber-600/5 to-transparent border-l-4 border-l-amber-600';
              nameStyle = 'text-amber-500 font-bold';
            }

            return (
              <div 
                key={idx} 
                className={`p-4 flex items-center justify-between transition-all ${rowStyle}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-8 text-center text-sm font-black text-slate-500 font-mono">
                    {rankBadge || `#${rank}`}
                  </span>
                  
                  {/* Status Indicator */}
                  <div className="relative shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${player.isConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-rose-500/30'}`} />
                  </div>

                  <div className="min-w-0">
                    <span className={`block truncate text-base ${nameStyle}`}>
                      {player.nickname}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-black font-mono text-slate-200">
                    {player.score}
                  </span>
                  
                  {/* Score decoration */}
                  {rank === 1 && (
                    <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}

          {sortedPlayers.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No players registered in this room.
            </div>
          )}
        </div>

        {/* Action Button for Host */}
        {isHost && (
          <div className="p-6 border-t border-slate-700/40 bg-slate-800/10 flex justify-center">
            <button
              onClick={onNextQuestion}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLastQuestion ? (
                <>
                  <Award size={18} /> End Game & See Podium
                </>
              ) : (
                <>
                  Next Question <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
