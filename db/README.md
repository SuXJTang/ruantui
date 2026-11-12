# 数据库迁移说明

## 现状

本项目用 Supabase（PostgreSQL）。**没有迁移框架**，所有 schema 变更是
人工把 SQL 贴到 Supabase 控制台的 SQL Editor 里执行。

这些文件都在 `.assetsignore` 的排除列表里（`*.sql`），不会被当作静态资源
部署到线上 —— 曾经出过 `setup-admin.sql` 连同管理员 UID 一起被公开的事故。

---

## 执行顺序（从零搭建一个全新的 Supabase 项目时）

按编号顺序执行，**不能跳**，后面的依赖前面的表/函数。

| 顺序 | 文件 | 作用 |
|---|---|---|
| 1 | `archive/migration.sql` | 基础表结构：tools / announcements / admins + RLS 策略。**这是底座，必须最先跑** |
| 2 | `archive/migration-auth.sql` | 注册登录相关的辅助函数（is_admin 等） |
| 3 | `archive/migration-favorites.sql` | 收藏表 + 用户只能读写自己的行 |
| 4 | `archive/setup-admin.sql` | 把指定 UID 加进 admins 表（**需要改成自己的 UID**） |
| 5 | `archive/fix-admin-update.sql` | 修管理员更新工具时的 RLS 权限（历史 bug） |
| 6 | `archive/fix-favorites-rls.sql` | 修收藏表的 RLS 策略（历史 bug） |
| 7 | `migration-vip.sql` | VIP 体系：profiles.vip_until、is_vip()、tool_downloads 表、get_download_url() |
| 8 | `migration-download-tier.sql` | 按工具设置下载门槛：download_tier（free / user / vip） |
| 9 | `migration-downloads-count.sql` | 工具下载计数：tools.downloads、increment_tool_download() |
| 10 | `migration-announcement-enhance.sql` | 公告增强：优先级、显示模式、起止时间、可关闭、active_announcements 视图 |
| 11 | `migration-user-profile.sql` | 用户中心：昵称校验、改昵称权限、软删除账号 |

---

## 已验证执行过的迁移

以下文件**已经在生产库里跑过**，记录在此备查，不需要重复执行：

- `migration.sql` ✅
- `migration-auth.sql` ✅
- `migration-favorites.sql` ✅
- `setup-admin.sql` ✅
- `fix-admin-update.sql` ✅
- `fix-favorites-rls.sql` ✅
- `migration-vip.sql` ✅
- `migration-download-tier.sql` ✅
- `migration-downloads-count.sql` ✅（实测 1 → 2，计数正常）
- `migration-announcement-enhance.sql` ✅
- `migration-user-profile.sql` ✅

> ⚠️ `migration-user-profile.sql` 里的
> `delete_my_account()` 我验证过函数存在，但**「删除账号」这个完整流程
> 没有端到端测试过**（会真的软删账号）。首次使用时建议用测试账号先试。

---

## 验证脚本

`verify-*.sql` 是一次性的排查工具，不需要执行，留作参考：

| 文件 | 用途 |
|---|---|
| `verify-vip.sql` | 检查 VIP 相关表/函数/策略是否都建好 |
| `verify-vip-simple.sql` | 同上，简化版（一次查一个结果，便于对照） |

要在自己环境里排查，把文件内容贴到 SQL Editor 执行即可。
它们全是 `select`，不改数据。

---

## 手动开通 VIP

见仓库根目录 README 的「日常运维备忘」一节。核心是一条 update：

```sql
update public.profiles
   set vip_until = now() + interval '30 days'
 where email = '用户邮箱';
```

不设过期（永久）用 `'2099-12-31'`，前端会把 2099 年识别为「永久有效」。

---

## 新增迁移时的约定

1. 文件名用 `migration-<主题>.sql`，不要用日期后缀（不好排序）
2. 文件开头写清楚：**做什么、为什么、能不能重复执行**
3. 尽量写成幂等的（`create table if not exists` / `drop policy if exists` 再 `create`），
   出错重跑不会搞坏数据
4. 跑完后在本文件「已验证执行过的迁移」里补一行 ✅
