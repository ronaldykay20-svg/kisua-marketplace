import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  userDisplayName: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  userDisplayName: "",
});

export const useAuth = () => useContext(AuthContext);

const blockIfSuspendedOrDeleted = async (session: Session | null) => {
  if (!session?.user) return true;
  const { data } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", session.user.id)
    .maybeSingle();
  if (data?.account_status === "suspended" || data?.account_status === "deleted") {
    await supabase.auth.signOut();
    toast.error(
      data.account_status === "suspended"
        ? "A tua conta foi suspensa por um administrador."
        : "Esta conta foi eliminada."
    );
    return false;
  }
  return true;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      blockIfSuspendedOrDeleted(session).then((ok) => {
        setSession(ok ? session : null);
        setUser(ok ? (session?.user ?? null) : null);
        setLoading(false);
      });
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      blockIfSuspendedOrDeleted(session).then((ok) => {
        setSession(ok ? session : null);
        setUser(ok ? (session?.user ?? null) : null);
        setLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, userDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};
