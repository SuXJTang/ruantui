-- ============================================================
-- 用户中心：昵称修改 + 删除账号（软删除）
-- ============================================================
-- 在 Supabase SQL Editor 执行，可重复运行。
-- ============================================================


-- ------------------------------------------------------------
-- 第 1 步：看看现有策略（诊断，把结果发给我）
-- ------------------------------------------------------------
select
    tablename,
    policyname,
    cmd as 操作,
    qual as 读条件,
    with_check as 写条件
from pg_policies
where tablename in ('profiles', 'announcements', 'tools', 'favorites')
order by tablename, cmd;


-- ------------------------------------------------------------
-- 第 2 步：列级权限 —— 把 vip_until 锁死
-- ------------------------------------------------------------
-- 这比 RLS 更底层：即使 RLS 放行了 UPDATE，
-- 没有列权限也改不了那一列。双保险。
revoke update on public.profiles from authenticated;
grant update (nickname) on public.profiles to authenticated;


-- ------------------------------------------------------------
-- 第 3 步：RLS 策略
-- ------------------------------------------------------------
-- 用户可更新自己的行（受列级权限限制，实际只能改 nickname）
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
    for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- 用户可读自己的行
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
    for select to authenticated
    using (auth.uid() = id);


-- ------------------------------------------------------------
-- 第 4 步：昵称校验触发器
-- ------------------------------------------------------------
create or replace function public.validate_nickname()
returns trigger
language plpgsql
as $$
declare
    n text;
begin
    if NEW.nickname is distinct from OLD.nickname then
        n := trim(coalesce(NEW.nickname, ''));
        if length(n) < 2 then
            raise exception '昵称至少 2 个字';
        end if;
        if length(n) > 20 then
            raise exception '昵称最多 20 个字';
        end if;
        NEW.nickname := n;
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_validate_nickname on public.profiles;
create trigger trg_validate_nickname
    before update of nickname on public.profiles
    for each row
    execute function public.validate_nickname();


-- ------------------------------------------------------------
-- 第 5 步：软删除账号
-- ------------------------------------------------------------
-- 为什么不真删 auth.users：
--   删 auth.users 需要 service_role 权限，前端拿不到。
--   软删除可以恢复，也符合「保留证据」的合规实践。
--
-- 软删除 = 标记 deleted_at + 清空昵称 + 让 VIP 失效
alter table public.profiles
    add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
    '账号删除时间，非 null 表示已注销（软删除）';

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception '请先登录';
    end if;

    update public.profiles
       set deleted_at = now(),
           nickname = '已注销用户',
           vip_until = null
     where id = auth.uid();

    -- 顺便清掉收藏
    delete from public.favorites where user_id = auth.uid();
end;
$$;

comment on function public.delete_my_account() is
    '用户注销自己的账号（软删除）：标记时间、清昵称、失效 VIP、删收藏';

grant execute on function public.delete_my_account() to authenticated;


-- ------------------------------------------------------------
-- 第 6 步：验证
-- ------------------------------------------------------------
select
    (select count(*) from pg_policies
      where tablename='profiles' and policyname='profiles_update_self') as 自身更新策略,
    (select count(*) from pg_policies
      where tablename='profiles' and policyname='profiles_select_self') as 自身读取策略,
    (select count(*) from pg_trigger
      where tgname='trg_validate_nickname') as 昵称触发器,
    (select count(*) from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='deleted_at') as 软删除字段,
    (select count(*) from information_schema.column_privileges
      where table_schema='public' and table_name='profiles'
        and grantee='authenticated' and privilege_type='UPDATE' and column_name='nickname') as 昵称可改,
    (select count(*) from information_schema.column_privileges
      where table_schema='public' and table_name='profiles'
        and grantee='authenticated' and privilege_type='UPDATE' and column_name='vip_until') as VIP可改_应为0;
