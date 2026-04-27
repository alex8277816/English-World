import React, { useState, useEffect, useMemo } from 'react';
import { Vocabulary, VocabularyItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, CheckCircle2, XCircle, RotateCcw, ArrowRight, Play, BrainCircuit } from 'lucide-react';

interface ListeningQuizProps {
  vocabularies: Vocabulary[];
  onClose: () => void;
}

type QuizType = 'listening' | 'vocab' | 'cloze' | 'grammar';

interface Question {
  id: string;
  type: QuizType;
  prompt: string;
  audioText?: string;
  correctAnswer: string;
  options: string[];
  explanation?: string;
}

export default function QuizView({ vocabularies, onClose }: ListeningQuizProps) {
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const playAudio = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const generateQuestions = (type: QuizType) => {
    const allItems: any[] = [];
    vocabularies.forEach(v => {
      (v.items || []).forEach(item => {
        allItems.push({ ...item, vocabTitle: v.title });
      });
    });

    if (allItems.length < 4) return [];

    const newQuestions: Question[] = [];
    const count = 10;
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(shuffled.length, count); i++) {
        const item = shuffled[i];
        let q: Question;

        if (type === 'vocab') {
            const distractors = allItems
                .filter(x => x.text !== item.text)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(x => x.meaning);
            q = {
                id: `v-${i}`,
                type: 'vocab',
                prompt: `「${item.text}」的意思是？`,
                correctAnswer: item.meaning,
                options: [item.meaning, ...distractors].sort(() => Math.random() - 0.5)
            };
        } else if (type === 'cloze') {
            const sentence = (item.exampleSentences && item.exampleSentences.length > 0) 
                ? item.exampleSentences[0] 
                : `${item.text} is very important.`;
            const regex = new RegExp(`(${item.text})`, 'gi');
            const prompt = sentence.replace(regex, '_______');
            const distractors = allItems
                .filter(x => x.text.toLowerCase() !== item.text.toLowerCase())
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(x => x.text);
            q = {
                id: `c-${i}`,
                type: 'cloze',
                prompt: prompt,
                correctAnswer: item.text,
                options: [item.text, ...distractors].sort(() => Math.random() - 0.5)
            };
        } else if (type === 'listening') {
            const distractors = allItems
                .filter(x => x.text !== item.text)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(x => x.meaning);
            q = {
                id: `l-${i}`,
                type: 'listening',
                prompt: '請聽音頻並選出正確含意',
                audioText: item.text,
                correctAnswer: item.meaning,
                options: [item.meaning, ...distractors].sort(() => Math.random() - 0.5)
            };
        } else {
            // Grammar / Structure matching
            q = {
                id: `g-${i}`,
                type: 'grammar',
                prompt: `句子：「${item.text}」中的語法重點是？`,
                correctAnswer: item.meaning,
                options: [item.meaning, "無特定語法", "助動詞用法", "假設語氣"].sort(() => Math.random() - 0.5)
            };
        }
        newQuestions.push(q);
    }
    return newQuestions;
  };

  const startQuiz = (type: QuizType) => {
    const q = generateQuestions(type);
    if (q.length > 0) {
      setQuizType(type);
      setQuestions(q);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setIsAnswered(false);
      setSelectedOption(null);
      if (type === 'listening') playAudio(q[0].audioText || '');
    } else {
      alert("資料不足（需至少 4 個單字）");
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
      if (quizType === 'listening') playAudio(questions[nextIdx].audioText || '');
    } else {
      setShowResult(true);
    }
  };

  if (!quizType) {
    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl w-full max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-vibrant-blue text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-vibrant-ink mb-2 italic-serif-headers">全方位測驗中心</h2>
        <p className="text-vibrant-gray font-bold mb-8 text-center">請選擇您想要挑戰的測驗類型</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {[
                { id: 'listening', title: '聽力單字測驗', desc: '聽音辨義，強化聽覺記憶', color: 'bg-vibrant-blue' },
                { id: 'vocab', title: '選擇題單字測驗', desc: '中英轉換，檢驗記憶牢固度', color: 'bg-vibrant-green' },
                { id: 'cloze', title: '文章填空選擇題', desc: '語境應用，掌握單字用法', color: 'bg-vibrant-yellow' },
                { id: 'grammar', title: '文法結構測驗', desc: '邏輯分析，理清句型架構', color: 'bg-vibrant-red' }
            ].map((type) => (
                <button
                    key={type.id}
                    onClick={() => startQuiz(type.id as QuizType)}
                    className="p-6 rounded-3xl border-4 border-vibrant-ink bg-white hover:bg-vibrant-bg transition-all text-left group"
                >
                    <div className={`w-10 h-10 ${type.color} rounded-xl mb-4 flex items-center justify-center text-white`}>
                        {type.id === 'listening' ? <Volume2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <h3 className="font-black text-xl text-vibrant-ink mb-1">{type.title}</h3>
                    <p className="text-sm font-bold text-vibrant-gray">{type.desc}</p>
                </button>
            ))}
        </div>
        
        <button 
          onClick={onClose}
          className="mt-8 text-vibrant-gray font-black hover:text-vibrant-ink underline decoration-2 underline-offset-4"
        >
          取消並返回
        </button>
      </div>
    );
  }

  if (showResult) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl text-center w-full max-w-lg mx-auto"
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-black text-vibrant-ink mb-2">測驗結束！</h2>
        <div className="text-5xl font-black text-vibrant-ink my-6 bg-vibrant-yellow px-8 py-4 rounded-3xl">
          {score} / {questions.length}
        </div>
        <div className="flex gap-4">
          <button onClick={() => startQuiz(quizType)} className="flex items-center gap-2 bg-vibrant-ink text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all">
            <RotateCcw className="w-5 h-5" /> 重考一次
          </button>
          <button onClick={() => setQuizType(null)} className="px-8 py-4 rounded-2xl font-black border-2 border-vibrant-ink hover:bg-vibrant-bg transition-all">
            更換模式
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="w-full max-w-2xl bg-white rounded-[40px] border-4 border-vibrant-ink shadow-2xl overflow-hidden mx-auto">
      <div className="bg-vibrant-ink p-6 flex justify-between items-center text-white">
        <div className="flex items-center gap-4">
          <div className="bg-vibrant-yellow text-vibrant-ink px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest text-[10px]">
             Question {currentQuestionIndex + 1} / {questions.length}
          </div>
          <div className="text-white/60 font-black text-[10px] uppercase tracking-widest">
             Type: {quizType} 
          </div>
        </div>
        <button onClick={() => setQuizType(null)} className="text-white/40 hover:text-white flex items-center gap-2 font-black text-[10px]">
            退出 <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-8 md:p-12 space-y-8">
        <div className="flex flex-col items-center text-center">
          {quizType === 'listening' ? (
            <button 
              onClick={() => playAudio(currentQ.audioText || '')}
              className="w-24 h-24 bg-vibrant-blue text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all group"
            >
              <Volume2 className="w-10 h-10 group-hover:animate-pulse" />
            </button>
          ) : (
            <div className="p-8 bg-vibrant-bg rounded-3xl border-2 border-vibrant-ink/10 w-full">
                <h3 className="text-2xl font-black text-vibrant-ink leading-relaxed">
                    {currentQ.prompt}
                </h3>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleAnswer(option)}
              className={`p-5 rounded-2xl border-2 font-black text-left transition-all flex items-center justify-between ${
                isAnswered
                  ? option === currentQ.correctAnswer
                    ? 'bg-vibrant-green/10 border-vibrant-green text-vibrant-green'
                    : option === selectedOption
                    ? 'bg-vibrant-red/10 border-vibrant-red text-vibrant-red'
                    : 'bg-white border-vibrant-bg text-vibrant-gray opacity-30 shadow-none'
                  : 'bg-white border-vibrant-bg hover:border-vibrant-ink text-vibrant-ink hover:translate-y-[-2px] hover:shadow-md'
              }`}
            >
              <span className="flex-1">{option}</span>
              {isAnswered && option === currentQ.correctAnswer && <CheckCircle2 className="w-6 h-6 shrink-0" />}
              {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="w-6 h-6 shrink-0" />}
            </button>
          ))}
        </div>

        {isAnswered && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-4 flex justify-center">
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

