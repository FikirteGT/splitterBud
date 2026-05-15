import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import Auth from './components/Auth.tsx';
import WorkspaceSetup from './components/WorkspaceSetup.tsx';
import Dashboard from './components/Dashboard.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Navbar from './components/Navbar.tsx';
import Notifications from './components/Notifications.tsx';
import { motion, AnimatePresence } from 'motion/react';

export const AuthContext = createContext<any>(null);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setUser({ id: firebaseUser.uid, email: firebaseUser.email, ...userSnap.data() });
          } else {
            // Profile entry doesn't exist yet, wait for Auth.tsx to create it
            // but set basic state so loading finishes
            setUser({ id: firebaseUser.uid, email: firebaseUser.email });
          }
          setLoading(false);
        }, async (err: any) => {
          if (err.code === 'permission-denied') {
            console.warn("Permission denied for user profile. Potential project mismatch. Signing out...");
            await auth.signOut();
          } else {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setWorkspace(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user?.workspaceId) {
      setWorkspace(null);
      return;
    }

    const wsRef = doc(db, 'workspaces', user.workspaceId);
    const unsubscribeWS = onSnapshot(wsRef, (wsSnap) => {
      if (wsSnap.exists()) {
        setWorkspace({ id: wsSnap.id, ...wsSnap.data() });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `workspaces/${user.workspaceId}`));

    return () => unsubscribeWS();
  }, [user?.workspaceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ setUser }}>
        <Auth />
      </AuthContext.Provider>
    );
  }

  if (!user.workspaceId) {
    return (
      <AuthContext.Provider value={{ user, setUser, setWorkspace }}>
        <WorkspaceSetup />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, workspace, setWorkspace }}>
      <div className="flex h-screen bg-dark-bg font-sans overflow-hidden">
        <Navbar onToggleNotifications={() => setShowNotifications(prev => !prev)} />
        
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
            <Dashboard />
            <ExpenseList />
          </div>
        </main>

        <AnimatePresence>
          {showNotifications && (
            <Notifications onClose={() => setShowNotifications(false)} />
          )}
        </AnimatePresence>
      </div>
    </AuthContext.Provider>
  );
}
