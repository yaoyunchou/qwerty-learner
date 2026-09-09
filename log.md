# 变更记录

## 2026-09-09

### 移除前台登录按钮

- `Header`：未登录时不再显示「登录」按钮；已登录仍保留「我的」入口
- `Footer`：移除「登录 / 管理后台」链接，仅保留版权与构建版本
- `ResultScreen`、`Analysis`：移除「登录以同步」「去登录」引导条
- `PracticePlan`：无 Key 时提示通过 MCP 学习链接访问，不再跳转 `/login`
- `FavoriteButton`：未登录时隐藏收藏按钮，不再跳转登录页

## 2026-09-08

### Qwerty Learner 远程 MCP 集成

**目标：** 支持 AI 工具通过远程 HTTP MCP 创建学习计划、生成每日词库、读取学习数据；网页端改用 API Key 登录。

**数据库（`supabase/migrations/20260908100000_mcp_users_and_plans.sql`）：**

- 新增 `users`、`api_keys`、`recovery_emails`、`study_plans`、`study_plan_days`
- 新增 SRS 与分析表：`word_memory_states`、`word_practice_events`、`daily_snapshots`、`weekly_snapshots`

**服务端 API（Vercel Serverless）：**

- `api/_lib/auth.ts`：API Key 生成/校验（`ql_` + bcrypt）
- `api/_lib/plan-engine.ts`：学习计划拆分与每日词单
- `api/_lib/memory-engine.ts`：SM-2 / 艾宾浩斯遗忘曲线
- `api/_lib/snapshot-builder.ts`：日/周快照聚合
- `api/_lib/mcp-server.ts` + `api/mcp/index.ts`：Streamable HTTP MCP（13 个 tools）
- `api/auth/*`：create-key、login、bind-email
- `api/plans/*`：计划查询、今日词单、练习回写
- `api/stats/*`：summary、daily 数据分析
- `api/cron/weekly-snapshot.ts`：周报告定时聚合

**前端：**

- `src/pages/KeyLogin.tsx` + `/login`：API Key 登录/注册
- `src/lib/apiClient.ts`：统一 Bearer 鉴权
- `src/pages/PracticePlan/` + `/practice/plan/:id`：计划练习页，打通 Typing 与完成回写
- `src/store/authAtom.ts`：支持 API Key 与 Supabase Auth 双轨登录

**依赖：** `@modelcontextprotocol/sdk`、`bcryptjs`、`zod`

**部署注意：** 需配置 `SUPABASE_SERVICE_ROLE_KEY` 与 `SITE_URL`；执行新 migration；MCP 配置见 `README.md` MCP 章节。周聚合 Cron 需 Vercel Pro，可在 Dashboard 手动配置 `/api/cron/weekly-snapshot`。

### 修复 Vercel Hobby 12 函数上限导致部署失败

- 合并 `api/auth/*` → `api/auth.ts?action=`
- 合并 `api/stats/*` → `api/stats.ts?report=`
- 合并 `api/plans/[id]/*` → `api/plans/[id].ts`（GET today / POST complete）
- 移除 `api/cron/weekly-snapshot.ts`（Hobby 不支持 cron）
- 前端 `apiClient` 同步更新路径

### 修复 Vercel 部署失败（移除 Hobby 不支持的 cron 配置）

- `vercel.json` 移除 `crons` 块（Hobby 计划会导致部署失败）
- 移除 `functions` 通配配置，恢复与旧版一致的 SPA + API 路由

### 修复 Vercel 部署失败（api/\_lib 被当作 Serverless Function）

**根因：** Vercel 会将 `api/` 下所有 `.ts` 文件视为 Serverless Function。`api/_lib/*.ts` 虽为共享模块，但文件名未以 `_` 开头，且没有 `export default`，导致函数打包阶段失败。

**修复：**

