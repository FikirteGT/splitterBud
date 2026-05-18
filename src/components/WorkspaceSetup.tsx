import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App.tsx';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { motion } from 'motion/react';
import { signOut } from 'firebase/auth';
import { Plus, Hash, AlertCircle, LogOut, ChevronRight, Users } from 'lucide-react';

export default function WorkspaceSetup() {
  const { user, setActiveWorkspaceId } = useContext(AuthContext);
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchWorkspaces = async () => {
      const q = query(collection(db, 'workspaces'), where('members', 'array-contains', auth.currentUser!.uid));
      const snap = await getDocs(q);
      setWorkspaces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingWorkspaces(false);
    };
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userName = user?.name || auth.currentUser.displayName || 'Friend';
      
      const wsRef = await addDoc(collection(db, 'workspaces'), {
        name: workspaceName,
        joinCode: code,
        members: [auth.currentUser.uid],
        membersList: { [auth.currentUser.uid]: userName },
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'joinCodes', code), { workspaceId: wsRef.id });
      await addDoc(collection(db, 'workspaces', wsRef.id, 'periods'), {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isSettled: false,
        createdAt: serverTimestamp()
      });

      setActiveWorkspaceId(wsRef.id);
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
      const codeSnap = await getDoc(doc(db, 'joinCodes', code));
      if (!codeSnap.exists()) throw new Error('Invalid invitation code');

      const workspaceId = codeSnap.data().workspaceId;
      const wsSnap = await getDoc(doc(db, 'workspaces', workspaceId));
      if (!wsSnap.exists()) throw new Error('Workspace no longer exists');

      const wsData = wsSnap.data();
      if (wsData.members.length >= 2) throw new Error('Workspace is already full (max 2 friends)');
      if (wsData.members.includes(auth.currentUser.uid)) throw new Error('You are already a member of this workspace');

      const userName = user?.name || auth.currentUser.displayName || 'Friend';
      await updateDoc(doc(db, 'workspaces', workspaceId), { 
        members: [...wsData.members, auth.currentUser.uid],
        membersList: { ...wsData.membersList, [auth.currentUser.uid]: userName }
      });

      setActiveWorkspaceId(workspaceId);
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

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">Your Workspaces</h1>
            <p className="text-gray-500 font-serif italic">Pick an existing workspace or start a new one.</p>
          </div>

          {/* Existing workspaces */}
          {!loadingWorkspaces && workspaces.length > 0 && (
            <div className="mb-8 space-y-3">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspaceId(ws.id)}
                  className="w-full p-5 bg-dark-card rounded-2xl border border-white/5 hover:border-emerald-accent/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-accent/10 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">{ws.name}</p>
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{ws.joinCode} · {ws.members?.length}/2 members</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-accent transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Create / Join */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('create')}
              className="p-8 bg-dark-card rounded-3xl border border-white/5 hover:border-emerald-accent/30 transition-all text-left group relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-emerald-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-accent/20 transition-colors">
                <Plus className="text-emerald-accent w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">Create New</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Start a fresh workspace and invite a friend.</p>
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="p-8 bg-dark-card rounded-3xl border border-white/5 hover:border-indigo-accent/30 transition-all text-left group relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-indigo-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-accent/20 transition-colors">
                <Hash className="text-indigo-accent w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">Join Existing</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Enter a 6-character code from your friend.</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full bg-dark-card p-10 rounded-3xl border border-white/10 shadow-2xl z-10"
      >
        <button onClick={() => setMode(null)} className="text-xs font-bold text-gray-600 hover:text-white uppercase tracking-[0.2em] mb-10 transition-colors">
          ← Go Back
        </button>
        
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{mode === 'create' ? 'Name Your Space' : 'Enter Code'}</h2>
        <p className="text-gray-500 text-sm italic font-serif mb-8">
          {mode === 'create' ? 'e.g. Japan Trip, Apartment, Road Trip' : 'Enter the 6-character code shared by your friend.'}
        </p>

        <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">
              {mode === 'create' ? 'WORKSPACE NAME' : 'INVITATION CODE'}
            </label>
            <input
              required
              autoFocus
              type="text"
              placeholder={mode === 'create' ? 'Europe 2024' : 'ABCXYZ'}
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
            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? 'Processing...' : (mode === 'create' ? 'Create Space' : 'Join Now')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
