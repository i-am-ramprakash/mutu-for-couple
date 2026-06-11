import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, Send, ShieldAlert, CheckCircle, Loader2, Award, Heart } from 'lucide-react';
import { User, DailyQuestion, DailyAnswer } from '../types';

interface DailyQuestionsProps {
  user: User;
  onBack: () => void;
  question: DailyQuestion | null;
  answers: DailyAnswer[];
  onAddAnswer: (answerText: string) => Promise<void>;
  onRefreshAnswers: () => void;
}

export default function DailyQuestions({ 
  user, onBack, question, answers, onAddAnswer, onRefreshAnswers 
}: DailyQuestionsProps) {
  const [inputText, setInputText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Find user's answer and partner's answer
  const myAnswer = answers.find(a => a.userId === user.id);
  const partnerAnswer = answers.find(a => a.userId !== user.id);

  const bothAnswered = !!myAnswer && !!partnerAnswer;

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSaving(true);
    setError('');

    try {
      await onAddAnswer(inputText.trim());
      setInputText('');
      onRefreshAnswers();
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setSaving(false);
    }
  };

  if (!question) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-1 py-4 font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-500 rounded-xl transition-all"
          id="daily_back_btn"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            Daily Questions Compartment <span className="text-amber-500">✨</span>
          </h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Take 30 seconds daily to answer a lovely relationship prompt.</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-stone-900 border border-rose-100 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
        
        {/* Decorative corner ring */}
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <Heart size={140} fill="currentColor" className="text-rose-500" />
        </div>

        {/* Question tag */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-200 px-3 py-1 rounded-xl text-[10px] font-semibold">
          <Sparkles size={11} className="animate-spin" /> TODAY'S DEEP LOVE QUERY
        </div>

        {/* Actually rendered Question text */}
        <div className="space-y-2">
          <q className="text-lg md:text-xl font-serif font-bold text-stone-700 dark:text-stone-200 block italic leading-snug">
            {question.questionText}
          </q>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Your replies remain hidden until both of you compose your answers!</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-rose-200 rounded-xl text-xs text-center border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        {/* Answers results */}
        <div className="space-y-4 pt-4 border-t border-rose-50 dark:border-stone-800">
          
          {/* My Answer bubble */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">Your Answer</span>
            {myAnswer ? (
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                {myAnswer.answerText}
                <span className="block text-[8px] text-stone-400 mt-2">✓ Submitted at {new Date(myAnswer.timestamp).toLocaleTimeString()}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <textarea
                  placeholder="Pen your answer down with love here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full text-xs p-3 border border-rose-100 dark:border-stone-700 rounded-2xl bg-stone-50/50 dark:bg-stone-800/50 focus:outline-none focus:ring-1 focus:ring-rose-400 text-stone-700 dark:text-stone-100 leading-relaxed placeholder-stone-400"
                  required
                />
                <button
                  type="submit"
                  disabled={saving || !inputText.trim()}
                  className="w-full btn-romantic py-2.5 text-xs flex items-center justify-center gap-1 shadow-md"
                  id="btn_submit_daily_answer"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <><Send size={12} /> Share My Answer</>}
                </button>
              </form>
            )}
          </div>

          {/* Partner Answer bubble */}
          <div className="space-y-1 pt-4">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">{user.partnerName || 'Companion'}'s Answer</span>
            {bothAnswered ? (
              <div className="p-4 bg-white dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                {partnerAnswer?.answerText}
                <span className="block text-[8px] text-stone-400 mt-2">✓ Submitted at {new Date(partnerAnswer!.timestamp).toLocaleTimeString()}</span>
              </div>
            ) : myAnswer ? (
              <div className="p-5 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/50 dark:border-stone-800 flex flex-col items-center text-center space-y-2">
                <ShieldAlert size={20} className="text-amber-500 animate-pulse" />
                <h4 className="font-bold text-xs text-stone-600 dark:text-stone-200">Answer Locked 🔒</h4>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-relaxed max-w-[280px]">
                  {partnerAnswer 
                    ? `${user.partnerName} answered! Unlock it by submitting your response above.`
                    : `${user.partnerName} has not completed today's love prompt yet. Send them a nudge!`
                  }
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-stone-400 dark:text-stone-500 italic">Please submit your private answer first to view partner progress.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
