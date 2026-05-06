import { supabase } from '@/lib/supabase'
import { attachAuthListener, currentUserAtom, isLoggedInAtom, sessionAtom } from '@/store/authAtom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

export function useAuthListener() {
  const setSession = useSetAtom(sessionAtom)
  useEffect(() => {
    attachAuthListener(setSession)
  }, [setSession])
}

export function useAuth() {
  const session = useAtomValue(sessionAtom)
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const user = useAtomValue(currentUserAtom)

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname || '' } },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { session, isLoggedIn, user, signIn, signUp, signOut }
}
