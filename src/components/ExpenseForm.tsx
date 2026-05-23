import React, { useState, useContext } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AuthContext } from '../App.tsx';
import { motion } from 'motion/react';
import { X, Save, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Rent', 'Utilities', 'Other'];

export default function ExpenseForm({ expense, onClose, onSuccess }: any) {
  const { workspace, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    amount: expense?.amount || '',
    category: expense?.category || 'Food',
    description: expense?.description || '',
    expenseDate: expense?.expenseDate || new Date().toISOString().split('T')[0],
    paidBy: expense?.paidBy || auth.currentUser?.uid || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!workspace?.id) throw new Error('Workspace not found');
      
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount.toString()),
      };

      const actorName = user?.name || auth.currentUser?.displayName || 'Someone';
      const paidByName = workspace.membersList[payload.paidBy] || 'Unknown';
      const partnerId = workspace.members.find((id: string) => id !== auth.currentUser?.uid);

      const sendNotification = async (type: string, message: string, meta: any = {}) => {
        if (!partnerId) return;
        await addDoc(collection(db, 'users', partnerId, 'notifications'), {
          type,
          message,
          isRead: false,
          createdAt: serverTimestamp(),
          ...meta
        });
      };

      if (expense) {
        const expRef = doc(db, 'workspaces', workspace.id, 'expenses', expense.id);
        await updateDoc(expRef, { ...payload, updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'workspaces', workspace.id, 'activityLog'), {
          action: 'edited', actorId: auth.currentUser?.uid, actorName,
          expenseDescription: payload.description || 'expense',
          amount: payload.amount, paidByName, createdAt: serverTimestamp()
        });
        // Only send approval request if editing someone else's expense
        const isOthersExpense = expense.creatorId !== auth.currentUser?.uid;
        if (isOthersExpense) {
          await sendNotification('EDIT_EXPENSE',
            `${actorName} edited your "${payload.description || 'expense'}" from $${expense.amount.toFixed(2)} to $${payload.amount.toFixed(2)} — paid by ${paidByName}`,
            { expenseId: expense.id, oldAmount: expense.amount, newAmount: payload.amount, requiresApproval: true }
          );
        }
      } else {
        const expColl = collection(db, 'workspaces', workspace.id, 'expenses');
        const newExp = await addDoc(expColl, {
          ...payload,
          creatorId: auth.currentUser?.uid,
          creatorName: auth.currentUser?.displayName || 'Friend',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await addDoc(collection(db, 'workspaces', workspace.id, 'activityLog'), {
          action: 'added', actorId: auth.currentUser?.uid, actorName,
          expenseDescription: payload.description || 'expense',
          amount: payload.amount, paidByName, createdAt: serverTimestamp()
        });
        await sendNotification('ADD_EXPENSE',
          `${actorName} added "${payload.description || 'expense'}" — $${payload.amount.toFixed(2)} paid by ${paidByName}`,
          { expenseId: newExp.id, amount: payload.amount, requiresApproval: false }
        );
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspace?.id}/expenses`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="bg-dark-card border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-dark-inner/50">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {expense ? 'Edit Expense' : 'Log Expense'}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 italic font-serif opacity-70">
              {workspace.name} Shared Ledger
            </p>
          </div>
          <button onClick={onClose} className="p-3 text-gray-400 hover:text-white rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-sm">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-dark-inner border border-white/5 rounded-xl text-white placeholder:text-gray-800 focus:ring-2 focus:ring-emerald-accent/50 focus:border-emerald-accent outline-none text-xl font-light font-mono transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Date</label>
              <input
                required
                type="date"
                className="w-full px-5 py-3 bg-dark-inner border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-emerald-accent/50 focus:border-emerald-accent outline-none font-mono text-xs transition-all"
                value={formData.expenseDate}
                onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    formData.category === cat 
                      ? 'bg-emerald-accent text-black border-emerald-accent shadow-lg shadow-emerald-accent/20' 
                      : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Description</label>
            <textarea
              placeholder="What did you buy?"
              rows={2}
              className="w-full px-5 py-3 bg-dark-inner border border-white/5 rounded-xl text-white placeholder:text-gray-800 focus:ring-2 focus:ring-emerald-accent/50 focus:border-emerald-accent outline-none resize-none text-sm transition-all"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Who Paid?</label>
            <div className="flex gap-4">
              {workspace.members.map((userId: string) => (
                <button
                  key={userId}
                  type="button"
                  onClick={() => setFormData({ ...formData, paidBy: userId })}
                  className={`flex-1 p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 ${
                    formData.paidBy === userId 
                    ? 'border-indigo-accent bg-indigo-accent/10' 
                    : 'border-white/5 bg-white/5 hover:bg-white/10 opacity-60'
                  }`}
                >
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase transition-colors ${
                    formData.paidBy === userId ? 'bg-indigo-accent text-white' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {workspace.membersList[userId]?.[0] || '?'}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${formData.paidBy === userId ? 'text-white' : 'text-gray-500'}`}>{workspace.membersList[userId]?.split(' ')[0] || 'Unknown'}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-400/5 text-red-400 rounded-xl text-[10px] font-bold border border-red-400/10 uppercase tracking-widest">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 text-gray-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-transparent hover:border-white/5"
            >
              Discard
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 py-4 bg-emerald-accent text-black rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-accent/90 transition-all shadow-xl shadow-emerald-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : <><Save className="w-4 h-4" /> {expense ? 'Update Entry' : 'Log Entry'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
