import { ExternalLink, Github, Heart } from 'lucide-react'

export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">关于</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Qwerty Learner 管理后台</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Q</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Qwerty Learner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">为键盘工作者设计的单词记忆与英语肌肉记忆锻炼软件</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            本管理后台提供词典数据的查看和管理功能。你可以在这里浏览所有内置词典、查看单词详情和系统统计数据。
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">相关链接</h3>
          <div className="space-y-2">
            <a
              href="https://github.com/RealKai42/qwerty-learner"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
            >
              <Github className="h-5 w-5" />
              GitHub 仓库
              <ExternalLink className="ml-auto h-4 w-4 text-gray-400" />
            </a>
            <a
              href="https://qwerty.kaiyi.cool/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
            >
              <ExternalLink className="h-5 w-5" />
              在线访问
              <ExternalLink className="ml-auto h-4 w-4 text-gray-400" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-sm text-gray-400 dark:text-gray-500">
          Made with <Heart className="h-4 w-4 text-red-400" /> by Qwerty Learner Team
        </div>
      </div>
    </div>
  )
}
