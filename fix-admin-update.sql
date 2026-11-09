-- ============================================================
-- 修复：管理员无法修改他人的 profiles 行
-- ============================================================
-- 问题（已实测确认）：
--   profiles 表只有 profiles_update_own 策略：
--       using (auth.uid() = id)
--   它只允许用户改自己那一行。
--   管理员在 VIP 管理页给别的用户设 vip_until 时，
--   RLS 会把目标行过滤掉，UPDATE 影响 0 行，
--   接口却返回 200（Supabase 对「0 行受影响」不报错），
--   前端误以为成功，弹了提示但数据库没变。
--
--   实测记录：
--     PATCH /rest/v1/profiles?id=eq.<管理员自己>  → 返回 1 行，成功
--     PATCH /rest/v1/profiles?id=eq.<其他用户>    → 返回 []，0 行
--
-- 修复：补一条管理员可更新全部行的策略。
--   PostgreSQL 的 RLS 策略是 OR 关系，多条策略取并集，
--   所以加上这条后：普通用户仍只能改自己，管理员能改所有人。
--
-- 在 Supabase SQL Editor 里整体执行，可重复运行。
-- ============================================================

-- 1. 管理员可更新任意 profiles 行
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
    for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- 2. 管理员可插入任意 profiles 行（补全，一般用不到）
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
    for insert to authenticated
    with check (public.is_admin());

-- 3. 管理员可删除 profiles 行（补全，一般用不到）
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
    for delete to authenticated
    using (public.is_admin());


-- ============================================================
-- 验证：执行下面这段，看 profiles 表上有哪些策略
-- ============================================================
select polname as 策略名,
       case polcmd
         when 'r' then 'SELECT'
         when 'a' then 'ALL'
         when 'w' then 'UPDATE'
         when 'd' then 'DELETE'
         when 'x' then 'REFERENTIAL'
         else polcmd::text
       end as 操作,
       case when qual is null then '-' else '有' end as 有USING,
       case when with_check is null then '-' else '有' end as 有WITHCHECK
from pg_policy
where polrelid = 'public.profiles'::regclass
order by 操作, 策略名;
