import {
  bindRecoveryEmail,
  clearApiKeySession,
  createApiKey,
  getKeyPrefix,
  getStoredApiKey,
  getStoredUserId,
  loginWithApiKey,
  storeApiKeySession,
} from '@/lib/apiClient'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { syncLocalToCloudIfNeeded } from '@/utils/db/cloud-sync'
import type { Session } from '@supabase/supabase-js'
import { atom } from 'jotai'

export interface ApiKeyUser {
  id: string
  keyPrefix: string
}

export const sessionAtom = atom<Session | null>(null)
export const apiKeyUserAtom = atom<ApiKeyUser | null>(null)

export const isLoggedInAtom = atom((get) => get(sessionAtom) !== null || get(apiKeyUserAtom) !== null)
export const currentUserAtom = atom((get) => {
  const session = get(sessionAtom)
  if (session?.user) return session.user
  const keyUser = get(apiKeyUserAtom)
  if (keyUser) return { id: keyUser.id, email: `${keyUser.keyPrefix}…` }
  return null
})

let _listenerAttached = false

export function restoreApiKeySession(setApiKeyUser: (u: ApiKeyUser | null) => void) {
  const userId = getStoredUserId()
  const keyPrefix = getKeyPrefix()
  if (userId && keyPrefix && getStoredApiKey()) {
    setApiKeyUser({ id: userId, keyPrefix })
  }
}

export function attachAuthListener(
  setSession: (s: Session | null) => void,
  setApiKeyUser?: (u: ApiKeyUser | null) => void,
) {
  if (setApiKeyUser) restoreApiKeySession(setApiKeyUser)
  if (_listenerAttached) return
  _listenerAttached = true
  if (!isSupabaseConfigured) return

  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session)
    if (data.session?.user) {
      syncLocalToCloudIfNeeded(data.session.user.id).then((result) => {
        if (result) console.log(`[cloud-sync] migrated ${result.wordCount} words, ${result.chapterCount} chapters`)
      })
    }
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
    if (_event === 'SIGNED_IN' && session?.user) {
      syncLocalToCloudIfNeeded(session.user.id).then((result) => {
        if (result) console.log(`[cloud-sync] migrated ${result.wordCount} words, ${result.chapterCount} chapters`)
      })
    }
  })
}

export async function signInWithApiKey(apiKey: string): Promise<ApiKeyUser> {
  const result = await loginWithApiKey(apiKey)
  storeApiKeySession(apiKey, result.userId, result.keyPrefix)
  return { id: result.userId, keyPrefix: result.keyPrefix }
}

export async function createNewApiKey(): Promise<{ user: ApiKeyUser; apiKey: string; warning: string }> {
  const result = await createApiKey()
  storeApiKeySession(result.apiKey, result.userId, result.apiKey.slice(0, 12))
  return {
    user: { id: result.userId, keyPrefix: result.apiKey.slice(0, 12) },
    apiKey: result.apiKey,
    warning: result.warning,
  }
}

export function signOutApiKey(setApiKeyUser: (u: ApiKeyUser | null) => void) {
  clearApiKeySession()
  setApiKeyUser(null)
}

export { bindRecoveryEmail }
