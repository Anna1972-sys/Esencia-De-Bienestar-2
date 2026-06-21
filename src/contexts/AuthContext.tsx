import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!cancelled) {
        setIsAdmin(!!data?.some((r: any) => r.role === "admin"));
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess && !hydratedRef.current) return;

      setSession(sess);

      if (sess?.user) {
        setTimeout(() => loadRole(sess.user.id), 0);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      hydratedRef.current = true;
      setSession(data.session);

      if (data.session?.user) {
        loadRole(data.session.user.id);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);