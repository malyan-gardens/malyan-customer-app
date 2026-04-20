import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  isGuest: boolean;
  setSession: (session: Session) => void;
  setGuest: (val: boolean) => void;
  setState: (state: { session: Session | null; isGuest?: boolean }) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isGuest: false,
  setSession: (session) => set({ session, isGuest: false }),
  setGuest: (val) => set({ isGuest: val }),
  setState: (state) => set(state),
}));
