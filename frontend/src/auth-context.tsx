import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { checkAuthStatus } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  showAuthModal: (onSuccess?: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  showAuthModal: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pendingCallbackRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    checkAuthStatus().then(setIsAuthenticated);
  }, []);

  const showAuthModal = useCallback((onSuccess?: () => void) => {
    pendingCallbackRef.current = onSuccess;
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setIsAuthenticated(true);
    pendingCallbackRef.current?.();
    pendingCallbackRef.current = undefined;
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, showAuthModal }}>
      {children}
      <AuthModal open={open} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
