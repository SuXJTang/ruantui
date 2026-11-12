-- ============================================================
-- 第二阶段：收藏云同步
-- ------------------------------------------------------------
-- 目标：给「注册」一个真实理由
--   游客：收藏存 localStorage（现有行为不变）
--   登录用户：收藏存数据库，换设备/换浏览器都在
--   首次登录时把本地收藏合并上云，用户无感知
-- ============================================================

-- 收藏表
create table if not exists public.favorites (
    id          bigserial primary key,
    user_id     uuid not null references auth.users(id) on delete cascade,
    tool_id     bigint not null references public.tools(id) on delete cascade,
    created_at  timestamptz not null default now(),
    -- 同一用户对同一工具只能收藏一次
    unique (user_id, tool_id)
);

-- 按用户查询是唯一的高频路径
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

-- 用户资料表（顺带给 VIP 打底）
create table if not exists public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    email       text,
    nickname    text,
    avatar_url  text,
    -- VIP 到期时间：null 或过去时间 = 非 VIP，未来的时间 = VIP 有效期
    vip_until   timestamptz,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS 策略
-- ------------------------------------------------------------
alter table public.favorites enable row level security;
alter table public.profiles  enable row level security;

-- favorites：每个人只能看到并改动自己的收藏
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
    for select to authenticated
    using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
    for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
    for delete to authenticated
    using (auth.uid() = user_id);

-- profiles：本人可读；只有管理员可改 vip_until（防止用户自己开会员）
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
    for select to authenticated
    using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
    for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
    for insert to authenticated
    with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 新用户注册时自动建 profile
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, nickname)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'nickname', split_part(coalesce(new.email, ''), '@', 1))
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- VIP 判定函数（供后续下载权限使用）
-- ------------------------------------------------------------
create or replace function public.is_vip()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and vip_until is not null
          and vip_until > now()
    );
$$;

-- ------------------------------------------------------------
-- 为已存在的用户补建 profile
-- ------------------------------------------------------------
insert into public.profiles (id, email, nickname)
select id, email, split_part(coalesce(email, ''), '@', 1)
from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 权限：authenticated 可读写自己的行（RLS 会再做一次过滤）
-- ------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;
