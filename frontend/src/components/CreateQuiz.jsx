import React, { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Save, HelpCircle, Sparkles } from 'lucide-react';
import AIQuizGeneratorModal from './AIQuizGeneratorModal';

const CreateQuiz = ({ onBack, onQuizCreated }) => {
  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20, difficulty: 'medium' }
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20, difficulty: 'medium' }
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple Validations
    if (!title.trim() || !hostName.trim()) {
      setError('Please fill in the Session Title and Host Name.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is required.`);
        return;
      }
      for (let oIdx = 0; oIdx < 4; oIdx++) {
        if (!q.options[oIdx].trim()) {
          setError(`Question ${i + 1} Option ${oIdx + 1} is required.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'}/api/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, hostName, questions })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create quiz');
      }

      const newQuiz = await response.json();
      onQuizCreated(newQuiz);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white glass rounded-lg transition-all"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold text-slate-100">
          Create New Session
        </h1>
        <button 
          type="button"
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
        >
          <Sparkles size={16} /> Generate with AI
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Card */}
        <div className="glass p-6 rounded-2xl border border-slate-700/50 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-slate-200">Session Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Session Title</label>
              <input 
                type="text"
                placeholder="e.g. JavaScript Trivia Workshop"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Host Nickname</label>
              <input 
                type="text"
                placeholder="e.g. Captain Code"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <HelpCircle className="text-purple-400" /> Questions List
          </h2>
          
          {questions.map((question, qIdx) => (
            <div key={qIdx} className="glass p-6 rounded-2xl border border-slate-700/50 space-y-4 relative shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  Question #{qIdx + 1}
                </span>
                
                {questions.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeQuestion(qIdx)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/50 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Question Title</label>
                <input 
                  type="text"
                  placeholder="What is the result of typeof NaN?"
                  value={question.text}
                  onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((option, oIdx) => {
                  const colors = [
                    'border-red-500/30 focus:ring-red-500',
                    'border-blue-500/30 focus:ring-blue-500',
                    'border-yellow-500/30 focus:ring-yellow-500',
                    'border-green-500/30 focus:ring-green-500'
                  ];
                  return (
                    <div key={oIdx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio"
                          name={`correct-answer-${qIdx}`}
                          checked={question.correctIndex === oIdx}
                          onChange={() => handleQuestionChange(qIdx, 'correctIndex', oIdx)}
                          className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-700 focus:ring-purple-500 focus:ring-2"
                        />
                        <input 
                          type="text"
                          placeholder={`Option ${oIdx + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                          className={`w-full px-4 py-2.5 bg-slate-800/80 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${colors[oIdx]}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Settings: Timer and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Time Limit (Seconds)</label>
                  <select 
                    value={question.timeLimit}
                    onChange={(e) => handleQuestionChange(qIdx, 'timeLimit', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value={10}>10 Seconds</option>
                    <option value={20}>20 Seconds</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>60 Seconds</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
                  <select 
                    value={question.difficulty}
                    onChange={(e) => handleQuestionChange(qIdx, 'difficulty', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={addQuestion}
            className="flex-1 py-3.5 flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-300 hover:text-indigo-400 rounded-xl transition-all font-medium"
          >
            <Plus size={18} /> Add Another Question
          </button>
          
          <button 
            type="submit"
            disabled={loading}
            className="flex-1 py-3.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-md shadow-indigo-600/10 disabled:opacity-50 transition-all"
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save & Publish Session'}
          </button>
        </div>
      </form>

      <AIQuizGeneratorModal 
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSuccess={(generatedQuestions) => {
          setQuestions(generatedQuestions);
        }}
      />
    </div>
  );
};

export default CreateQuiz;
