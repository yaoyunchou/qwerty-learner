import {
  bindRecoveryEmail,
  createNewApiKey,
  signInWithApiKey,
  signOutApiKey,
} from '@/store/authAtom'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  apiKeyUserAtom,
  attachAuthListener,
  currentUserAtom,
  isLoggedInAtom,
  sessionAtom,
} from '@/store/authAtom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

export function useAuthListener() {
  const setSession = useSetAtom(sessionAtom)
  const setApiKeyUser = useSetAtom(apiKeyUserAtom)
  useEffect(() => {
    attachAuthListener(setSession, setApiKeyUser)
  }, [setSession, setApiKeyUser])
}

export function useAuth() {
  const session = useAtomValue(sessionAtom)
  const apiKeyUser = useAtomValue(apiKeyUserAtom)
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const user = useAtomValue(currentUserAtom)
  const setApiKeyUser = useSetAtom(apiKeyUserAtom)

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请使用 API Key 登录')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请使用 API Key 登录')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname || '' } },
    })
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('云端登录未配置，请使用 API Key 登录')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/admin' },
    })
    if (error) throw error
  }, [])

  const signInWithKey = useCallback(async (apiKey: string) => {
    const user = await signInWithApiKey(apiKey)
    setApiKeyUser(user)
    return user
  }, [setApiKeyUser])

  const createKey = useCallback(async () => {
    const result = await createNewApiKey()
    setApiKeyUser(result.user)
    return result
  }, [setApiKeyUser])

  const bindEmail = useCallback(async (email: string) => {
    await bindRecoveryEmail(email)
  }, [])

  const signOut = useCallback(async () => {
    signOutApiKey(setApiKeyUser)
    if (isSupabaseConfigured) await supabase.auth.signOut()
  }, [setApiKeyUser])

  return {
    session,
    apiKeyUser,
    isLoggedIn,
    user,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithKey,
    createKey,
    bindEmail,
    signOut,
  }
}
