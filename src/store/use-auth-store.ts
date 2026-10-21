import { create } from "zustand";
import { AppUser, setPermissionContextProvider } from "@/types";
import { useUIStore } from "@/store/use-ui-store";

type Status = "loading" | "authed" | "anon";

interface AuthState {
  status: Status;
  user: AppUser | null;
  load: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const HEADERS = { "content-type": "application/json", "x-moveit-rpc": "1" };

function apply(user: AppUser | null) {
  // keep the older role-based helpers in step with the signed-in user
  if (user) useUIStore.setState({ currentRole: user.role });
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  load: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return set({ status: "anon", user: null });
      const body = (await res.json()) as { user: AppUser };
      apply(body.user);
      set({ status: "authed", user: body.user });
    } catch {
      set({ status: "anon", user: null });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: HEADERS, credentials: "same-origin", body: JSON.stringify({ email, password }) });
      const body = (await res.json()) as { ok: boolean; user?: AppUser; error?: string };
      if (!res.ok || !body.user) return body.error ?? "Sign-in failed.";
      apply(body.user);
      set({ status: "authed", user: body.user });
      return null;
    } catch {
      return "Could not reach the server.";
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: HEADERS, credentials: "same-origin" });
    } finally {
      set({ status: "anon", user: null });
    }
  },
}));

// In the browser, permission checks use the signed-in user's own permission set.
// (Never on the server: that process has its own provider for the authenticated request.)
if (typeof window !== "undefined") {
  setPermissionContextProvider(() => {
    const u = useAuthStore.getState().user;
    return u ? { role: u.role, permissions: u.permissions } : undefined;
  });
}