- 将 `api/_lib/` 移至项目根目录 `server/`，仅 `api/*.ts` 保留为入口
- 同步更新 `api/auth.ts`、`api/stats.ts`、`api/plans/[id].ts`、`api/mcp/index.ts` 的导入路径
- `vercel.json` 移除 `installCommand`（与上次成功部署配置一致）
- `@vercel/node` 移回 `devDependencies`，避免运行时打包冲突导致 `FUNCTION_INVOCATION_FAILED`
- 新增 `scripts/build-api.cjs`：Vercel 构建时将 `api` 下带 `export default` 的 `.ts` 打成 `.js`（`.ts` 入口在 Hobby 上会崩溃）

### 修复 Vercel 部署失败（api/auth.ts 错误导入路径）

**根因：** 合并 `api/auth/*` 为 `api/auth.ts` 时，保留了子目录里的 `../_lib/*` 导入。文件上移到 `api/` 后应使用 `./_lib/*`，导致 Serverless 函数打包失败、整次部署失败。

**修复：**

- `api/auth.ts`：`../_lib/*` → `./_lib/*`
- 恢复完整 `api/mcp/index.ts`（移除诊断用 stub）
- 删除空的 `api/auth/`、`api/cron/`、`api/stats/` 目录

### MCP 首次绑定与 AI 提示词

- 新增 `check_setup` 工具：检查 API Key 是否已配置，未配置返回 `needs_create_user`
- 强化 `create_user`：返回 `mcpConfigSnippet`、`userMustDo` 引导步骤，支持创建时绑定 `recoveryEmail`
- MCP Server `instructions` + `onboarding` prompt，未鉴权工具调用返回 `SETUP_REQUIRED` 结构化错误
- 文档 [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md)：安装配置 + 可复制 AI 提示词

### 学习计划一键跳转网站

- MCP `create_study_plan` / `get_daily_plan` 返回 `startLearningUrl`，指向生产站点并携带 API Key 实现自动登录
- 练习页 `/practice/plan/:id` 自动关联计划词库；首页显示「继续今日学习计划」入口
- Vercel 配置 `SITE_URL=https://qwerty-learner-3z4e.vercel.app` 确保链接指向正确域名

### 修复 Vercel 白屏（Supabase 环境变量缺失）

**问题：** Vercel 生产环境未配置 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 时，`@supabase/supabase-js` 在 `createClient('', '')` 阶段抛出 `supabaseUrl is required`，导致整站白屏（HTML 200 但 React 未挂载）。

**修复：**

- `src/lib/supabase.ts`：仅在环境变量齐全时初始化 Supabase Client，导出 `isSupabaseConfigured`；缺失时仅 `console.warn`，不阻断前台练习
- `src/store/authAtom.ts`：`attachAuthListener` 在未配置 Supabase 时直接返回，避免启动期访问 `supabase.auth`
- `src/hooks/useAuth.ts`：登录/注册/Google 登录在未配置时给出明确错误提示

**部署注意：** 云端登录、词库同步、收藏等能力仍需在 Vercel 项目 Settings → Environment Variables 中配置上述两个变量（值来自 Supabase Dashboard → Project Settings → API）。

### Supabase 数据库激活（Schema + 配置）

**背景：** 仓库此前仅有 Edge Function，缺少可执行的 migration；Vercel 也未注入 Supabase 环境变量，导致云端能力不可用。

**新增：**

- `supabase/migrations/20260508100000_init_schema.sql`：8 张业务表 + RLS + `profiles` 注册触发器
  - `profiles`、`user_wordbooks`、`wordbook_items`、`user_favorites`、`user_phrases`、`word_submissions`、`cloud_word_records`、`cloud_chapter_records`
- `supabase/config.toml`：本地 CLI 基础配置（含 Vercel 管理后台 OAuth 回调 URL）
- `.env.example`：前端与 Edge Function 所需环境变量模板
- `.mcp.json`：Supabase MCP 连接配置（需在 Cursor 桌面端完成 OAuth）
- `scripts/verify-supabase.sql`：建表后健康检查脚本

**激活步骤（需在 Supabase Dashboard 手动执行）：**

