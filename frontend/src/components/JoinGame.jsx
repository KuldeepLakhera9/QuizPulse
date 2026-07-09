import React, { useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';

const JoinGame = ({ onBack, onJoinRoom, error: externalError }) => {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!roomCode.trim()) {
      setLocalError('Room code is required.');
      return;
    }

    if (roomCode.trim().length !== 6) {
      setLocalError('Room code must be exactly 6 characters.');
      return;
    }

    if (!nickname.trim()) {
      setLocalError('Nickname is required.');
      return;
    }

    onJoinRoom({ roomCode: roomCode.trim().toUpperCase(), nickname: nickname.trim() });
  };

  const renderError = localError || externalError;

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-350 hover:text-white glass rounded-lg mb-8 transition-all"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass p-8 rounded-3xl border border-slate-800 bg-slate-900/40 shadow-2xl relative overflow-hidden">
        
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Join Live Session</h2>
          <p className="text-slate-400 text-sm mt-1">Enter your room invitation code and choose a nickname to join.</p>
        </div>

        {renderError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
            {renderError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">6-Char Room Code</label>
            <input 
              type="text"
              placeholder="e.g. AB12XY"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-center text-xl uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nickname</label>
            <input 
              type="text"
              placeholder="e.g. John Doe"
              maxLength={15}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-md shadow-indigo-600/10 transition-all text-base"
          >
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGame;
