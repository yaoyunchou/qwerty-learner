# Qwerty Learner MCP 安装与 AI 提示词

## 一、MCP 安装配置

### 阶段 A：首次安装（尚无 API Key）

在 Cursor / Claude Desktop 的 MCP 配置中加入（**无需** Authorization）：

```json
{
  "mcpServers": {
    "qwerty-learner": {
      "url": "https://qwerty-learner-3z4e.vercel.app/api/mcp"
    }
  }
}
```

保存后重新连接 MCP，然后让 AI 执行首次绑定（见下方提示词）。

### 阶段 B：绑定 Key 后（正式使用）

AI 调用 `create_user` 后会返回 `mcpConfigSnippet`，将其中 `headers` 写入配置：

```json
{
  "mcpServers": {
    "qwerty-learner": {
      "url": "https://qwerty-learner-3z4e.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ql_你的完整Key"
      }
    }
  }
}
```

保存后**重新连接 MCP**，再调用 `check_setup` 确认 `configured: true`。

---

## 二、复制给 AI 的提示词（推荐）

将下面整段复制到 Cursor / Claude 等对话中，AI 会自动完成安装引导：

```
请帮我接入 Qwerty Learner 背单词 MCP（远程地址：https://qwerty-learner-3z4e.vercel.app/api/mcp）。

【强制流程】在调用任何学习计划相关功能之前，必须完成账号绑定：

1. 先调用 MCP 工具 check_setup，检查我是否已配置有效 API Key
2. 如果返回 needs_create_user：
   - 问我是否有找回邮箱（可选），然后调用 create_user（有邮箱则传入 recoveryEmail）
   - 把返回的 apiKey 完整展示给我，并强调「仅显示一次，必须立即保存」
   - 把 mcpConfigSnippet 完整输出，指导我写入 MCP 配置的 Authorization header 并重新连接
   - 等我确认已保存 Key 且已更新 MCP 配置后，再调用 check_setup 确认 configured: true
3. 只有 configured: true 之后，才能帮我：
   - 列出词库 list_dictionaries
   - 创建学习计划 create_study_plan
   - 获取今日词单 suggest_today_words / get_daily_plan
   - 把 startLearningUrl 发给我在网站练习

如果我没有 Key，禁止跳过第 2 步直接创建计划。

绑定完成后，请问我：想背哪本词库、多少天、每天多少个词，然后帮我创建计划并给我今日练习链接。
```

---

## 三、已有 Key 的老用户提示词

```
我已安装 Qwerty Learner MCP。请先调用 check_setup 检查我的 Key 是否有效。

- 若 configured: false，指导我检查 MCP 配置中的 Authorization: Bearer ql_xxx 是否正确
- 若 configured: true，直接帮我查看今日该背什么，或创建新的学习计划

我的网站练习地址：https://qwerty-learner-3z4e.vercel.app
```

---

## 四、工具调用顺序（给开发者参考）

```
check_setup
  └─ needs_create_user → create_user → 用户保存 Key + 更新 MCP → check_setup
       └─ ready → list_dictionaries → create_study_plan → startLearningUrl
                    └─ bind_recovery_email（可选）
```

| 工具 | 是否需要 Key | 说明 |
|------|-------------|------|
| `check_setup` | 否 | 检查绑定状态，**每次新对话建议先调** |
| `create_user` | 否 | 生成 Key，可选 recoveryEmail |
| `bind_recovery_email` | 是 | 绑定找回邮箱 |
| 其他所有工具 | 是 | 未配置 Key 会返回 SETUP_REQUIRED |

---

## 五、MCP Prompt

也可在支持 MCP Prompt 的客户端调用 `onboarding` prompt，参数 `hasExistingKey: true/false`。