1. 若项目显示 **Paused**，先点 **Restore project** 恢复为 Active
2. SQL Editor 粘贴并运行 `supabase/migrations/20260508100000_init_schema.sql`
3. 运行 `scripts/verify-supabase.sql` 确认 8 张表与 RLS 已启用
4. 复制 Project URL / anon key 到 Vercel：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`，重新部署

**Cloud Agent 自动激活脚本：** `scripts/supabase-activate.sh`（需环境变量 `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`，可写入 Cloud Environment Secrets，无需手动点 Restore）

## 2026-05-06

### 后台与练习前台切换入口

- `src/pages/Admin/index.tsx`：侧栏顶部新增「练习首页（前台）」链接（高亮样式），顶栏右侧新增「练习首页」主按钮，均跳转 `/` 回到打字练习首页；登录态保留，无需退出即可继续背单词
- `src/pages/Admin/Login.tsx`：表单底部增加「← 返回练习首页」，未登录也可直接回到前台
- `src/components/Footer/index.tsx`：已登录时页脚「管理后台」跳转到 `/admin`，未登录时文案为「登录 / 后台」并仍进入 `/admin/login`

### 渐进式认证 + Google 登录 + 品牌清理

**Supabase 新增学习记录表：**

- 创建 `cloud_word_records` 和 `cloud_chapter_records` 两张表，存储用户级别的单词练习和章节练习数据
- 启用 RLS，策略 `auth.uid() = user_id`，仅允许用户操作自己的数据
- 添加 `(user_id, created_at DESC)` 复合索引，加速按时间段查询

**双写机制（本地 + 云端）：**

- `src/utils/db/index.ts`：`useSaveWordRecord` 和 `useSaveChapterRecord` 修改为双写模式 — 始终写入本地 IndexedDB，登录用户额外异步写入 Supabase 云端表
- 云端写入失败不影响本地保存，仅 console.error 输出

**首次登录数据迁移：**

- 新建 `src/utils/db/cloud-sync.ts`：`syncLocalToCloudIfNeeded()` 函数
- 登录时自动检查本地 IndexedDB 是否有历史数据，有则分批（300 条/批）上传到云端
- 使用 `localStorage` 标记 `cloud_initial_sync_done`，每个用户仅迁移一次
- 在 `src/store/authAtom.ts` 的 `attachAuthListener` 中，`SIGNED_IN` 事件触发自动迁移

**统计页面云端数据支持：**

- `src/pages/Analysis/hooks/useWordStats.ts` 重构：登录用户从 Supabase `cloud_word_records` 查询，未登录用户继续读本地 IndexedDB
- `src/pages/Analysis/index.tsx`：新增未登录提示横幅（"登录后可查看云端历史记录"）和云端数据标识

**Google 登录：**

- `src/hooks/useAuth.ts`：新增 `signInWithGoogle()` 方法（Supabase OAuth）
- `src/pages/Admin/Login.tsx`：登录页新增 Google 彩色 logo 按钮 + 分隔线
- 注意：需在 Supabase Dashboard → Authentication → Providers → Google 中配置 Client ID 和 Secret

**Header 登录入口：**

- `src/components/Header/index.tsx`：右侧导航栏新增登录/用户按钮
- 未登录：显示"登录"按钮
- 已登录：显示用户头像首字母 + "我的"链接，点击进入管理后台

**未登录引导提示：**

- `ResultScreen/index.tsx`：章节完成界面，未登录用户显示"登录以同步练习记录到云端"按钮
- `FavoriteButton.tsx`：未登录时点击收藏按钮跳转到登录页（不再隐藏按钮）

**品牌清理：**

- `src/components/Footer/index.tsx`：移除原作者品牌、社交媒体链接、捐赠入口、ICP 备案号、Gitee 镜像链接，替换为简洁的"管理后台"链接 + 通用版权信息
- `src/components/Header/index.tsx`：Logo 链接从 `https://qwerty.kaiyi.cool/` 改为 `/`
- `ResultScreen/index.tsx`：移除 AuthorButton、社交媒体图标（GitHub/微信/小红书/打赏）等
- `src/pages/Typing/index.tsx`：移除 DonateCard 组件
- `src/pages/Mobile/index.tsx`：所有 `https://qwerty.kaiyi.cool/` 替换为 `/`

### 合并到 master 并推送

