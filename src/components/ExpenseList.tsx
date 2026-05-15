import { useEffect, useState, useContext } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../App.tsx';
import { AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, History } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import ExpenseForm from './ExpenseForm.tsx';
import ActivityLog from './ActivityLog.tsx';

export default function ExpenseList() {
  const { workspace, user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'history'>('expenses');

  useEffect(() => {
    if (!workspace?.id) return;
    const q = query(
      collection(db, 'workspaces', workspace.id, 'expenses'),
      orderBy('expenseDate', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `workspaces/${workspace.id}/expenses`));
    return () => unsubscribe();
  }, [workspace?.id]);

  const handleDelete = async (expense: any) => {
    if (!workspace?.id) return;
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'workspaces', workspace.id, 'expenses', expense.id));
        await addDoc(collection(db, 'workspaces', workspace.id, 'activityLog'), {
          action: 'deleted',
          actorId: user?.id,
          actorName: user?.name || 'Someone',
          expenseDescription: expense.description || 'expense',
          amount: expense.amount,
          paidByName: workspace.membersList[expense.paidBy] || 'Unknown',
          createdAt: serverTimestamp()
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `workspaces/${workspace.id}/expenses/${expense.id}`);
      }
    }
  };

  if (!workspace || loading) {
    return <div className="bg-dark-card rounded-2xl border border-white/5 p-12 text-center text-gray-500 animate-pulse font-medium">Loading activity...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
            <button onClick={() => setActiveTab('expenses')} className={`transition-colors ${activeTab === 'expenses' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              Expenses
            </button>
            <span className="text-gray-700">|</span>
            <button onClick={() => setActiveTab('history')} className={`transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <History className="w-4 h-4" /> History
            </button>
          </h2>
          {activeTab === 'expenses' && (
            <span className="text-[10px] font-bold text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{expenses.length} Total</span>
          )}
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="px-4 py-2 bg-emerald-accent text-black rounded-xl font-bold text-sm hover:bg-emerald-accent/90 transition-all flex items-center gap-2 shadow-lg shadow-emerald-accent/10"
        >
          <Plus className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">New Expense</span>
        </button>
      </div>

      {activeTab === 'history' ? (
        <ActivityLog />
      ) : (
        <div className="bg-dark-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          {expenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                <History className="w-8 h-8 text-gray-600 opacity-40" />
              </div>
              <h3 className="text-lg font-bold text-gray-200 mb-2">No expenses yet</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto italic font-serif">Click "New Expense" to log your first expense.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-dark-inner/50 border-b border-white/10 text-gray-500 font-serif italic text-xs">
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Payer</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-400">{new Date(expense.expenseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                          expense.category === 'Food' && "bg-orange-500/10 text-orange-400",
                          expense.category === 'Transport' && "bg-purple-500/10 text-purple-400",
                          expense.category === 'Rent' && "bg-blue-500/10 text-blue-400",
                          expense.category === 'Utilities' && "bg-indigo-500/10 text-indigo-400",
                          !['Food', 'Transport', 'Rent', 'Utilities'].includes(expense.category) && "bg-gray-500/10 text-gray-400"
                        )}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-200">{expense.description || '—'}</span>
                          <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider mt-0.5">via {expense.creatorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-accent/20 flex items-center justify-center text-[10px] font-bold text-indigo-accent border border-indigo-accent/30 uppercase">
                            {workspace.membersList[expense.paidBy]?.[0] || '?'}
                          </div>
                          <span className={cn("text-xs font-semibold", expense.paidBy === workspace.members[0] ? "text-indigo-accent" : "text-emerald-accent")}>
                            {workspace.membersList[expense.paidBy] || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-light font-mono text-white">{expense.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingExpense(expense); setShowForm(true); }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(expense)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ExpenseForm
            expense={editingExpense}
            onClose={() => { setShowForm(false); setEditingExpense(null); }}
            onSuccess={() => { setShowForm(false); setEditingExpense(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
