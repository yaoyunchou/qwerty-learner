import { supabase } from '@/lib/supabase'
import { currentDictIdAtom } from '@/store'
import { isLoggedInAtom } from '@/store/authAtom'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { Heart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface FavoriteButtonProps {
  word: Word
}

export default function FavoriteButton({ word }: FavoriteButtonProps) {
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const dictId = useAtomValue(currentDictIdAtom)
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn || !word.name) {
      setIsFav(false)
      return
    }
    let cancelled = false

    supabase
      .from('user_favorites')
      .select('id')
      .eq('word_name', word.name)
      .eq('source_dict', dictId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFav(!!data)
      })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, word.name, dictId])

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (loading) return

      if (!isLoggedIn) {
        navigate('/admin/login')
        return
      }

      setLoading(true)
      try {
        if (isFav) {
          await supabase.from('user_favorites').delete().eq('word_name', word.name).eq('source_dict', dictId)
          setIsFav(false)
        } else {
          await supabase.from('user_favorites').insert({
            word_name: word.name,
            word_trans: word.trans,
            word_usphone: word.usphone,
            word_ukphone: word.ukphone,
            source_dict: dictId,
          })
          setIsFav(true)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    },
    [isLoggedIn, isFav, loading, word, dictId, navigate],
  )

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`ml-2 inline-flex items-center rounded-full p-1.5 transition-colors ${
        isFav ? 'text-pink-500 hover:text-pink-600' : 'text-gray-300 hover:text-pink-400 dark:text-gray-600 dark:hover:text-pink-400'
      } ${loading ? 'opacity-50' : ''}`}
      title={isLoggedIn ? (isFav ? '取消收藏' : '收藏') : '登录后可收藏'}
    >
      <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
    </button>
  )
}
