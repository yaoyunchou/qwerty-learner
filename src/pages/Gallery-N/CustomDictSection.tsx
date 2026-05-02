import CustomDictCard from './CustomDictCard'
import ImportDictModal from './ImportDictModal'
import { customDictionariesAtom } from '@/store'
import { useAtomValue } from 'jotai'

export default function CustomDictSection() {
  const customDicts = useAtomValue(customDictionariesAtom)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">我的词库</h2>
        <ImportDictModal />
      </div>

      {customDicts.length > 0 ? (
        <div className="grid gap-x-5 gap-y-5 px-1 pb-4 sm:grid-cols-1 md:grid-cols-2 dic3:grid-cols-3 dic4:grid-cols-4">
          {customDicts.map((dict) => (
            <CustomDictCard key={dict.id} dictionary={dict} />
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          还没有自定义词库，点击上方按钮导入
        </div>
      )}
    </div>
  )
}