- 将 `cursor/vercel-output-directory-4309` 分支的所有 Supabase 集成工作合并到 `master`
- 解决了 3 个合并冲突（`.gitignore`、`package.json`、`vercel.json`）
- 保留了 master 上较新的依赖版本，同时合入 `@supabase/supabase-js`、`@typescript-eslint/*`、`@vercel/node`
- `vercel.json` 统一为 `outputDirectory: "dist"` + API rewrites + SPA fallback
- `.eslintignore` 和 `.prettierignore` 均新增 `dist` 目录排除，避免 pre-commit hook 扫描构建产物报错

### `.gitignore` 增加 `dist/`

项目默认构建输出目录为 `build/`（见 `vite.config.ts`），此前 `.gitignore` 仅忽略 `build/`。若本地出现 `dist/`（例如使用 Vite 默认输出或其它构建流程），Git 会一直显示大量未跟踪文件。已在 `.gitignore` 中加入 `/dist`，与产物不入库的实践一致。

### Supabase 后端集成

完成了 Supabase 全面集成，将项目从纯前端应用升级为前后端一体的系统。

**数据库（PostgreSQL + RLS）：**

- 创建 6 张表：`profiles`、`user_wordbooks`、`wordbook_items`、`user_favorites`、`user_phrases`、`word_submissions`
- 所有表启用 Row Level Security，`auth.uid()` 级别数据隔离
- `profiles` 通过 Auth trigger 自动创建
- `word_submissions` 仅允许已认证用户读取/审核，写入通过 Edge Function 的 service_role key 绕过 RLS

**前端 SDK 初始化：**

- 安装 `@supabase/supabase-js`
- `src/lib/supabase.ts`：Supabase 客户端初始化
- `src/store/authAtom.ts`：Jotai atom 存储 session 状态
- `src/hooks/useAuth.ts`：封装 signIn / signUp / signOut / onAuthStateChange
- `src/components/AuthGuard.tsx`：登录态守卫组件
- `src/index.tsx`：Root 组件挂载 `useAuthListener()`

**管理后台重构（全部改为 Supabase 直连）：**

- `Login.tsx`：从密码登录改为邮箱注册/登录（Supabase Auth）
- `hooks.ts`：`useAdminAuth` 改读 Supabase session；新增 `useSupabaseQuery` 替代 `useAdminFetch`
- `Dashboard.tsx`：统计数据从 Supabase count 查询（词本、词条、收藏、短句、待审核投稿）
- `Dictionaries.tsx`：改为 CRUD `user_wordbooks`，支持新建和删除词本
- `DictDetail.tsx`：改为 CRUD `wordbook_items`，支持添加/编辑/删除词条、批量导入（JSON/TXT）
- `index.tsx`：侧边栏新增短句管理、收藏管理、投稿审核导航项

**新增后台页面：**

- `Phrases.tsx`（`/admin/phrases`）：CRUD `user_phrases`，支持搜索/编辑/分类
- `Favorites.tsx`（`/admin/favorites`）：查看/删除已收藏单词
- `Submissions.tsx`（`/admin/submissions`）：审核外部投稿，支持逐条/批量通过/拒绝，状态筛选

**前台集成：**

- `FavoriteButton.tsx`：打字练习页为已登录用户显示收藏/取消收藏心形按钮
- `WordPanel/index.tsx`：集成 FavoriteButton 到当前单词旁
- `CloudDictSection.tsx`：Gallery 页面新增「我的云端词库」分区，展示 `user_wordbooks` 中的词本
- `wordListFetcher.ts`：新增 `supabase://` 协议支持，从 `wordbook_items` 加载词条

**独立投稿接口（Edge Function）：**

- `supabase/functions/submit-words/index.ts`：POST 接口，x-api-key 鉴权
- 支持批量提交生词和短句（最多 200 条/次），写入 `word_submissions` 待审核池
- CORS 支持，详细的输入校验和错误响应

**环境变量：**

- `.env.local`：`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`（已加入 .gitignore）
- Edge Function Secrets：`SUBMIT_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`

**路由更新：**

- `src/index.tsx`：新增 `/admin/phrases`、`/admin/favorites`、`/admin/submissions` 懒加载路由

