import { getSiteOrigin } from './http'
import { getServiceSupabase } from './supabase'

export const MCP_SERVER_INSTRUCTIONS = `Qwerty Learner MCP — 背单词学习计划服务

【强制规则】首次使用或 Authorization 未配置/无效时：
1. 必须先调用 check_setup 检查状态
2. 若 needs_create_user，必须调用 create_user 生成 API Key，并让用户保存 Key
3. 引导用户将 Key 写入 MCP 配置的 Authorization: Bearer ql_xxx，并重新连接 MCP
4. 可选：询问用户邮箱，调用 bind_recovery_email 绑定找回邮箱
5. 完成上述步骤后，才能调用 create_study_plan、get_daily_plan 等其他工具

禁止在用户未完成 Key 绑定前调用需要鉴权的工具。`

export const CREATE_USER_STEPS = [
  '将返回的 apiKey 完整复制保存到密码管理器或安全笔记（仅展示一次，丢失后无法找回）',
  '在 MCP 配置中添加 headers.Authorization: "Bearer <apiKey>"，保存后重新连接 MCP 服务器',
  '（推荐）提供邮箱地址，调用 bind_recovery_email 绑定找回邮箱',
  '在浏览器打开 loginUrl 完成网页端登录，或直接使用 startLearningUrl 开始练习',
  '完成配置后调用 check_setup 确认 configured: true，再创建学习计划',
]

export function buildMcpConfigSnippet(apiKey: string, mcpUrl?: string) {
  const url = mcpUrl ?? `${getSiteOrigin()}/api/mcp`
  return {
    mcpServers: {
      'qwerty-learner': {
        url,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    },
  }
}

export function authRequiredPayload() {
  return {
    code: 'SETUP_REQUIRED',
    configured: false,
    message: '尚未配置有效的 API Key。请先调用 create_user 生成 Key，并让用户保存后写入 MCP 配置。',
    requiredFirstSteps: [
      { step: 1, tool: 'check_setup', action: '检查当前配置状态' },
      { step: 2, tool: 'create_user', action: '生成 API Key（无需鉴权）' },
      { step: 3, action: '用户保存 Key，更新 MCP Authorization header 并重新连接' },
      { step: 4, tool: 'check_setup', action: '确认 configured: true' },
    ],
    siteUrl: getSiteOrigin(),
  }
}

export async function getSetupStatus(auth: { userId: string; keyPrefix: string } | null) {
  if (!auth) {
    return {
      configured: false,
      status: 'needs_create_user',
      message: '未检测到有效 API Key。请调用 create_user 完成首次绑定。',
      nextTool: 'create_user',
      siteUrl: getSiteOrigin(),
      onboardingSteps: CREATE_USER_STEPS,
    }
  }

  const db = getServiceSupabase()
  const { data: recovery } = await db
    .from('recovery_emails')
    .select('email, verified_at')
    .eq('user_id', auth.userId)
    .maybeSingle()

  return {
    configured: true,
    status: 'ready',
    userId: auth.userId,
    keyPrefix: auth.keyPrefix,
    hasRecoveryEmail: Boolean(recovery?.email),
    recoveryEmail: recovery?.email ?? null,
    siteUrl: getSiteOrigin(),
    loginUrl: `${getSiteOrigin()}/login`,
    message: recovery?.email
      ? '账号已就绪，可以创建学习计划或查询学习数据。'
      : '账号已就绪。建议询问用户邮箱并调用 bind_recovery_email 绑定找回邮箱。',
    suggestedNextTools: ['list_dictionaries', 'create_study_plan', 'suggest_today_words'],
  }
}

export function buildCreateUserResponse(
  result: { userId: string; apiKey: string; warning: string },
  recoveryEmail?: string | null,
) {
  const loginUrl = `${getSiteOrigin()}/login?key=${encodeURIComponent(result.apiKey)}`
  const mcpConfig = buildMcpConfigSnippet(result.apiKey)

  return {
    success: true,
    apiKey: result.apiKey,
    userId: result.userId,
    warning: result.warning,
    loginUrl,
    siteUrl: getSiteOrigin(),
    recoveryEmailBound: Boolean(recoveryEmail),
    recoveryEmail: recoveryEmail ?? null,
    mcpConfigSnippet: mcpConfig,
    userMustDo: [
      '⚠️ 立即完整保存 apiKey（仅展示一次）',
      '将 mcpConfigSnippet 中的 Authorization 写入 MCP 配置并重新连接',
      recoveryEmail ? '找回邮箱已绑定' : '（推荐）提供邮箱后调用 bind_recovery_email',
      '保存完成后调用 check_setup 确认 configured: true',
    ],
    onboardingSteps: CREATE_USER_STEPS,
    aiNextActions: [
      '向用户展示 apiKey 和 warning，强调必须保存',
      '输出 mcpConfigSnippet 供用户更新 MCP 配置',
      recoveryEmail ? null : '询问用户是否绑定找回邮箱',
      '在用户更新 MCP 配置并重新连接后，调用 check_setup 再继续',
    ].filter(Boolean),
  }
}
