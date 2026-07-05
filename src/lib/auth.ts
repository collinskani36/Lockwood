import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// NOTE: this is now async (Supabase session checks always are), unlike the
// old localStorage-based version. If anything guards a route by calling this
// synchronously, that call site needs to await it — e.g. in a TanStack
// Router `beforeLoad`.
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;

  if (!data?.is_active) {
    await signOut();
    return false;
  }

  return true;
}

export type UserRole = "admin" | "caretaker";

// Looks up the signed-in user's role from the `profiles` table (column:
// `role`). Returns null if there's no session or no matching profile row.
export async function getUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  return (data?.role as UserRole) ?? null;
}

export type Profile = {
  id: string;
  fullName: string;
  role: UserRole;
};

// Full profile for the signed-in user — used for things like greeting them
// by name. Returns null if there's no session or no matching profile row.
export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  return data
    ? { id: data.id, fullName: data.full_name, role: data.role as UserRole }
    : null;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    throw new Error("This account has been deactivated. Contact an admin.");
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Handy for reactive UI (e.g. header showing "Admin" vs "Login") without
// having to poll isAuthenticated(). Returns an unsubscribe function.
export function onAuthStateChange(
  callback: (isAuthed: boolean) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session !== null);
  });
  return () => data.subscription.unsubscribe();
}