# 变更记录

## 2026-05-06

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
- **Gallery 展示**：新建 `CustomDictSection.tsx`（"我的词库"区域）+ `CustomDictCard.tsx`（带删除按钮的自定义词典卡片），集成到 Gallery-N 词典列表顶部
- **边界处理**：删除当前选中的自定义词典时自动回退到 CET-4；Typing 页面校验 dict id 时同时检查自定义词典列表

### 云端重启后 PATH 无 Node

- `vite.config.ts` 增加 `server.host: true`，便于端口转发访问。
- `scripts/with-node-path.sh`：在 PATH 不含 nvm 时自动 prepend Node 目录后再执行命令。
- `package.json` 的 `dev`/`start`/`build` 通过上述脚本调用 `node ./node_modules/vite/...`，重启后无需手动 `export PATH`（仍需 PATH 中有 `bash`，通常总有）。
- 仓库根目录 `./dev-cloud.sh`：`yarn install && yarn dev` 一键启动。

### 早期变更

- 新增用户示例词库 **示例词库（英英）**（`id: user_basic_three_en`）：词条文件 `public/dicts/user_basic_three.json`，三条单词 **cat / banana / apple**，释义为英文（英英），音标与美音/英音一致；在 `src/resources/dictionary.ts` 中注册为 `language: 'en'`。
