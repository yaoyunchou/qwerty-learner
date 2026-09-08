import type { Word } from '@/typings'
import { atom } from 'jotai'

export interface PlanPracticeContext {
  planId: string
  dictId: string
  date: string
  words: Word[]
}

export const planPracticeAtom = atom<PlanPracticeContext | null>(null)
