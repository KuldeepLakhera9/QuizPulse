import React from 'react';
import { Play, Users, ArrowRight } from 'lucide-react';

const HostLobby = ({ roomCode, players, isHost, onStartGame }) => {
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="glass p-8 rounded-3xl border border-slate-850 bg-slate-900/65 shadow-2xl relative overflow-hidden text-center">
        
        <div className="mb-8">
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
            Live Session Lobby
          </span>
          <h2 className="text-4xl font-extrabold text-slate-100 mt-4 tracking-tight">
            Room Invitation Code
          </h2>
          <div className="mt-4 inline-block bg-slate-800/50 border border-slate-700/60 rounded-2xl px-10 py-4 shadow-inner">
            <span className="text-5xl font-black font-mono tracking-widest text-indigo-400">
              {roomCode}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            {isHost 
              ? 'Share this session invitation code with your workshop participants to join.'
              : 'Waiting for the presenter to start the workshop session...'}
          </p>
        </div>

        {/* Players List Grid */}
        <div className="border-t border-slate-800/60 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              Participants Joined
            </h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              {players.length} Joined
            </span>
          </div>

          {players.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-800/10">
              <span className="text-slate-500 text-sm animate-pulse">Waiting for participants to connect...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
              {players.map((p, idx) => (
                <div 
                  key={idx} 
                  className={`px-4 py-2.5 rounded-xl border text-center font-medium text-sm truncate transition-all ${
                    p.socketId 
                      ? 'bg-slate-800 text-slate-200 border-slate-700' 
                      : 'bg-slate-800/20 text-slate-500 line-through border-slate-850'
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
          <div className="mt-8 border-t border-slate-850 pt-6">
            <button
              onClick={onStartGame}
              disabled={players.length === 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Play size={16} fill="currentColor" /> Start Workshop Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostLobby;
