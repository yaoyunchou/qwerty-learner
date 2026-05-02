# 变更记录

## 2026-05-02

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
