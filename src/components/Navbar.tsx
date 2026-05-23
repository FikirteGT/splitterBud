import { useContext } from 'react';
import { AuthContext } from '../App.tsx';
import { auth, db } from '../lib/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { LogOut, Bell, LayoutDashboard, History, Users, ArrowLeftRight, Trash2 } from 'lucide-react';

export default function Navbar({ onToggleNotifications, unreadCount }: { onToggleNotifications: () => void; unreadCount: number }) {
  const { user, workspace, setActiveWorkspaceId, activePage, setActivePage } = useContext(AuthContext);

  const handleLogout = () => signOut(auth);
  const handleSwitchWorkspace = () => setActiveWorkspaceId(null);
  const handleDeleteAccount = async () => {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.id));
      await deleteUser(auth.currentUser!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <nav className="w-64 border-r border-white/10 bg-dark-card flex flex-col h-full shrink-0 hidden md:flex">
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded bg-emerald-accent flex items-center justify-center text-black font-extrabold italic shadow-lg shadow-emerald-accent/20">
            E
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Equali</span>
        </div>
        
        <ul className="space-y-2">
          <li onClick={() => setActivePage('dashboard')} className={`flex items-center gap-3 font-semibold p-2.5 rounded-xl border cursor-pointer transition-all ${
            activePage === 'dashboard'
              ? 'text-emerald-accent bg-emerald-accent/10 border-emerald-accent/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
          }`}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </li>
          <li onClick={() => setActivePage('history')} className={`flex items-center gap-3 font-semibold p-2.5 rounded-xl border cursor-pointer transition-all ${
            activePage === 'history'
              ? 'text-emerald-accent bg-emerald-accent/10 border-emerald-accent/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
          }`}>
            <History className="w-5 h-5" />
            History
          </li>
          <li className="flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all p-2.5 rounded-xl cursor-not-allowed opacity-50 border border-transparent">
            <Users className="w-5 h-5" />
            Partners
          </li>
        </ul>

        <button 
          onClick={onToggleNotifications}
          className="mt-8 w-full flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all p-2.5 rounded-xl relative"
        >
          <Bell className="w-5 h-5" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="p-6 border-t border-white/10 bg-dark-bg/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-accent flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-accent/20 text-white">
            {user.name?.[0] || user.email?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user.name || user.email}</p>
            <p className="text-[10px] text-gray-500 italic uppercase tracking-wider truncate">{workspace?.name || 'Workspace'}</p>
          </div>
        </div>
        <button 
          onClick={handleSwitchWorkspace}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400 hover:text-amber-400 hover:bg-amber-400/5 rounded-lg border border-transparent hover:border-amber-400/20 transition-all mb-2"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Switch Workspace
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg border border-transparent hover:border-red-400/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
        <button 
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/20 transition-all mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Account
        </button>
      </div>
    </nav>
  );
}
