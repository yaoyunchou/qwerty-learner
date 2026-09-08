import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as z from 'zod'
import { AuthError, createUserWithKey, getSaveKeyWarning, validateApiKey } from './auth'
import { listDictionaries } from './dictionaries'
import { bindRecoveryEmail } from './auth'
import {
  createStudyPlan,
  getDailyPlan,
  getPlanProgress,
  suggestTodayWords,
} from './plan-engine'
import { getMemoryOverview } from './memory-engine'
import {
  getDailySnapshot,
  getStreakInfo,
  getWeeklySnapshot,
} from './snapshot-builder'
import {
  analyzeWeakness,
  getStudySummary,
  getWordDetail,
} from './stats-queries'

type AuthContext = { userId: string } | null

function createServer(auth: AuthContext) {
  const server = new McpServer({ name: 'qwerty-learner', version: '1.0.0' })

  server.registerTool(
    'create_user',
    {
      description: 'Create a new Qwerty Learner user and return a one-time API key',
      inputSchema: {},
    },
    async () => {
      const result = await createUserWithKey()
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { apiKey: result.apiKey, userId: result.userId, warning: result.warning },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.registerTool(
    'list_dictionaries',
    {
      description: 'List available word dictionaries',
      inputSchema: {
        language: z.string().optional().describe('Filter by language code, e.g. en, ja'),
      },
    },
    async ({ language }) => {
      requireAuth(auth)
      const dicts = listDictionaries(language)
      return { content: [{ type: 'text', text: JSON.stringify(dicts, null, 2) }] }
    },
  )

  server.registerTool(
    'create_study_plan',
    {
      description: 'Create a study plan splitting dictionary words across days',
      inputSchema: {
        dictId: z.string(),
        totalDays: z.number().int().min(1),
        wordsPerDay: z.number().int().min(1),
        title: z.string().optional(),
        startDate: z.string().optional(),
        reviewRatio: z.number().min(0).max(1).optional(),
        algorithm: z.enum(['sm2', 'ebbinghaus']).optional(),
        focusWords: z.array(z.string()).optional(),
      },
    },
    async (input) => {
      const { userId } = requireAuth(auth)
      const result = await createStudyPlan({ userId, ...input })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'get_daily_plan',
    {
      description: 'Get words for a specific day of a study plan with practice URL',
      inputSchema: {
        planId: z.string(),
        date: z.string().optional(),
      },
    },
    async ({ planId, date }) => {
      const { userId } = requireAuth(auth)
      const result = await getDailyPlan(planId, userId, date)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'suggest_today_words',
    {
      description: 'Suggest today words combining SRS review and new words',
      inputSchema: {
        planId: z.string().optional(),
        wordsPerDay: z.number().int().optional(),
      },
    },
    async (input) => {
      const { userId } = requireAuth(auth)
      const result = await suggestTodayWords(userId, input.planId, input.wordsPerDay)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'get_daily_report',
    {
      description: 'Get full daily learning report',
      inputSchema: { date: z.string().optional() },
    },
    async ({ date }) => {
      const { userId } = requireAuth(auth)
      const report = await getDailySnapshot(userId, date)
      return { content: [{ type: 'text', text: JSON.stringify(report ?? { empty: true }, null, 2) }] }
    },
  )

  server.registerTool(
    'get_weekly_report',
    {
      description: 'Get weekly learning report',
      inputSchema: { weekStart: z.string().optional() },
    },
    async ({ weekStart }) => {
      const { userId } = requireAuth(auth)
      const report = await getWeeklySnapshot(userId, weekStart)
      return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] }
    },
  )

  server.registerTool(
    'get_memory_overview',
    {
      description: 'Get memory status counts and due review count',
      inputSchema: {},
    },
    async () => {
      const { userId } = requireAuth(auth)
      const overview = await getMemoryOverview(userId)
      return { content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }] }
    },
  )

  server.registerTool(
    'get_word_detail',
    {
      description: 'Get practice history and memory state for a word',
      inputSchema: {
        word: z.string(),
        dictId: z.string().optional(),
      },
    },
    async ({ word, dictId }) => {
      const { userId } = requireAuth(auth)
      const detail = await getWordDetail(userId, word, dictId)
      return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] }
    },
  )

  server.registerTool(
    'get_weakness_analysis',
    {
      description: 'Analyze weak words, keys, and letter pairs',
      inputSchema: { days: z.number().int().optional() },
    },
    async ({ days }) => {
      const { userId } = requireAuth(auth)
      const analysis = await analyzeWeakness(userId, days ?? 7)
      return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] }
    },
  )

  server.registerTool(
    'get_streak_info',
    {
      description: 'Get practice streak information',
      inputSchema: {},
    },
    async () => {
      const { userId } = requireAuth(auth)
      const streak = await getStreakInfo(userId)
      return { content: [{ type: 'text', text: JSON.stringify(streak, null, 2) }] }
    },
  )

  server.registerTool(
    'get_plan_progress',
    {
      description: 'Get study plan completion progress',
      inputSchema: { planId: z.string() },
    },
    async ({ planId }) => {
      const { userId } = requireAuth(auth)
      const progress = await getPlanProgress(planId, userId)
      return { content: [{ type: 'text', text: JSON.stringify(progress, null, 2) }] }
    },
  )

  server.registerTool(
    'bind_recovery_email',
    {
      description: 'Bind recovery email for API key recovery',
      inputSchema: { email: z.string().email() },
    },
    async ({ email }) => {
      const { userId } = requireAuth(auth)
      await bindRecoveryEmail(userId, email)
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true }, null, 2) }] }
    },
  )

  return server
}

function requireAuth(auth: AuthContext): { userId: string } {
  if (!auth) throw new Error('Authorization required. Use Bearer ql_xxx API key.')
  return auth
}

export async function handleMcpRequest(req: VercelRequest, res: VercelResponse) {
  let auth: AuthContext = null
  try {
    if (req.headers.authorization) {
      auth = await validateApiKey(req)
    }
  } catch {
    auth = null
  }

  const server = createServer(auth)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)

  res.on('close', () => {
    transport.close()
    server.close()
  })
}

export { getSaveKeyWarning }
