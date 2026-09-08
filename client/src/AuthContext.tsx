import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { get, User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  hasSession: boolean;
  refresh: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  hasSession: false,
  refresh: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setHasSession(false);
      setUser(null);
      setLoading(false);
      return;
    }
    setHasSession(true);
    try {
      setUser(await get<User>("/auth/me"));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
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
