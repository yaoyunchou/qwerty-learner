import { supabase } from '@/lib/supabase'
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
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
  })
}
