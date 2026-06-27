import { supabase } from '../utils/firestore';

export const auth = {
  currentUser: null as any
};

// Synchronize changes dynamically
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    auth.currentUser = session?.user ? {
      uid: session.user.id,
      email: session.user.email
    } : null;
  });
}

export async function signInWithEmailAndPassword(authDummy: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return {
    user: {
      uid: data.user?.id,
      email: data.user?.email,
    }
  };
}

export async function createUserWithEmailAndPassword(authDummy: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return {
    user: {
      uid: data.user?.id,
      email: data.user?.email,
    }
  };
}

export async function signOut(authDummy?: any) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return {
    user: {
      uid: 'google-oauth',
      displayName: 'Google User',
      email: 'google@user.com',
      photoURL: ''
    }
  };
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return {
    user: {
      uid: 'apple-oauth',
      displayName: 'Apple User',
      email: 'apple@user.com',
      photoURL: ''
    }
  };
}
