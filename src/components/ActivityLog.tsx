import { useEffect, useState, useContext } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { AuthContext } from '../App.tsx';
import { History, Plus, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityLog() {
  const { workspace } = useContext(AuthContext);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    const q = query(
      collection(db, 'workspaces', workspace.id, 'activityLog'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `workspaces/${workspace.id}/activityLog`));
    return () => unsub();
  }, [workspace?.id]);

  const iconFor = (action: string) => {
    if (action === 'added') return <Plus className="w-3.5 h-3.5 text-emerald-400" />;
    if (action === 'edited') return <Edit2 className="w-3.5 h-3.5 text-indigo-400" />;
    if (action === 'deleted') return <Trash2 className="w-3.5 h-3.5 text-red-400" />;
  };

  const colorFor = (action: string) => {
    if (action === 'added') return 'bg-emerald-400/10 border-emerald-400/20';
    if (action === 'edited') return 'bg-indigo-400/10 border-indigo-400/20';
    if (action === 'deleted') return 'bg-red-400/10 border-red-400/20';
    return 'bg-white/5 border-white/10';
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
          Activity History
          <span className="text-[10px] font-bold text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{logs.length} Events</span>
        </h2>
      </div>

      <div className="bg-dark-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        {logs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
              <History className="w-8 h-8 text-gray-600 opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">No activity yet</h3>
            <p className="text-gray-500 text-sm italic font-serif">Actions like adding, editing or deleting expenses will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${colorFor(log.action)}`}>
                  {iconFor(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">
                    <span className="font-bold text-white">{log.actorName}</span>
                    {' '}{log.action}{' '}
                    <span className="font-mono text-xs text-gray-400">{log.expenseDescription || 'an expense'}</span>
                    {' '}
                    {log.amount && <span className="font-mono text-emerald-400">${parseFloat(log.amount).toFixed(2)}</span>}
                  </p>
                  {log.paidByName && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Paid by: <span className="text-gray-400">{log.paidByName}</span></p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider font-mono">
                    {log.createdAt?.toDate ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
