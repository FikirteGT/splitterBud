import { useEffect, useState, useContext } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { AuthContext } from '../App.tsx';
import { auth, db as firebaseDb } from '../lib/firebase';
import { motion } from 'motion/react';
import { X, Bell, CheckCircle, Info, Trash2, Edit, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function Notifications({ onClose }: { onClose: () => void }) {
  const { user, workspace } = useContext(AuthContext);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleApprove = async (n: any) => {
    await updateDoc(doc(firebaseDb, 'users', user.id, 'notifications', n.id), { isRead: true, approved: true });
  };

  const handleReject = async (n: any) => {
    if (!workspace?.id || !n.expenseId) return;
    await updateDoc(doc(firebaseDb, 'workspaces', workspace.id, 'expenses', n.expenseId), { amount: n.oldAmount });
    await updateDoc(doc(firebaseDb, 'users', user.id, 'notifications', n.id), { isRead: true, approved: false });
  };

  const handleDismiss = async (n: any) => {
    await updateDoc(doc(firebaseDb, 'users', user.id, 'notifications', n.id), { isRead: true });
  };

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'users', user.id, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.id}/notifications`));

    return () => unsubscribe();
  }, [user?.id]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ADD_EXPENSE': return <CheckCircle className="text-emerald-accent w-5 h-5" />;
      case 'EDIT_EXPENSE': return <Edit className="text-indigo-accent w-5 h-5" />;
      case 'DELETE_EXPENSE': return <Trash2 className="text-red-400 w-5 h-5" />;
      default: return <Info className="text-gray-400 w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-sm bg-dark-card h-full border-l border-white/10 shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-inner/50">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-accent/10 rounded-xl flex items-center justify-center text-emerald-accent border border-emerald-accent/20">
               <Bell className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-white leading-none mb-1">Activity</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Partner Updates</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
              <div className="w-8 h-8 border-2 border-emerald-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Syncing...</p>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-8">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                 <Bell className="w-8 h-8 opacity-10" />
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">Clean Slate</p>
              <p className="text-xs italic font-serif">No recent activity found.</p>
            </div>
          ) : (
            notifs.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                  n.isRead ? 'bg-white/5 border-white/5' : 'bg-indigo-accent/5 border-indigo-accent/20 shadow-lg shadow-indigo-accent/5'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm leading-relaxed ${n.isRead ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                    {n.message}
                  </p>
                  {n.requiresApproval && !n.isRead && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(n)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-accent/10 text-emerald-400 border border-emerald-accent/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-accent/20 transition-all"
                      >
                        <ThumbsUp className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(n)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-400/20 transition-all"
                      >
                        <ThumbsDown className="w-3 h-3" /> Revert
                      </button>
                    </div>
                  )}
                  {!n.requiresApproval && !n.isRead && (
                    <button
                      onClick={() => handleDismiss(n)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                  {n.isRead && n.approved !== undefined && (
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${n.approved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {n.approved ? '✓ Approved' : '✗ Reverted'}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-600 font-mono mt-2 uppercase tracking-tighter">
                    {(() => {
                      const dt = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
                      return `${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${dt.toLocaleDateString()}`;
                    })()}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-indigo-accent shrink-0 mt-2 shadow-lg shadow-indigo-accent/50 animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
