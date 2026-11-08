-- ============================================================
-- 修复：收藏写入 403
-- ------------------------------------------------------------
-- 现象：登录用户 POST /rest/v1/favorites 返回 403。
-- 原因：favorites.user_id 没有默认值，前端插入时只传了 tool_id，
--       数据库里的 user_id 为 null，与 RLS 策略 auth.uid() = user_id 不符。
--
-- 两种修法：
--   A. 前端显式传 user_id —— 用户可以伪造别人的 user_id（虽然 RLS 会拦，
--      但容易写出漏洞）
--   B. 数据库给 user_id 加默认值 auth.uid() —— 服务端自动填充，
--      前端无法伪造，也少传一个字段
-- 采用 B。
-- ============================================================

-- 1. 给 user_id 加默认值：插入时自动取当前登录用户的 id
alter table public.favorites
    alter column user_id set default auth.uid();

-- 2. 补一条更明确的插入策略（with check 已在原策略里，这里确保默认值生效后依旧匹配）
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
    for insert to authenticated
    with check (auth.uid() = user_id);

-- 3. 确保 authenticated 角色有使用 auth.uid() 的权限（通常默认就有）
grant usage on schema auth to authenticated;

-- 4. 验证：查询当前策略与列默认值
select
    column_name,
    column_default,
    is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'favorites'
order by ordinal_position;
