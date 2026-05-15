import { useEffect, useState, useContext } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { AuthContext } from '../App.tsx';
import { motion } from 'motion/react';
import { Wallet, PieChart, TrendingUp, UserCheck, ShieldCheck, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils.ts';

export default function Dashboard() {
  const { workspace } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;

    const expQ = query(collection(db, 'workspaces', workspace.id, 'expenses'));
    const unsubscribeExps = onSnapshot(expQ, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `workspaces/${workspace.id}/expenses`));

    const perQ = query(collection(db, 'workspaces', workspace.id, 'periods'));
    const unsubscribePers = onSnapshot(perQ, (snap) => {
      setPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `workspaces/${workspace.id}/periods`));

    return () => {
      unsubscribeExps();
      unsubscribePers();
    };
  }, [workspace?.id]);

  const currentPeriod = periods[0] || { isSettled: false };
  
  if (!workspace || loading) return null;

  // Calculate totals for the current workspace
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const userAmounts = (workspace.members || []).map((userId: string) => ({
    id: userId,
    name: workspace.membersList[userId] || 'Friend',
    totalPaid: expenses
      .filter(e => e.paidBy === userId)
      .reduce((sum, e) => sum + e.amount, 0)
  }));

  const userA = userAmounts[0];
  const userB = userAmounts[1];

  let debtMessage = "Everyone is even!";
  let primaryLabel = "All Settled";
  let primaryValue = "0.00";

  if (userA && userB) {
    const half = totalSpent / 2;
    const diff = userA.totalPaid - half;

    if (Math.abs(diff) < 0.01) {
      debtMessage = "Exactly settled!";
    } else if (diff > 0) {
      // User A paid more than half -> User B owes User A
      debtMessage = `${userB.name} owes ${userA.name} ${formatCurrency(diff)}`;
      primaryLabel = `${userB.name} owes`;
      primaryValue = formatCurrency(diff);
    } else {
      // User A paid less than half -> User A owes User B
      debtMessage = `${userA.name} owes ${userB.name} ${formatCurrency(Math.abs(diff))}`;
      primaryLabel = `${userA.name} owes`;
      primaryValue = formatCurrency(Math.abs(diff));
    }
  }

  const handleSettle = async () => {
    if (!currentPeriod.id || !workspace.id) return;
    if (confirm("Are you sure you want to mark this period as settled?")) {
      try {
        const perRef = doc(db, 'workspaces', workspace.id, 'periods', currentPeriod.id);
        await updateDoc(perRef, {
          isSettled: true,
          settledAt: serverTimestamp(),
          settledBy: auth.currentUser?.uid
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `workspaces/${workspace.id}/periods/${currentPeriod.id}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-white/5 p-6 rounded-2xl"
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Total Workspace Spend</p>
          <p className="text-3xl font-light font-mono text-white">
            {totalSpent.toFixed(2)} <span className="text-sm text-gray-500 uppercase">USD</span>
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-card border border-white/5 p-6 rounded-2xl"
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{userA?.name || 'User A'}'s Contribution</p>
          <p className="text-3xl font-light font-mono text-indigo-accent">
            {(userA?.totalPaid || 0).toFixed(2)} <span className="text-sm text-gray-500 uppercase">USD</span>
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-card border border-white/5 p-6 rounded-2xl"
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{userB?.name || 'Friend'}'s Contribution</p>
          <p className="text-3xl font-light font-mono text-emerald-accent">
            {(userB?.totalPaid || 0).toFixed(2)} <span className="text-sm text-gray-500 uppercase">USD</span>
          </p>
        </motion.div>
      </div>

      {/* Debt Banner (Current Balance) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-accent/10 border border-amber-accent/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-amber-accent/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7 text-amber-accent" />
          </div>
          <div>
            <p className="text-xl font-medium text-amber-50/90 tracking-tight">Current Balance</p>
            <p className="text-sm text-amber-accent/60 font-serif italic uppercase tracking-widest">
              {debtMessage}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-right">
          <div className="hidden sm:block">
            <p className="text-[10px] text-amber-accent/50 font-mono tracking-widest uppercase mb-1">
              {currentPeriod.isSettled ? 'SETTLED PERIOD' : 'UNSETTLED PERIOD'}
            </p>
            <p className="text-3xl font-light text-amber-accent font-mono">
              {primaryValue.replace(/[^0-9.]/g, '')}
            </p>
          </div>

          {currentPeriod.id && !currentPeriod.isSettled ? (
            <button 
              onClick={handleSettle}
              className="px-6 py-2.5 bg-emerald-accent text-black rounded-xl font-bold text-sm shadow-xl shadow-emerald-accent/20 hover:bg-emerald-accent/90 transition-all flex items-center gap-2"
            >
              Settle Week <ChevronRight className="w-4 h-4" />
            </button>
          ) : currentPeriod.isSettled && (
            <div className="flex items-center gap-2 bg-emerald-accent/20 px-4 py-2 rounded-xl border border-emerald-accent/30 text-emerald-accent">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-bold">Settled</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions / Link code */}
      {!userB && (
        <div className="p-4 bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-indigo-accent">
            <UserCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">Invite your friend with code: <span className="font-mono text-lg ml-2">{workspace.joinCode}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
