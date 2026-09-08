import dicts from './dictionaries.json'
import fs from 'fs'
import path from 'path'

export interface DictMeta {
  id: string
  name: string
  description: string
  url: string
  length: number
  language: string
  category: string
}

export interface WordEntry {
  name: string
  trans: string[]
  usphone?: string
  ukphone?: string
  notation?: string
}

export function listDictionaries(language?: string): DictMeta[] {
  const all = dicts as DictMeta[]
  if (!language) return all
  return all.filter((d) => d.language === language)
}

export function getDictionaryMeta(dictId: string): DictMeta | undefined {
  return (dicts as DictMeta[]).find((d) => d.id === dictId)
}

export function loadDictionaryWords(dictId: string): WordEntry[] {
  const meta = getDictionaryMeta(dictId)
  if (!meta?.url) throw new Error(`Dictionary not found: ${dictId}`)

  const filePath = path.join(process.cwd(), 'public', meta.url.replace(/^\//, ''))
  if (!fs.existsSync(filePath)) throw new Error(`Dictionary file missing: ${meta.url}`)

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<Record<string, unknown>>
  return raw.map((item) => ({
    name: String(item.name ?? ''),
    trans: Array.isArray(item.trans) ? item.trans.map(String) : [String(item.trans ?? '')],
    usphone: String(item.usphone ?? ''),
    ukphone: String(item.ukphone ?? ''),
    notation: item.notation ? String(item.notation) : undefined,
  }))
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
