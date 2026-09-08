#!/usr/bin/env node
/**
 * Vercel Hobby + Vite 项目下 .ts Serverless 入口会 FUNCTION_INVOCATION_FAILED；
 * 构建阶段将 api 目录下 .ts 打成 CommonJS .js 并移除 .ts，仅部署 .js 入口。
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const esbuildBin = path.join(root, 'node_modules', '.pnpm', 'esbuild@0.27.0', 'node_modules', 'esbuild', 'bin', 'esbuild')

function listApiEntries(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      listApiEntries(full, acc)
      continue
    }
    if (!name.endsWith('.ts')) continue
    const source = fs.readFileSync(full, 'utf8')
    if (/export\s+default\s+/.test(source)) {
      acc.push(full)
    }
  }
  return acc
}

const entries = listApiEntries(path.join(root, 'api'))
if (!entries.length) {
  console.log('build-api: no api/*.ts entries found')
  process.exit(0)
}

if (process.env.VERCEL !== '1') {
  console.log('build-api: skipped (set VERCEL=1 to compile serverless handlers)')
  process.exit(0)
}

for (const entry of entries) {
  const outfile = entry.replace(/\.ts$/, '.js')
  console.log(`build-api: ${path.relative(root, entry)} -> ${path.relative(root, outfile)}`)
  execFileSync(
    esbuildBin,
    [
      entry,
      '--bundle',
      '--platform=node',
      '--target=node18',
      '--format=cjs',
      `--outfile=${outfile}`,
      '--external:@vercel/node',
      '--log-level=warning',
    ],
    { stdio: 'inherit', cwd: root },
  )
  fs.unlinkSync(entry)
}

console.log(`build-api: compiled ${entries.length} serverless handlers`)
