import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as z from 'zod'
import { bindRecoveryEmail, createUserWithKey, extractBearer, validateApiKey } from './auth'
import { listDictionaries } from './dictionaries'
import { getSiteOrigin } from './http'
import {
  MCP_SERVER_INSTRUCTIONS,
  authRequiredPayload,
  buildCreateUserResponse,
  getSetupStatus,
} from './mcp-onboarding'
import { getMemoryOverview } from './memory-engine'
import {
  createStudyPlan,
  getDailyPlan,
  getPlanProgress,
  suggestTodayWords,
} from './plan-engine'
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

type AuthContext = { userId: string; keyPrefix: string; plainKey?: string } | null

function createServer(auth: AuthContext) {
  const server = new McpServer(
    { name: 'qwerty-learner', version: '1.1.0' },
    { instructions: MCP_SERVER_INSTRUCTIONS },
  )

  server.registerTool(
    'check_setup',
    {
      description:
        '【第一步必调】检查 MCP 是否已配置有效 API Key。未配置时返回 needs_create_user，必须先完成 create_user 才能使用其他工具。',
      inputSchema: {},
    },
    async () => {
      const status = await getSetupStatus(auth)
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
    },
  )

  server.registerTool(
    'create_user',
    {
      description:
        '【首次必调】创建 Qwerty Learner 账号并生成 API Key（无需鉴权）。Key 仅返回一次，必须让用户保存并写入 MCP Authorization header。可选绑定找回邮箱。',
      inputSchema: {
        recoveryEmail: z
          .string()
          .email()
          .optional()
          .describe('可选：用户找回邮箱，创建时一并绑定'),
      },
    },
    async ({ recoveryEmail }) => {
      const result = await createUserWithKey()
      if (recoveryEmail) {
        await bindRecoveryEmail(result.userId, recoveryEmail.trim().toLowerCase())
      }
      const payload = buildCreateUserResponse(result, recoveryEmail)
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] }
    },
  )

  server.registerTool(
    'list_dictionaries',
    {
      description: '列出可用词库（需要先完成 check_setup 且 configured: true）',
      inputSchema: {
        language: z.string().optional().describe('按语言筛选，如 en、ja'),
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
      description: '创建学习计划（需要先完成账号绑定）',
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
      const { userId, plainKey } = requireAuth(auth)
      const result = await createStudyPlan({ userId, ...input }, plainKey)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...result,
                userAction: '请让用户点击 startLearningUrl 在网站开始练习',
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.registerTool(
    'get_daily_plan',
    {
      description: '获取指定日期的学习计划词单与练习链接',
      inputSchema: {
        planId: z.string(),
        date: z.string().optional(),
      },
    },
    async ({ planId, date }) => {
      const { userId, plainKey } = requireAuth(auth)
      const result = await getDailyPlan(planId, userId, date, plainKey)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'suggest_today_words',
    {
      description: '智能推荐今日词单（SRS 复习 + 新词）',
      inputSchema: {
        planId: z.string().optional(),
        wordsPerDay: z.number().int().optional(),
      },
    },
    async (input) => {
      const { userId, plainKey } = requireAuth(auth)
      const result = await suggestTodayWords(userId, input.planId, input.wordsPerDay, plainKey)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.registerTool(
    'get_daily_report',
    {
      description: '获取指定日期的学习日报',
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
      description: '获取周学习报告',
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
      description: '获取单词记忆状态全景',
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
      description: '获取单个单词的练习历史与记忆曲线',
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
      description: '分析薄弱单词、按键和字母对',
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
      description: '获取连续打卡信息',
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
      description: '获取学习计划完成进度',
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
      description: '绑定找回邮箱（账号创建后推荐操作，需已配置 API Key）',
      inputSchema: { email: z.string().email() },
    },
    async ({ email }) => {
      const { userId } = requireAuth(auth)
      await bindRecoveryEmail(userId, email.trim().toLowerCase())
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                email,
                message: '找回邮箱已绑定。请提醒用户仍需自行保存 API Key，邮箱仅用于找回参考。',
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.registerPrompt(
    'onboarding',
    {
      description: 'Qwerty Learner MCP 首次安装与账号绑定引导（无 Key 时必须先执行）',
      argsSchema: {
        hasExistingKey: z
          .boolean()
          .optional()
          .describe('用户是否已有保存的 ql_ 开头 API Key'),
      },
    },
    async ({ hasExistingKey }) => {
      const site = getSiteOrigin()
      const text = hasExistingKey
        ? `用户已有 API Key。请指导其将 Key 写入 MCP 配置：
headers.Authorization = "Bearer ql_xxx"
然后调用 check_setup 确认 configured: true。
网站：${site}/login`
        : `用户首次安装 Qwerty Learner MCP。请严格按顺序执行：
1. 调用 check_setup
2. 若 needs_create_user，调用 create_user（可询问邮箱一并绑定）
3. 向用户展示 apiKey，强调必须保存，并给出 mcpConfigSnippet
4. 等待用户更新 MCP 配置并重新连接
5. 再次 check_setup 确认 ready 后，再帮用户创建学习计划
网站：${site}`

      return {
        messages: [{ role: 'user', content: { type: 'text', text } }],
      }
    },
  )

  return server
}

function requireAuth(auth: AuthContext): { userId: string; plainKey?: string } {
  if (!auth) {
    throw new Error(JSON.stringify(authRequiredPayload(), null, 2))
  }
  return auth
}

export async function handleMcpRequest(req: VercelRequest, res: VercelResponse) {
  let auth: AuthContext = null
  try {
    const plainKey = extractBearer(req)
    if (plainKey) {
      const validated = await validateApiKey(req)
      auth = { userId: validated.userId, keyPrefix: validated.keyPrefix, plainKey }
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
