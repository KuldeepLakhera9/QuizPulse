import React from 'react';
import { Play, Users, Laptop } from 'lucide-react';

const HostLobby = ({ roomCode, players, onStartGame, isHost }) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/10 blur-2xl rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-600/10 blur-2xl rounded-full"></div>

        <div className="mb-8">
          <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20 uppercase tracking-wider">
            Game Room Lobby
          </span>
          <h2 className="text-4xl font-extrabold text-slate-100 mt-4 tracking-tight">
            Room Code
          </h2>
          <div className="mt-3 inline-block bg-slate-800 border border-slate-700/80 rounded-2xl px-8 py-4 shadow-inner">
            <span className="text-5xl font-extrabold font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              {roomCode}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            {isHost 
              ? 'Tell your players to enter this room code to join the game!'
              : 'Waiting for the host to start the game...'}
          </p>
        </div>

        {/* Players List Grid */}
        <div className="border-t border-slate-700/40 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Users size={18} className="text-purple-400" />
              Players Connected
            </h3>
            <span className="text-sm font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              {players.length} Active
            </span>
          </div>

          {players.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-800/10">
              <span className="text-slate-500 text-sm animate-pulse">Waiting for players to join...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
              {players.map((p, idx) => (
                <div 
                  key={idx} 
                  className={`px-4 py-3 rounded-xl border border-slate-700/40 text-center font-bold text-sm truncate shadow-md transition-all ${
                    p.socketId 
                      ? 'bg-slate-800/80 text-purple-300 border-purple-500/20' 
                      : 'bg-slate-800/30 text-slate-500 line-through border-slate-800'
                  }`}
                  title={p.socketId ? p.nickname : `${p.nickname} (Disconnected)`}
                >
                  {p.nickname}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Game Action */}
        {isHost && (
          <div className="mt-8 border-t border-slate-700/40 pt-6">
            <button
              onClick={onStartGame}
              disabled={players.length === 0}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Play size={20} fill="currentColor" /> Start Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostLobby;
