module.exports = function handler(_req, res) {
  const checks = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    VITE_SUPABASE_ANON_KEY: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    SITE_URL: Boolean(process.env.SITE_URL),
  }

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name)

  const mcpReady = checks.SUPABASE_URL && checks.SUPABASE_SERVICE_ROLE_KEY

  res.status(200).json({
    ok: true,
    service: 'health',
    mcpReady,
    missing,
    hint: mcpReady
      ? 'MCP 后端环境变量已就绪，可连接 /api/mcp 并调用 check_setup'
      : 'MCP 暂不可用：请在 Vercel 配置 missing 中的变量并 Redeploy，详见 docs/MCP_SETUP.md',
  })
}
