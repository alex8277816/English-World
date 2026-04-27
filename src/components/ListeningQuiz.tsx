import React, { useState, useEffect, useMemo } from 'react';
import { Vocabulary, VocabularyItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, CheckCircle2, XCircle, RotateCcw, ArrowRight, Play, BrainCircuit } from 'lucide-react';

interface ListeningQuizProps {
  vocabularies: Vocabulary[];
  onClose: () => void;
}

interface Question {
  audioText: string;
  correctAnswer: string;
  options: string[];
  type: 'word' | 'sentence' | 'example';
}

export default function ListeningQuiz({ vocabularies, onClose }: ListeningQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const playAudio = (text: string) => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported in this browser.");
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const generateQuestions = () => {
    const allItems: { text: string; meaning: string; examples: string[] }[] = [];
    vocabularies.forEach(v => {
      (v.items || []).forEach(item => {
        if (item.text && item.meaning) {
          allItems.push({
            text: item.text,
            meaning: item.meaning,
            examples: item.exampleSentences || []
          });
        }
      });
    });

    if (allItems.length < 4) return [];

    const newQuestions: Question[] = [];
    const count = Math.min(allItems.length, 10);

    const shuffledItems = [...allItems].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const item = shuffledItems[i];
      const typeRand = Math.random();
      let audioText = item.text;
      let correctAnswer = item.meaning;
      let type: 'word' | 'sentence' | 'example' = 'word';

      if (typeRand > 0.6 && item.examples.length > 0) {
        audioText = item.examples[Math.floor(Math.random() * item.examples.length)];
        correctAnswer = audioText;
        type = 'example';
      }

      // Generate options
      let options: string[] = [];
      if (type === 'word') {
        const distractors = allItems
          .filter(x => x.text !== item.text)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(x => x.meaning);
        options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      } else {
        // For sentences/examples, maybe multiple choices of the sentence itself or similar sounding ones
        // But for simplicity, let's use other sentences as distractors
        const allSentences: string[] = [];
        allItems.forEach(x => {
          allSentences.push(x.text);
          (x.examples || []).forEach(e => allSentences.push(e));
        });
        const distractors = allSentences
          .filter(x => x !== audioText)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [audioText, ...distractors].sort(() => Math.random() - 0.5);
      }

      newQuestions.push({
        audioText,
        correctAnswer,
        options,
        type
      });
    }

    return newQuestions;
  };

  const startQuiz = () => {
    console.log("startQuiz triggered");
    if (!vocabularies || vocabularies.length === 0) {
      alert("目前沒有學習筆記，請先新增單字再進行測驗。");
      return;
    }

    try {
      const q = generateQuestions();
      console.log("Questions generated:", q.length);
      
      if (q && q.length > 0) {
        setQuestions(q);
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedOption(null);
        setIsAnswered(false);
        
        // Use a small delay for state to settle before playing audio
        setQuizStarted(true);
        setTimeout(() => {
          try {
            playAudio(q[0].audioText);
          } catch (e) {
            console.error("Initial audio play failed:", e);
          }
        }, 500);
      } else {
        alert("單字或是例句數量不足，無法產生測驗 (需至少 4 個單字項目)");
      }
    } catch (err) {
      console.error("Error in startQuiz:", err);
      alert("啟動測驗時發生錯誤，請稍後再試。");
    }
  };

  const handleAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === questions[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setIsAnswered(false);
      setSelectedOption(null);
      setTimeout(() => {
        try {
          playAudio(questions[nextIdx].audioText);
        } catch (e) {
          console.error("Next question audio failed:", e);
        }
      }, 300);
    } else {
      setShowResult(true);
    }
  };

  if (!quizStarted) {
    return (
      <div className="flex flex-col items-center justify-center p-10 md:p-16 bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl w-full max-w-lg mx-auto">
        <div className="w-24 h-24 bg-vibrant-blue text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <BrainCircuit className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-black text-vibrant-ink mb-4 italic-serif-headers">聽力大考驗</h2>
        <p className="text-vibrant-gray font-bold mb-10 text-center leading-relaxed">
          系統將會播放您學習筆記中的單字或例句，<br />請選出正確的語意。
        </p>
        <button 
          type="button"
          onClick={startQuiz}
          className="w-full bg-vibrant-ink text-white py-5 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-2xl active:scale-95 cursor-pointer"
        >
          開始測驗
        </button>
      </div>
    );
  }

  if (showResult) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl text-center"
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-black text-vibrant-ink mb-2">測驗結束！</h2>
        <div className="text-5xl font-black text-vibrant-ink my-6 bg-vibrant-yellow px-8 py-4 rounded-3xl">
          {score} / {questions.length}
        </div>
        <p className="text-vibrant-gray font-bold mb-8">
          {score === questions.length ? '天啊！你太強了！' : '繼續加油，離掌握更進一步！'}
        </p>
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={startQuiz}
            className="flex items-center gap-2 bg-vibrant-ink text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            重考一次
          </button>
          <button 
            type="button"
            onClick={() => { setQuizStarted(false); onClose(); }}
            className="px-8 py-4 rounded-2xl font-black border-2 border-vibrant-ink hover:bg-vibrant-bg transition-all"
          >
            返回筆記
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="w-full max-w-2xl bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl overflow-hidden">
      <div className="bg-vibrant-ink p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-vibrant-yellow text-vibrant-ink px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest">
            Question {currentQuestionIndex + 1} / {questions.length}
          </div>
          <div className="bg-white/10 text-white px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest">
             Score: {score}
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><ArrowRight className="w-5 h-5" /></button>
      </div>

      <div className="p-8 md:p-12 space-y-8">
        <div className="flex flex-col items-center">
          <button 
            onClick={() => playAudio(currentQ.audioText)}
            className="w-24 h-24 bg-vibrant-blue text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all group"
          >
            <Volume2 className="w-10 h-10 group-hover:animate-pulse" />
          </button>
          <p className="mt-6 text-vibrant-gray font-black uppercase tracking-widest text-xs opacity-50">點擊播放聲音</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleAnswer(option)}
              className={`p-5 rounded-2xl border-2 font-bold text-left transition-all flex items-center justify-between group ${
                isAnswered
                  ? option === currentQ.correctAnswer
                    ? 'bg-vibrant-green/10 border-vibrant-green text-vibrant-green'
                    : option === selectedOption
                    ? 'bg-vibrant-red/10 border-vibrant-red text-vibrant-red'
                    : 'bg-white border-vibrant-bg text-vibrant-gray opacity-50'
                  : 'bg-white border-vibrant-bg hover:border-vibrant-ink text-vibrant-ink'
              }`}
            >
              <span className="flex-1">{option}</span>
              {isAnswered && option === currentQ.correctAnswer && <CheckCircle2 className="w-6 h-6" />}
              {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="w-6 h-6" />}
            </button>
          ))}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 flex justify-center"
          >
            <button 
              onClick={nextQuestion}
              className="bg-vibrant-ink text-white px-12 py-4 rounded-2xl font-black text-lg flex items-center gap-3 shadow-xl hover:bg-black transition-all"
            >
              {currentQuestionIndex < questions.length - 1 ? '下一題' : '查看結果'}
              <ArrowRight className="w-6 h-6 text-vibrant-yellow" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