## 2026-05-02

### 管理后台（Admin Panel）

为项目新增了管理后台，可与前端一起部署到 Vercel。

**后端 API（Vercel Serverless Functions）：**

- `api/admin/login.ts`：管理员登录，通过环境变量 `ADMIN_PASSWORD` 校验
- `api/admin/auth.ts`：Bearer token 鉴权工具
- `api/admin/stats.ts`：仪表盘统计（词典总数、单词总数、分类数量），60 秒内存缓存
- `api/admin/dictionaries.ts`：词典列表，读取 `public/dicts/` 目录
- `api/admin/dictionaries/[id].ts`：单个词典详情，支持分页

**前端 UI（React + Tailwind）：**

- `src/pages/Admin/Login.tsx`：渐变背景登录页
- `src/pages/Admin/index.tsx`：响应式侧边栏布局 + 鉴权守卫
- `src/pages/Admin/Dashboard.tsx`：数据统计卡片
- `src/pages/Admin/Dictionaries.tsx`：可搜索、排序、分页的词典列表
- `src/pages/Admin/DictDetail.tsx`：词典详情 / 单词列表
- `src/pages/Admin/About.tsx`：关于页面
- `src/pages/Admin/hooks.ts`：`useAdminAuth` / `useAdminFetch` 共享 Hooks

**路由 & 配置：**

- `src/index.tsx`：新增 `/admin/*` 懒加载路由（全部 code-split）
- `vercel.json`：`outputDirectory: "build"` + SPA fallback rewrite

**使用方式：** 在 Vercel 环境变量中设置 `ADMIN_PASSWORD`，访问 `/admin/login` 即可登录。

### Vercel 部署输出目录

- 新增仓库根目录 `vercel.json`，设置 `outputDirectory` 为 `build`，与 `vite.config.ts` 里 `build.outDir` 一致，避免平台默认查找 `dist` 导致 「No Output Directory named dist」 报错。

### 自定义词库本地导入功能

实现了浏览器端「导入自定义词库」完整功能链路：

- **Dexie IndexedDB 扩展**：`RecordDB` 新增 `version(4)`，添加 `customDicts` 表（`++id,&dictId,createdAt`），类型定义 `ICustomDict`（`src/utils/db/record.ts`）
- **CRUD 工具**：新建 `src/utils/db/custom-dict.ts`，提供 `saveCustomDict`、`deleteCustomDict`、`getCustomDictWords`、校验函数 `validateWordList`，以及 React hook `useCustomDicts` / `useCustomDictionaries`（基于 `useLiveQuery` 响应式更新）
- **全局状态合并**：`src/store/index.ts` 新增 `customDictionariesAtom`，`currentDictInfoAtom` 查找时先查内置 `idDictionaryMap`，再查自定义词典列表。新增 `CustomDictSyncProvider` 组件将 Dexie live query 同步到 Jotai atom
- **词条加载**：`wordListFetcher` 支持 `custom://` 伪协议 URL，拦截后从 IndexedDB 读取词条而非 HTTP fetch
- **导入弹窗 UI**：新建 `ImportDictModal.tsx`，支持选择 JSON 文件、命名词库、选择语言类型、格式校验、错误提示
- **TXT 词库导入**：`custom-dict.ts` 新增 `parseTxtWordList`，每行「单词 /音标/ 释义」或「单词 释义」，空行与 `#` 注释跳过；音标写入 `usphone`/`ukphone`。Gallery「导入词库」同时接受 `.txt` 与 `.json`（`ImportDictModal.tsx`）
- **Gallery 展示**：新建 `CustomDictSection.tsx`（"我的词库"区域）+ `CustomDictCard.tsx`（带删除按钮的自定义词典卡片），集成到 Gallery-N 词典列表顶部
- **边界处理**：删除当前选中的自定义词典时自动回退到 CET-4；Typing 页面校验 dict id 时同时检查自定义词典列表

### ESLint 找不到 @typescript-eslint（pnpm）

