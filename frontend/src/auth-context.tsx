import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';

interface AuthContextType {
  showAuthModal: (onSuccess?: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({ showAuthModal: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pendingCallbackRef = useRef<(() => void) | undefined>(undefined);

  const showAuthModal = useCallback((onSuccess?: () => void) => {
    pendingCallbackRef.current = onSuccess;
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    pendingCallbackRef.current?.();
    pendingCallbackRef.current = undefined;
  }, []);

  return (
    <AuthContext.Provider value={{ showAuthModal }}>
      {children}
      <AuthModal open={open} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
