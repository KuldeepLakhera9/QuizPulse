import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

const AIQuizGeneratorModal = ({ isOpen, onClose, onSuccess }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'}/api/quiz/generate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          numQuestions: parseInt(numQuestions, 10)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to generate quiz questions.');
      }

      const generatedQuestions = await response.json();
      onSuccess(generatedQuestions);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-500 animate-pulse-subtle" size={20} />
            AI Quiz Generator
          </h2>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all duration-150"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            /* Loading State: Skeleton Loader */
            <div className="space-y-6">
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                <div className="h-10 bg-slate-800/60 rounded-xl w-full"></div>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest text-center animate-pulse">
                  Generating questions using AI...
                </p>
                <div className="space-y-3">
                  {/* Mock Question card skeleton */}
                  <div className="p-4 border border-slate-800/80 rounded-xl bg-slate-800/10 space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 bg-slate-800/50 rounded-lg"></div>
                      <div className="h-8 bg-slate-800/50 rounded-lg"></div>
                      <div className="h-8 bg-slate-800/50 rounded-lg"></div>
                      <div className="h-8 bg-slate-800/50 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            /* Error State with Retry Button */
            <div className="py-4 space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-500">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">Generation Failed</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setError('')}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold border border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-150"
                >
                  Edit Input
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            </div>
          ) : (
            /* Input Form Screen */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Topic or Subject
                </label>
                <input 
                  type="text"
                  placeholder="e.g. World War II, React Hooks, JavaScript closures"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-150 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Difficulty
                  </label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Questions Count
                  </label>
                  <select 
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150 text-sm"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-700 text-slate-300 hover:text-white text-sm font-semibold rounded-lg transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150"
                >
                  <Sparkles size={14} /> Generate Questions
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuizGeneratorModal;
