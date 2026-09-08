import { isSupabaseConfigured, supabase } from '@/lib/supabase'
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
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请在 Vercel 设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请在 Vercel 设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname || '' } },
    })
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请在 Vercel 设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/admin' },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }, [])

  return { session, isLoggedIn, user, signIn, signUp, signInWithGoogle, signOut }
}
