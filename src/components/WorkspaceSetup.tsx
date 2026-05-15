import React, { useState, useContext } from 'react';
import { AuthContext } from '../App.tsx';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { motion } from 'motion/react';
import { signOut } from 'firebase/auth';
import { Plus, Hash, AlertCircle, LogOut } from 'lucide-react';

export default function WorkspaceSetup() {
  const { user } = useContext(AuthContext);
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const rawUserName = user?.name || auth.currentUser.displayName || 'Friend';
      const userName = typeof rawUserName === 'string' ? rawUserName : 'Friend';
      
      const wsRef = await addDoc(collection(db, 'workspaces'), {
        name: workspaceName,
        joinCode: code,
        members: [auth.currentUser.uid],
        membersList: { [auth.currentUser.uid]: userName },
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'joinCodes', code), { workspaceId: wsRef.id });
      await setDoc(doc(db, 'users', auth.currentUser.uid), { workspaceId: wsRef.id }, { merge: true });
      
      // Create initial period
      await addDoc(collection(db, 'workspaces', wsRef.id, 'periods'), {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isSettled: false,
        createdAt: serverTimestamp()
      });
      
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.WRITE, 'workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      
      const code = joinCode.toUpperCase();
      const codeRef = doc(db, 'joinCodes', code);
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists()) {
        throw new Error('Invalid invitation code');
      }

      const workspaceId = codeSnap.data().workspaceId;
      const wsRef = doc(db, 'workspaces', workspaceId);
      const wsSnap = await getDoc(wsRef);

      if (!wsSnap.exists()) {
        throw new Error('Workspace no longer exists');
      }

      const wsData = wsSnap.data();
      if (wsData.members.length >= 2) {
        throw new Error('Workspace is already full (max 2 friends)');
      }

      if (wsData.members.includes(auth.currentUser.uid)) {
        throw new Error('You are already a member of this workspace');
      }

      // Join workspace
      const rawUserName = user?.name || auth.currentUser.displayName || 'Friend';
      const userName = typeof rawUserName === 'string' ? rawUserName : 'Friend';
      const newMembers = [...wsData.members, auth.currentUser.uid];
      const newMembersList = { ...wsData.membersList, [auth.currentUser.uid]: userName };
      
      await updateDoc(wsRef, { 
        members: newMembers,
        membersList: newMembersList
      });

      await setDoc(doc(db, 'users', auth.currentUser.uid), { workspaceId: workspaceId }, { merge: true });

    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.WRITE, 'join');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-accent/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        
        <button onClick={() => signOut(auth)} className="absolute top-6 right-6 flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-red-400 transition-colors uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">Choose Your Path</h1>
          <p className="text-gray-500 font-serif italic mb-16 max-w-lg mx-auto">Every shared journey begins with a first step. Create a new space or join an existing one.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button
              onClick={() => setMode('create')}
              className="p-10 bg-dark-card rounded-3xl border border-white/5 hover:border-emerald-accent/30 transition-all text-left group relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-emerald-accent/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-emerald-accent/20 transition-colors">
                <Plus className="text-emerald-accent w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Create New</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Start a fresh workspace for you and your partner. Generate a code to invite them.</p>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-accent/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="p-10 bg-dark-card rounded-3xl border border-white/5 hover:border-indigo-accent/30 transition-all text-left group relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-indigo-accent/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-accent/20 transition-colors">
                <Hash className="text-indigo-accent w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Join Existing</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Friend already invited you? Enter the secret code to sync your shared data instantly.</p>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-accent/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-dark-inner opacity-40" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full bg-dark-card p-10 rounded-3xl border border-white/10 shadow-2xl z-10"
      >
        <button 
          onClick={() => setMode(null)} 
          className="text-xs font-bold text-gray-600 hover:text-white uppercase tracking-[0.2em] mb-10 transition-colors"
        >
          ← Go Back
        </button>
        
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{mode === 'create' ? 'Name Space' : 'Enter Code'}</h2>
        <p className="text-gray-500 text-sm italic font-serif mb-8">
          {mode === 'create' ? 'Define your collective goal. (e.g., Household, Japan Trip)' : 'Enter the 6-character identifier shared by your friend.'}
        </p>

        <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">{mode === 'create' ? 'WORKSPACE NAME' : 'INVITATION CODE'}</label>
            <input
              required
              autoFocus
              type="text"
              placeholder={mode === 'create' ? 'Europe 2024' : 'A B C X Y Z'}
              className="w-full px-5 py-3 bg-dark-inner border border-white/5 rounded-xl text-white placeholder:text-gray-800 focus:ring-2 focus:ring-emerald-accent/50 focus:border-emerald-accent outline-none font-mono tracking-widest uppercase transition-all"
              value={mode === 'create' ? workspaceName : joinCode}
              onChange={e => mode === 'create' ? setWorkspaceName(e.target.value) : setJoinCode(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-400/5 text-red-400 rounded-xl text-[10px] font-bold border border-red-400/10 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 shadow-xl shadow-white/5 uppercase tracking-widest text-xs"
          >
             {loading ? 'Processing...' : (mode === 'create' ? 'Create Space' : 'Join Now')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
