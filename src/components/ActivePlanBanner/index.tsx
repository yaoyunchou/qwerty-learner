import { getActivePlan, getPracticePlanPath } from '@/lib/apiClient'
import { isLoggedInAtom } from '@/store/authAtom'
import { useAtomValue } from 'jotai'
import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ActivePlanBanner() {
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const activePlan = getActivePlan()

  if (!isLoggedIn || !activePlan) return null

  return (
    <Link
      to={getPracticePlanPath(activePlan.planId, activePlan.date)}
      className="fixed bottom-20 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-indigo-700"
    >
      <BookOpen className="h-4 w-4" />
      继续今日学习计划
    </Link>
  )
}
