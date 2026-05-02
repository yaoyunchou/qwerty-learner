import { customDictionariesAtom } from '@/store'
import { useCustomDictionaries } from '@/utils/db/custom-dict'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

export default function CustomDictSyncProvider() {
  const customDictionaries = useCustomDictionaries()
  const setCustomDictionaries = useSetAtom(customDictionariesAtom)

  useEffect(() => {
    setCustomDictionaries(customDictionaries)
  }, [customDictionaries, setCustomDictionaries])

  return null
}
