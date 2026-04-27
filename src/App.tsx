import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<string | null>(null);

  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Check for auth action codes in URL (for password reset)
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if (mode && oobCode) {
      setAuthMode(mode);
      setResetCode(oobCode);
    }

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
    } catch (error: any) {
      console.error("Sign-up error:", error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin,
      handleCodeInApp: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-2xl font-sans font-medium text-slate-400"
        >
          LexiFlow
        </motion.div>
      </div>
    );
  }

  // Handle password reset mode
  if (authMode === 'resetPassword' && resetCode) {
    return (
      <ResetPassword 
        oobCode={resetCode} 
        onComplete={() => {
          setAuthMode(null);
          setResetCode(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }} 
      />
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isSigningIn, signIn, signUp, resetPassword, logout }}>
      <div className="min-h-screen bg-vibrant-bg text-vibrant-ink font-sans selection:bg-vibrant-yellow italic-serif-headers">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <Auth />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthContext.Provider>
  );
}
