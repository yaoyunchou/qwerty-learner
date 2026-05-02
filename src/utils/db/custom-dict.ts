import { db } from '.'
import type { ICustomDict } from './record'
import type { Dictionary, LanguageCategoryType, LanguageType, Word } from '@/typings'
import { calcChapterCount } from '@/utils'
import { useLiveQuery } from 'dexie-react-hooks'

const CUSTOM_DICT_PREFIX = 'custom_'

export function generateCustomDictId(): string {
  return `${CUSTOM_DICT_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function isCustomDictId(dictId: string): boolean {
  return dictId.startsWith(CUSTOM_DICT_PREFIX)
}

export function customDictUrl(dictId: string): string {
  return `custom://${dictId}`
}

export function isCustomDictUrl(url: string): boolean {
  return url.startsWith('custom://')
}

export function extractDictIdFromUrl(url: string): string {
  return url.replace('custom://', '')
}

export function validateWordList(data: unknown): data is Word[] {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return false
  return data.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      item.name.length > 0 &&
      Array.isArray(item.trans) &&
      item.trans.length > 0 &&
      item.trans.every((t: unknown) => typeof t === 'string'),
  )
}

export function normalizeWords(rawWords: Word[]): Word[] {
  return rawWords.map((w) => ({
    name: w.name,
    trans: w.trans,
    usphone: w.usphone ?? '',
    ukphone: w.ukphone ?? '',
    ...(w.notation ? { notation: w.notation } : {}),
  }))
}

export async function saveCustomDict(
  name: string,
  words: Word[],
  language: LanguageType = 'en',
  languageCategory: LanguageCategoryType = 'en',
): Promise<ICustomDict> {
  const dictId = generateCustomDictId()
  const normalized = normalizeWords(words)
  const record: ICustomDict = {
    dictId,
    name,
    language,
    languageCategory,
    words: normalized,
    createdAt: Date.now(),
  }
  await db.customDicts.add(record)
  return record
}

export async function deleteCustomDict(dictId: string): Promise<void> {
  await db.customDicts.where('dictId').equals(dictId).delete()
}

export async function getAllCustomDicts(): Promise<ICustomDict[]> {
  return db.customDicts.orderBy('createdAt').reverse().toArray()
}

export async function getCustomDictWords(dictId: string): Promise<Word[]> {
  const record = await db.customDicts.where('dictId').equals(dictId).first()
  return record?.words ?? []
}

export function customDictToDictionary(record: ICustomDict): Dictionary {
  return {
    id: record.dictId,
    name: record.name,
    description: `自定义词库 · ${record.words.length} 词`,
    category: '我的词库',
    tags: ['自定义'],
    url: customDictUrl(record.dictId),
    length: record.words.length,
    language: record.language,
    languageCategory: record.languageCategory,
    chapterCount: calcChapterCount(record.words.length),
  }
}

export function useCustomDicts(): ICustomDict[] {
  return useLiveQuery(() => getAllCustomDicts(), [], [])
}

export function useCustomDictionaries(): Dictionary[] {
  const customDicts = useCustomDicts()
  return customDicts.map(customDictToDictionary)
}
