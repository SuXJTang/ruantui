// ============================================
// apikey-config.js — DeepSeek API Key 配置（已停用内置密钥）
// ============================================
// 安全说明（v3.1.1 起）：
//   这里曾经存放「用管理密码加密后的 API Key 密文」，但那层加密是**假防护**：
//   管理密码的 SHA-256 哈希明文写在同一个公开仓库里，而管理密码本身是弱口令，
//   任何人都能反推出明文密码、再拿它解开密文，取走真实的 API Key。
//   密钥一旦进过 git 历史就永久可取，改密码也无法回收。
//
//   现在改为：代码里**不存放任何** API Key（明文、密文都不放）。
//   Key 只保存在使用者本机浏览器 localStorage，首次使用 AI 功能时手动输入。
//   localStorage 键名：'deepseek_api_key'
//
// 需要让 AI 功能开箱即用？不要把 Key 写进这个文件（纯前端项目，写进去就等于公开）。
// 正确做法是在 Cloudflare Worker 里用 secret 保管并代理调用：
//   wrangler secret put DEEPSEEK_API_KEY
//   然后在 Worker 中新增 /api/ai 路由，由服务端带 Key 请求 DeepSeek，
//   前端只调用自己的 /api/ai，永远拿不到 Key。
//
// 本文件保留为占位，避免删文件导致 index.html 的 <script> 404。
// 若后续实现了 Worker 代理，可直接删除本文件及 index.html 中的引用。
//
// 该文件不含任何敏感信息。
