import { supabase } from '@/lib/supabase'
import { syncLocalToCloudIfNeeded } from '@/utils/db/cloud-sync'
import type { Session } from '@supabase/supabase-js'
import { atom } from 'jotai'

export const sessionAtom = atom<Session | null>(null)

export const isLoggedInAtom = atom((get) => get(sessionAtom) !== null)
export const currentUserAtom = atom((get) => get(sessionAtom)?.user ?? null)

let _listenerAttached = false

export function attachAuthListener(setSession: (s: Session | null) => void) {
  if (_listenerAttached) return
  _listenerAttached = true

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
