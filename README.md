# CET-6 私人备战网站（二期）

面向你的备考周期 `2026-03-01` 到 `2026-12-11`，本项目已实现：

1. 官方入口 + 内置资料中心  
官方链接：`https://cet.neea.edu.cn/`  
内置 PDF：`cet4-6.pdf`、`大学英语六级词汇乱序版.pdf`（站内下载 + 一键导入）  
外部资料站：WeHUSTER、PastPapers、BurningVocabulary、科鲁克、新东方四六级、喜马拉雅
2. RPG 化学习主循环  
每日 4 个任务（小怪）+ 周六 Boss 复盘，包含经验、等级、连胜、金币反馈
3. 真实性词汇约束  
词汇主库只允许有出处元数据；内置/上传资料抽词默认进待审核池
4. 双提醒  
北京时间 `12:00`、`21:40`，邮件 + 浏览器推送并行；晚间提醒附当日学习 PDF
5. 跨端访问  
手机和电脑可同步进度（Supabase 模式），未配置云端时可本地 mock 演示

---

## 1. 技术栈

- Next.js 15 + TypeScript + App Router
- Supabase（PostgreSQL + Auth + Storage）
- Resend（邮件）
- Web Push + Service Worker（浏览器提醒）
- Vercel Cron（定时触发提醒）

---

## 2. 目录说明

- `app/`：页面与 API 路由
- `components/`：前端组件
- `lib/`：业务服务、配置、词汇抽取、中文文案
- `public/resources/`：内置 PDF 静态资料
- `supabase/schema.sql`：数据库结构
- `supabase/seed.sql`：初始化数据
- `scripts/verify-all.mjs`：自动化验收脚本
- `scripts/manual-checklist.md`：手工验收清单

---

## 3. 快速启动（Windows PowerShell）

### 3.1 安装依赖

```powershell
npm install
```

### 3.2 配置环境变量

```powershell
Copy-Item .env.example .env.local
```

至少先保留 `.env.local` 文件，未填 Supabase 也可跑 mock 演示。

### 3.3 生成 VAPID（可选，用于推送）

```powershell
node scripts/generate-vapid.mjs
```

### 3.4 启动开发环境

```powershell
npm run dev
```

打开：

- 本机：`http://localhost:3000`
- 同局域网手机：`http://<你的电脑IP>:3000`

---

## 4. Supabase 初始化（可选但推荐）

在 Supabase SQL Editor 依次执行：

1. `supabase/schema.sql`
2. `supabase/seed.sql`

并创建 Storage bucket：`paper-uploads`。

---

## 5. 环境变量说明

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`
- `CRON_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL`

---

## 6. 二期新增 API

- `GET /api/resources/list`：官方入口 + 外部资料站 + 内置 PDF 列表
- `POST /api/resources/import-builtin`：一键导入内置资料并抽词入待审核池（幂等）
- `GET /api/game/profile`：等级/经验/连胜/Boss 状态
- `GET /api/reminder/daily-pdf`：生成并下载当日备考 PDF（支持签名链接）

已存在 API 仍可用：

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/tasks/today`
- `POST /api/tasks/complete`（返回 `reward`）
- `GET /api/vocab/today`
- `GET /api/vocab/:id/provenance`
- `GET/POST /api/reminder/preferences`
- `POST /api/reminder/push-subscribe`
- `POST /api/reminder/cron-send`
- `POST /api/source/upload`
- `POST /api/source/extract`

---

## 7. 词汇真实性约束

1. 内置/上传资料抽词只进入 `source_extracted_candidates` 待审核池
2. 不自动进入 `vocab_entries` verified 主库
3. verified 词条必须有 `vocab_provenance` 出处记录
4. `source_uploads` 通过 `user_id + source_file + file_hash` 去重

---

## 7.1 已接入的外部六级资料站

- `https://www.wehuster.com/cet6?utm_source=chatgpt.com`
- `https://pastpapers.cn/cet-6?utm_source=chatgpt.com`
- `https://zhenti.burningvocabulary.cn/cet6?utm_source=chatgpt.com`
- `https://www.keluke.com/yingyu/cet6/?utm_source=chatgpt.com`
- `https://cet4-6.xdf.cn/?utm_source=chatgpt.com`
- `https://www.ximalaya.com/waiyu/40550410/?utm_source=chatgpt.com`

说明：这些链接作为资料入口展示，不抓取受版权保护的全文内容。

---

## 8. 一键验收

### 8.1 自动化接口验收

先启动 `npm run dev`，再执行：

```powershell
node scripts/verify-all.mjs
```

执行后会生成：`verification-report.md`。

### 8.2 代码质量检查

```powershell
npm run typecheck
npm run lint
npm run build
```

### 8.3 手工验收

按 `scripts/manual-checklist.md` 逐项测试（登录、任务、升级、Boss、资源下载、内置导入、移动端布局、提醒设置等）。

---

## 9. 常见问题

### 9.1 页面突然变成白底/样式丢失

原因通常是开发环境 Service Worker 缓存旧资源。  
当前项目在开发环境会自动注销 SW 并清理缓存，若仍异常：

1. 关闭 `npm run dev`
2. 重新执行 `npm run dev`
3. 浏览器强制刷新（`Ctrl + F5`）

### 9.2 为什么没有真实邮件/推送

未配置 `RESEND_API_KEY` 或 VAPID 时会跳过对应渠道，这是预期行为。

### 9.3 本地验证码是多少

mock 模式固定 `123456`。

---

## 10. 最近后端优化（已落地）

以下优化已完成，并保持原有架构不变：

1. 上传接口鲁棒性增强（`POST /api/source/upload`）
   - 新增 `multipart/form-data` 请求格式校验，畸形 JSON 上传不再触发 500。
   - 新增文件类型与扩展名双重限制，仅允许 `TXT/PDF`。
   - 新增文件大小限制：`10MB`。
   - 新增空文件与解析失败兜底，统一返回可读 4xx 错误。

2. Cron 提醒任务稳定性优化（`POST /api/reminder/cron-send`）
   - 由逐用户串行改为“固定批次并发”处理（默认每批 10 个用户）。
   - 每个用户仍保留独立异常隔离，不因单用户失败中断整批发送。
   - 保留原有“PDF 失败降级为普通提醒”的语义。

3. 边界测试脚本增强（`scripts/test-custom-dataset.mjs`）  
   - 新增 multipart 异常场景：恶意扩展名、超大文件、空文件。  
   - 便于持续验证上传接口在极端输入下不再返回 500。

---

## 11. 2026-03-01 线上修复记录（增量）

1. 听力战斗播放链路修复（`components/battle/listening-battle.tsx`）  
   - 播放策略改为：`m4a 本地音频 -> wav 本地音频 -> TTS` 三级兜底。  
   - 避免单一 TTS 或单一音频格式失败导致“语音播放失败”。

2. 每日任务完成态修复（已落地）  
   - 完成任务后，前端列表与进度状态即时同步，不再出现“已完成但卡在未完成态”。

3. OTP 接口可诊断性增强（已落地）  
   - `POST /api/auth/send-otp` 对限流/邮箱通道异常返回可读状态码与提示，不再统一为模糊 500。  
   - `POST /api/auth/verify-otp` 保持验证码登录链路，失败时返回可读错误信息用于排查。
