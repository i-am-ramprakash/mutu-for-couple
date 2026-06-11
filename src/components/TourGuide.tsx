import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronRight, ChevronLeft, Heart, MessageSquare, 
  Tv, Camera, Calendar, BookOpen, Quote, Map, Lock, Sparkles 
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface TourGuideProps {
  onClose: () => void;
}

const steps: TourStep[] = [
  {
    title: "Welcome to MuTu",
    description: "Your private digital sanctuary. Designed exclusively for you and your partner to stay connected, no matter the distance.",
    icon: <Heart size={48} className="text-rose-500" fill="currentColor" />,
    color: "bg-rose-50"
  },
  {
    title: "Private Chat",
    description: "Exchange heart emojis, live GIFs, and private letters. Every interaction is beautifully private and just for you two.",
    icon: <MessageSquare size={48} className="text-blue-500" />,
    color: "bg-blue-50"
  },
  {
    title: "Shared Movie Room",
    description: "Watch videos together in real-time. Perfectly synced playback means you're always sharing the exact same moment.",
    icon: <Tv size={48} className="text-purple-500" />,
    color: "bg-purple-50"
  },
  {
    title: "Memory Wall",
    description: "Collect your favorite moments on a shared Polaroid wall. A visual timeline of your journey together.",
    icon: <Camera size={48} className="text-amber-500" />,
    color: "bg-amber-50"
  },
  {
    title: "Love Calendar",
    description: "Keep track of anniversaries, dates, and special events. Never miss a moment to celebrate your bond.",
    icon: <Calendar size={48} className="text-emerald-500" />,
    color: "bg-emerald-50"
  },
  {
    title: "Daily Q&A Box",
    description: "Spark deep conversations with daily questions. Unlock your partner's answer by sharing your own.",
    icon: <Quote size={48} className="text-indigo-500" />,
    color: "bg-indigo-50"
  },
  {
    title: "Shared Journal",
    description: "Write together in a collaborative diary. A safe space for your inner thoughts and shared dreams.",
    icon: <BookOpen size={48} className="text-pink-500" />,
    color: "bg-pink-50"
  },
  {
    title: "Adventure Bucket List",
    description: "Plan your future together. Add new dreams and track the adventures you've conquered.",
    icon: <Map size={48} className="text-orange-500" />,
    color: "bg-orange-50"
  },
  {
    title: "Secret Vault",
    description: "Store digital antiques and heart-locked letters to be opened on future dates. Time-capsules of your love.",
    icon: <Lock size={48} className="text-stone-500" />,
    color: "bg-stone-50"
  },
  {
    title: "AI Love Assistant",
    description: "Get creative date ideas, relationship health reports, and fun storytelling games powered by gentle AI.",
    icon: <Sparkles size={48} className="text-cyan-500" />,
    color: "bg-cyan-50"
  }
];

export default function TourGuide({ onClose }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-rose-100 dark:border-stone-800 relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-stone-100 dark:bg-stone-800 flex">
          {steps.map((_, idx) => (
            <div 
              key={idx}
              className={`h-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-rose-500' : 'bg-transparent'
              }`}
              style={{ width: `${100 / steps.length}%` }}
            />
          ))}
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-400"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-12 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className={`p-8 rounded-[2rem] ${steps[currentStep].color} dark:bg-stone-800/50 mb-8 shadow-inner`}>
                {steps[currentStep].icon}
              </div>
              
              <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium max-w-sm">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between w-full mt-12 gap-4">
            <button
              onClick={prev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                currentStep === 0 
                  ? 'text-stone-300 dark:text-stone-700 cursor-not-allowed' 
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'w-4 bg-rose-500' : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-2 px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-200 dark:shadow-none"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
