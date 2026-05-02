# 变更记录

## 2026-05-02

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
