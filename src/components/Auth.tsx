import React, { useState } from 'react';
import { useAuth } from '../App';
import { LogIn, BookOpen, UserPlus, UserCircle, Mail, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const { signIn, signUp, resetPassword, isSigningIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleAuthError = (err: any) => {
    const code = err.code;
    if (code === 'auth/invalid-credential') {
      setError('登入失敗：電子信箱或密碼錯誤。請檢查輸入資訊或嘗試重設密碼。');
    } else if (code === 'auth/invalid-email') {
      setError('電子信箱格式錯誤。');
    } else if (code === 'auth/user-not-found') {
      setError('找不到此帳號，請確認信箱是否正確。');
    } else if (code === 'auth/wrong-password') {
      setError('密碼錯誤。');
    } else if (code === 'auth/email-already-in-use') {
      setError('此電子信箱已被註冊。');
    } else if (code === 'auth/weak-password') {
      setError('密碼強度不足，請至少輸入 6 位字元。');
    } else {
      setError(err.message || '發生未知的錯誤。');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('請輸入電子信箱。');
      return;
    }
    setError('');
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setTimeout(() => {
        setResetSent(false);
        setIsForgotPassword(false);
      }, 5000);
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) {
      handleResetPassword(e);
      return;
    }
    setError('');
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      if (isLogin) {
        if (!trimmedEmail || !trimmedPassword) throw new Error("請填寫所有欄位");
        await signIn(trimmedEmail, trimmedPassword);
      } else {
        if (!name.trim() || !trimmedEmail || !trimmedPassword) throw new Error("請填寫所有欄位");
        await signUp(trimmedEmail, trimmedPassword, name);
      }
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white overflow-hidden relative font-sans">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-vibrant-yellow rounded-full blur-3xl -mr-48 -mt-48 opacity-50" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-vibrant-blue rounded-full blur-3xl -ml-48 -mb-48 opacity-30" />

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-vibrant-red rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12 border-b-8 border-r-8 border-black/10"
          >
            <BookOpen className="w-12 h-12 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black text-vibrant-ink mb-4 tracking-tighter"
          >
            LexiFlow
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-vibrant-gray text-xl font-medium"
          >
            Master English with a pulse.
          </motion.p>
        </div>

        <motion.div 
          layout
          className="bg-white p-8 rounded-[40px] border-b-8 border-r-8 border-vibrant-border shadow-2xl"
        >
          {isForgotPassword ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <button 
                  onClick={() => { setIsForgotPassword(false); setError(''); }}
                  className="p-2 hover:bg-vibrant-bg rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-vibrant-gray" />
                </button>
                <h2 className="text-xl font-black text-vibrant-ink uppercase tracking-widest">重設密碼</h2>
              </div>
              
              <p className="text-sm text-vibrant-gray font-medium leading-relaxed">
                請輸入您的電子信箱，我們將寄送密碼重設連結給您。
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                    <input 
                      required
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-blue/10 font-bold text-vibrant-ink transition-all"
                    />
                  </div>
                </div>

                {resetSent && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold text-vibrant-green bg-vibrant-green/5 p-3 rounded-xl border border-vibrant-green/20"
                  >
                    密碼重設郵件已寄出！請檢查您的收件匣。
                  </motion.p>
                )}

                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold text-vibrant-red bg-vibrant-red/5 p-3 rounded-xl border border-vibrant-red/20"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  disabled={isSigningIn}
                  type="submit"
                  className="w-full bg-vibrant-ink text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-lg disabled:opacity-50"
                >
                  <Mail className="w-5 h-5 text-vibrant-yellow" />
                  寄送重設郵件
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex bg-[#F1F2F6] p-2 rounded-2xl mb-8">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-vibrant-ink shadow-sm' : 'text-vibrant-gray'}`}
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${!isLogin ? 'bg-white text-vibrant-ink shadow-sm' : 'text-vibrant-gray'}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray ml-2">Display Name</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                        <input 
                          required
                          type="text" 
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-red/10 font-bold text-vibrant-ink transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray ml-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                    <input 
                      required
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-red/10 font-bold text-vibrant-ink transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray ml-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                    <input 
                      required
                      type="password" 
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-red/10 font-bold text-vibrant-ink transition-all"
                    />
                  </div>
                  {isLogin && (
                    <div className="flex justify-end pr-2">
                      <button 
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); }}
                        className="text-[10px] font-black uppercase tracking-widest text-vibrant-blue hover:text-vibrant-ink transition-colors"
                      >
                        忘記密碼？
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold text-vibrant-red bg-vibrant-red/5 p-3 rounded-xl border border-vibrant-red/20"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  disabled={isSigningIn}
                  type="submit"
                  className="w-full bg-vibrant-ink text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-lg disabled:opacity-50 mt-6 active:scale-95"
                >
                  {isLogin ? <LogIn className="w-5 h-5 text-vibrant-green" /> : <UserPlus className="w-5 h-5 text-vibrant-blue" />}
                  {isSigningIn ? 'Processing...' : (isLogin ? 'Start Flowing' : 'Create Account')}
                </button>
              </form>
            </>
          )}
        </motion.div>
        
        <p className="mt-8 text-center text-vibrant-gray font-black text-xs uppercase tracking-widest">
          Secure Personal learning tracking
        </p>
      </div>
    </div>
  );
}
