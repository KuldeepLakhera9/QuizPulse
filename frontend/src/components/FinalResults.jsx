import React from 'react';
import { Award, RotateCcw, Home, Sparkles } from 'lucide-react';

const FinalResults = ({ results, onHome }) => {
  // Ranks are pre-sorted in the database output
  const podiumPlayers = results.slice(0, 3);
  const remainingPlayers = results.slice(3);

  // Re-map podium array to [2nd, 1st, 3rd] order for center-first alignment
  const podiumLayout = [];
  if (podiumPlayers[1]) podiumLayout.push({ ...podiumPlayers[1], position: 2 }); // 2nd place
  if (podiumPlayers[0]) podiumLayout.push({ ...podiumPlayers[0], position: 1 }); // 1st place
  if (podiumPlayers[2]) podiumLayout.push({ ...podiumPlayers[2], position: 3 }); // 3rd place

  // Fallback if less than 3 players
  const getPodiumOrder = () => {
    const list = [];
    const second = podiumPlayers.find(p => p.rank === 2);
    const first = podiumPlayers.find(p => p.rank === 1);
    const third = podiumPlayers.find(p => p.rank === 3);

    if (second) list.push(second);
    if (first) list.push(first);
    if (third) list.push(third);

    // If only 1 player, it returns just first.
    if (list.length === 0 && podiumPlayers.length > 0) {
      return podiumPlayers;
    }
    return list;
  };

  const orderedPodium = getPodiumOrder();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center">
      <div className="mb-10">
        <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest animate-pulse">
          <Sparkles size={16} /> Game Completed <Sparkles size={16} />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-100 mt-4 tracking-tight">
          The Final Podium
        </h2>
      </div>

      {/* Podium Representation */}
      <div className="flex flex-row items-end justify-center gap-4 sm:gap-6 mb-12 h-64 border-b border-slate-800 pb-1 px-4">
        {orderedPodium.map((player) => {
          let heightClass = '';
          let bgClass = '';
          let textClass = '';
          let medalEmoji = '';
          let animateClass = '';

          if (player.rank === 1) {
            heightClass = 'h-48 sm:h-52';
            bgClass = 'bg-gradient-to-t from-yellow-600/90 to-yellow-500/90 border border-yellow-400/30';
            textClass = 'text-yellow-400 font-extrabold';
            medalEmoji = '👑';
            animateClass = 'podium-1';
          } else if (player.rank === 2) {
            heightClass = 'h-36 sm:h-40';
            bgClass = 'bg-gradient-to-t from-slate-500/90 to-slate-400/90 border border-slate-300/30';
            textClass = 'text-slate-300 font-bold';
            medalEmoji = '🥈';
            animateClass = 'podium-2';
          } else if (player.rank === 3) {
            heightClass = 'h-24 sm:h-28';
            bgClass = 'bg-gradient-to-t from-amber-700/90 to-amber-600/90 border border-amber-500/30';
            textClass = 'text-amber-500 font-semibold';
            medalEmoji = '🥉';
            animateClass = 'podium-3';
          }

          return (
            <div key={player.nickname} className="flex flex-col items-center w-24 sm:w-32 shrink-0">
              {/* Player Nickname */}
              <span className={`block truncate text-sm sm:text-base font-extrabold mb-2 max-w-full ${textClass}`}>
                {player.nickname}
              </span>
              {/* Score label */}
              <span className="text-xs text-slate-400 font-semibold font-mono mb-2">
                {player.finalScore} pts
              </span>
              {/* Podium pedestal block */}
              <div className={`w-full rounded-t-2xl shadow-xl flex flex-col items-center justify-center gap-1 ${bgClass} ${animateClass} ${heightClass}`}>
                <span className="text-3xl sm:text-4xl select-none">{medalEmoji}</span>
                <span className="text-xs font-black text-slate-950 font-mono tracking-wider">
                  RANK {player.rank}
                </span>
                <span className="text-[10px] font-bold text-slate-900/80">
                  {player.correctAnswersCount}/{player.answersCount} correct
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining Players Standings */}
      {remainingPlayers.length > 0 && (
        <div className="glass rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden mb-12 max-w-lg mx-auto">
          <div className="p-4 border-b border-slate-700/40 bg-slate-800/20 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
            Other Rankings
          </div>
          <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
            {remainingPlayers.map((player) => (
              <div key={player.nickname} className="p-3.5 flex items-center justify-between text-left hover:bg-slate-800/10">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-slate-500 font-mono">#{player.rank}</span>
                  <span className="text-sm font-semibold text-slate-300">{player.nickname}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold font-mono text-slate-400">
                  <span>{player.correctAnswersCount}/{player.answersCount} correct</span>
                  <span className="text-sm font-bold text-slate-200">{player.finalScore} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Home / Action Button */}
      <div className="flex justify-center">
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Home size={18} /> Return to Home Screen
        </button>
      </div>
    </div>
  );
};

export default FinalResults;
