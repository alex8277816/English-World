import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Lock, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ResetPasswordProps {
  oobCode: string;
  onComplete: () => void;
}

export default function ResetPassword({ oobCode, onComplete }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'verifying' | 'input' | 'submitting' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyCode = async () => {
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setStatus('input');
      } catch (err: any) {
        console.error(err);
        setError('連結無效或已過期，請重新申請重設密碼。');
        setStatus('error');
      }
    };
    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('密碼長度至少需要 6 個字元。');
      return;
    }
    setError('');
    setStatus('submitting');
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      setTimeout(onComplete, 3000);
    } catch (err: any) {
      console.error(err);
      setError('重設失敗，請稍後再試。');
      setStatus('error');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-vibrant-blue animate-spin" />
          <p className="font-black text-vibrant-ink uppercase tracking-widest text-sm">正在驗證代碼...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 rounded-[40px] border-b-8 border-r-8 border-vibrant-border shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-vibrant-yellow/10 rounded-full -mr-16 -mt-16" />
        
        {status === 'success' ? (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex p-4 bg-vibrant-green/10 rounded-full text-vibrant-green">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-vibrant-ink leading-tight">密碼修改成功！</h2>
            <p className="text-vibrant-gray font-bold">正在引導您前往登入頁面...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-black text-vibrant-ink leading-tight mb-2">設定新密碼</h2>
              <p className="text-vibrant-gray font-medium">為帳號 <span className="text-vibrant-blue font-bold">{email}</span> 設定一個新的安全密碼。</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray ml-2">新密碼</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                  <input 
                    required
                    type="password" 
                    placeholder="至少 6 位字元"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-blue/10 font-bold text-vibrant-ink transition-all"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 bg-vibrant-red/5 p-4 rounded-2xl border border-vibrant-red/20 text-vibrant-red"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </motion.div>
              )}

              <button
                disabled={status === 'submitting'}
                type="submit"
                className="w-full bg-vibrant-ink text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all text-lg disabled:opacity-50"
              >
                {status === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 text-vibrant-yellow" />}
                {status === 'submitting' ? '更新中...' : '確認修改'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
