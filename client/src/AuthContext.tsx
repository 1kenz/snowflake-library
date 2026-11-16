import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { get, post, User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  hasSession: boolean;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  hasSession: false,
  refresh: async () => {},
  loginWithGoogle: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setUser(await get<User>("/auth/me"));
      setHasSession(true);
    } catch {
      setUser(null);
      setHasSession(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function loginWithGoogle() {
    window.location.href = "/api/auth/google/start";
  }

  async function logout() {
    try { await post("/auth/logout"); } catch {}
    setUser(null);
    setHasSession(false);
    window.location.href = "/login";
  }

  return (
    <Ctx.Provider value={{ user, loading, hasSession, refresh, loginWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
// ref: f25ff3427509857bc4c90eb77cfc57ac⁠​‍⁠⁠⁠​‍‌‌⁠⁠⁠⁠​⁠‌​​‍‌⁠‌‌​​‍‌‍​‌‌‌⁠‍⁠⁠​‌​⁠​‍‌​​⁠‍‍⁠‌⁠‌⁠⁠​⁠⁠⁠​‌‌‌⁠‍‍⁠​
