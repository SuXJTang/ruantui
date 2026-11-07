-- ============================================
-- 迁移：把管理权限从「固定 admin token」改为「Supabase 账号登录」
-- ============================================
--
-- 背景
--   原来的写权限靠 is_admin() 比对请求头 x-admin-token 与数据库里的 app.admin_token。
--   这套机制的问题：
--     1. 密钥一旦泄露就永久有效，且无法区分是谁在操作
--     2. 前端要把密钥塞进请求头，等于把写权限下发到了浏览器
--     3. 若 app.admin_token 没设置，'' = '' 恒成立，写策略形同虚设
--
-- 新方案
--   用 Supabase Auth：管理员用邮箱+密码登录，拿到用户 JWT。
--   RLS 用 auth.uid() 判断「是不是这个特定的管理员账号」。
--   注意：本项目允许任意人注册（disable_signup=false），所以**不能**只判断
--   auth.role() = 'authenticated'，必须限定到具体的 UID。
--
-- 使用方法
--   1. Supabase Dashboard → Authentication → Users → Add user
--      新建一个管理员账号（例如 you@example.com + 强密码）
--   2. 复制该用户的 UID（形如 7f3c2a10-....）
--   3. 把下面 <管理员UID> 替换成你的 UID，然后在 SQL Editor 执行本文件
--   4. 如需再加管理员，在最后追加 INSERT
--
-- 执行后，前端 supabase.js 会用登录用户的 JWT 直连 Supabase 写表，
-- 不再需要 Cloudflare Worker 中转。
-- ============================================

BEGIN;

-- ---------- 1. 管理员名单表 ----------
-- 独立一张表而不是硬编码 UID，方便以后增删管理员
CREATE TABLE IF NOT EXISTS admins (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    note        TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 只有管理员本人能看名单（避免泄露其他人的 UID）
DROP POLICY IF EXISTS "admins_read_self" ON admins;
CREATE POLICY "admins_read_self" ON admins
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ---------- 2. 新的 is_admin() ----------
-- 取代旧的「比对 x-admin-token」实现。
-- SECURITY DEFINER 是必需的：否则递归查询 admins 表又会触发它自己的 RLS。
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admins WHERE user_id = auth.uid()
    );
$$;

-- ---------- 3. 替换 tools 表的写策略 ----------
DROP POLICY IF EXISTS "admin_write"  ON tools;
DROP POLICY IF EXISTS "admin_update" ON tools;
DROP POLICY IF EXISTS "admin_delete" ON tools;

CREATE POLICY "admin_write" ON tools
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admin_update" ON tools
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete" ON tools
    FOR DELETE TO authenticated USING (is_admin());

-- ---------- 4. 同样替换 announcements 表 ----------
DROP POLICY IF EXISTS "admin_write"  ON announcements;
DROP POLICY IF EXISTS "admin_update" ON announcements;
DROP POLICY IF EXISTS "admin_delete" ON announcements;

CREATE POLICY "admin_write" ON announcements
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admin_update" ON announcements
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete" ON announcements
    FOR DELETE TO authenticated USING (is_admin());

-- ---------- 5. 登记管理员 UID ----------
-- ⚠️ 必须替换成你自己的 UID，否则任何人都没有写权限（包括你）
INSERT INTO admins (user_id, note)
VALUES ('<管理员UID>', '主管理员')
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ============================================
-- 执行后自检（把下面几行跑一遍确认结果）
-- ============================================
-- 1) 确认管理员已登记
--    SELECT * FROM admins;
--
-- 2) 确认策略已更新（应该只有 public_read 和新的 admin_* 三条）
--    SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'tools';
--
-- 3) 确认 is_admin() 已换成新实现（应该看到 SELECT EXISTS ... FROM admins）
--    SELECT pg_get_functiondef('is_admin'::regproc);
--
-- ============================================
-- 可选：禁止新用户注册（关闭后所有人都无法自行注册，更安全）
-- ============================================
-- 注意：这需要在 Dashboard → Authentication → Providers → Email
-- 关闭 "Allow new users to sign up"，或执行：
--   UPDATE auth.users SET banned_until = 'infinity' WHERE email <> '你的邮箱';
-- （不推荐用 SQL 改 auth schema，优先用 Dashboard 开关）
--
-- ============================================
-- 回滚（如需退回旧的 token 方案）
-- ============================================
-- DROP POLICY IF EXISTS "admin_write"  ON tools;
-- DROP POLICY IF EXISTS "admin_update" ON tools;
-- DROP POLICY IF EXISTS "admin_delete" ON tools;
-- 然后重新执行 migration.sql 第 4 节
