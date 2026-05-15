import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, Chrome, UserCircle } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || 'Friend',
          email: user.email,
          createdAt: serverTimestamp(),
          workspaceId: null
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google login is not enabled in Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email but a different sign-in method.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        name: 'Guest User',
        email: 'guest@example.com',
        createdAt: serverTimestamp(),
        workspaceId: null
      });
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        setError('Guest login is disabled. Please enable "Anonymous" in your Firebase Console (Authentication > Sign-in method).');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const userRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: cred.user.displayName || formData.email.split('@')[0],
            email: cred.user.email,
            createdAt: serverTimestamp(),
            workspaceId: null
          });
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: formData.name });

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          name: formData.name,
          email: formData.email,
          createdAt: serverTimestamp(),
          workspaceId: null
        });
      }
    } catch (err: any) {
      console.error('Firebase auth error code:', err.code, err.message);
      setError(`Error: ${err.code} — ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-accent shadow-2xl shadow-indigo-accent/30 mb-8"
          >
            <LogIn className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase italic">Expense</h1>
          <p className="text-gray-500 font-medium tracking-wide">
            The simplest way to split costs with friends.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-950/30 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-5 bg-white text-dark-bg rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Chrome className="w-5 h-5" />
            Sign in with Google
          </button>

          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <UserCircle className="w-5 h-5" />
            Continue as Guest
          </button>

          {!showEmailAuth ? (
            <button
              onClick={() => setShowEmailAuth(true)}
              className="w-full py-4 text-gray-600 font-bold uppercase tracking-widest text-[10px] hover:text-gray-400 transition-colors"
            >
              Or use your email
            </button>
          ) : (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="pt-6"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full px-5 py-4 bg-dark-card border border-white/5 rounded-xl text-white placeholder:text-gray-700 outline-none focus:border-indigo-accent transition-colors font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                )}
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  className="w-full px-5 py-4 bg-dark-card border border-white/5 rounded-xl text-white placeholder:text-gray-700 outline-none focus:border-indigo-accent transition-colors font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full px-5 py-4 bg-dark-card border border-white/5 rounded-xl text-white placeholder:text-gray-700 outline-none focus:border-indigo-accent transition-colors font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-accent text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-accent/20"
                >
                  {loading ? '...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
                <div className="flex justify-between px-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailAuth(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