- `.eslintrc.cjs` 使用了 `plugin:@typescript-eslint/recommended`，但未在根目录声明依赖；pnpm 不会把 `eslint-config-react-app` 嵌套依赖提升到根 `node_modules`，导致 pre-commit 里 ESLint 解析失败。
- 已在 `package.json` 的 `devDependencies` 中显式添加 `@typescript-eslint/eslint-plugin`、`@typescript-eslint/parser`（^5.62.0，与 CRA 7 所用 v5 一致）。

### Vercel 部署配置（vercel.json + 构建 base）

- **`vercel.json`**：`installCommand` 使用 **`corepack`** 激活 **`pnpm@9.15.9`**，执行 **`HUSKY=0 pnpm install --frozen-lockfile`**（避免 CI 下 husky、并与锁定依赖一致）；**`buildCommand`** **`pnpm run build`**；**`outputDirectory`** **`dist`**；SPA **`rewrites`** 回退到 **`index.html`**。
- **`pnpm-lock.yaml`**：已从 **`.gitignore`** 移除并纳入版本库（此前忽略导致远端 **`pnpm install`** 无 lockfile，易解析失败或与本地不一致）。
- **`package.json`**：声明 **`packageManager`**：**`pnpm@9.15.9`**；**`pnpm.onlyBuiltDependencies`** 允许 **`esbuild`** 等在安装阶段执行必要脚本。
- **`vite.config.ts`**：`build.outDir` **`dist`**；根据 **`process.env.VERCEL`** 设置 `base` —— Vercel 构建为 **`'/'`**，本地/GitHub Pages 为 **`'./'`**。此前 `build` 脚本写死 **`--base=./`**，在 Vercel 根域名下访问 **`/gallery`** 时会把 `./assets/…` 解析成 **`/gallery/assets/…`** 导致白屏。
- **`package.json`**：已从 **`build`** 脚本中移除 **`--base=./`**，统一由 `vite.config.ts` 的 `base` 决定。
- **控制台**：建议在 Vercel **Build & Development Settings** 中将 **Output Directory** 设为 **`dist`**，并关闭与 **`vercel.json`** 冲突的 **Install Command Override**。

### Husky pre-commit 无 yarn

- `.husky/pre-commit` **只运行 `lint-staged`**：仅对已暂存文件跑 **ESLint `--fix`** 与 **Prettier**，已移除 **`eslint . --fix`** 与 **`prettier --write .`**（避免扫全仓库、误处理 **`dist`** 产物导致崩溃或过慢）。
- **`lint-staged`**（见 `package.json`）：编排 **`src/`**、**`tests/`**、**`vite.config.ts` / `playwright.config.ts`**、**`scripts/`**、根目录 **`tailwind/postcss/prettier.config.js`**、**`.eslintrc.cjs`**，以及 **`*.json` / YAML / Markdown / CSS**；命令一律经 **`scripts/with-node-path.sh`** 调用仓库内 CLI。
- **`.prettierignore`**：**`dist`**、**`pnpm-lock.yaml`** 等不参与格式化。
- **`.eslintrc.cjs`**：**`tests/`** 使用 **`node` + TypeScript**（Playwright）；**`src/`** 仍为浏览器 + React；扩展 **`playwright.config.ts`** 与若干 **`*.config.js`** 的 override。

### 云端重启后 PATH 无 Node

- `vite.config.ts` 增加 `server.host: true`，便于端口转发访问。
- `scripts/with-node-path.sh`：在 PATH 不含 nvm 时自动 prepend Node 目录后再执行命令。
- `package.json` 的 `dev`/`start`/`build` 通过上述脚本调用 `node ./node_modules/vite/...`，重启后无需手动 `export PATH`（仍需 PATH 中有 `bash`，通常总有）。
- 仓库根目录 `./dev-cloud.sh`：`yarn install && yarn dev` 一键启动。

### 早期变更

- 新增用户示例词库 **示例词库（英英）**（`id: user_basic_three_en`）：词条文件 `public/dicts/user_basic_three.json`，三条单词 **cat / banana / apple**，释义为英文（英英），音标与美音/英音一致；在 `src/resources/dictionary.ts` 中注册为 `language: 'en'`。
