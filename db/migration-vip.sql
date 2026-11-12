-- ============================================================
-- VIP 权限安全修复 + 下载保护
-- ============================================================
-- 问题（已实测确认）：
--   profiles_update_own 策略只检查「行是不是自己的」，不限制改哪些列。
--   任何登录用户都能 PATCH 自己的 profiles 行，把 vip_until 改到 2099 年，
--   免费开 VIP。
--
--   实测记录：
--     PATCH /rest/v1/profiles?id=eq.<自己的uid>
--     {"vip_until":"2099-12-31T00:00:00Z"}
--     → HTTP 200，值真的写进去了
--
-- 修复思路：
--   PostgreSQL 的 RLS 无法按列限制，用 BEFORE UPDATE 触发器：
--   普通用户改 vip_until 时，静默还原为旧值（不让改，也不报错，
--   避免把一个原本正常的资料更新请求也搞失败）。
--   管理员（在 admins 表里）不受限制。
--
-- 在 Supabase SQL Editor 里整体粘贴执行，可重复运行。
-- ============================================================


-- ------------------------------------------------------------
-- 1. 判断当前操作者是不是管理员
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.admins where user_id = auth.uid()
    );
$$;

comment on function public.is_admin() is '当前 JWT 用户是否在管理员名单里';


-- ------------------------------------------------------------
-- 2. 保护 vip_until：非管理员改了就还原
-- ------------------------------------------------------------
-- 说明：
--   · auth.uid() 为空 = service_role / 后台脚本，放行
--   · is_admin() = true 放行（站长在管理面板里操作）
--   · 其他情况（普通登录用户）把 vip_until 还原成 OLD.vip_until
--
--   不抛异常是刻意的：用户正常改昵称时不应该因为 vip_until 字段报错，
--   只是这个字段的修改会被静默丢弃。
create or replace function public.guard_vip_until()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- 没有变化，直接放行
    if new.vip_until is not distinct from old.vip_until then
        return new;
    end if;

    -- service_role（后端脚本）或管理员，允许修改
    if auth.uid() is null or public.is_admin() then
        return new;
    end if;

    -- 普通用户：静默还原，其他字段的修改照常生效
    new.vip_until := old.vip_until;
    return new;
end;
$$;

drop trigger if exists guard_vip_until_trg on public.profiles;
create trigger guard_vip_until_trg
    before update on public.profiles
    for each row
    execute function public.guard_vip_until();


-- ------------------------------------------------------------
-- 3. 判断当前用户是否 VIP（前端和后端都能用）
-- ------------------------------------------------------------
create or replace function public.is_vip()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and vip_until is not null
          and vip_until > now()
    );
$$;

comment on function public.is_vip() is '当前登录用户是否为有效 VIP';


-- ------------------------------------------------------------
-- 3.5 管理员可以读全部 profiles
-- ------------------------------------------------------------
-- 原有的 profiles_select_own 只让用户读自己那一行，
-- 站长打开「VIP 管理」时看不到其他用户，没法给谁开通。
-- 这里补一条：管理员可读全部。
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
    for select to authenticated
    using (public.is_admin());


-- ------------------------------------------------------------
-- 4. VIP 专属下载链接表
-- ------------------------------------------------------------
-- 设计要点：
--   · 与 tools 表分开存，普通用户读不到 tools 表里的这个字段
--   · RLS 只允许 VIP 用户读「自己有权访问的那条」
--   · 前端拿不到链接 = 源码里看不到真实地址
create table if not exists public.tool_downloads (
    id          bigserial primary key,
    tool_id     bigint not null references public.tools(id) on delete cascade,
    -- 真实下载地址
    url         text not null,
    -- 该链接需要的等级：'vip' = 仅 VIP，'user' = 登录即可
    tier        text not null default 'vip'
                check (tier in ('vip', 'user')),
    note        text,
    created_at  timestamptz not null default now()
);

create index if not exists tool_downloads_tool_idx on public.tool_downloads (tool_id);

alter table public.tool_downloads enable row level security;

-- VIP 用户：可以读 tier='vip' 的链接
-- 普通登录用户：只能读 tier='user' 的链接
-- 游客：什么都读不到
drop policy if exists "tool_downloads_select_vip" on public.tool_downloads;
create policy "tool_downloads_select_vip" on public.tool_downloads
    for select to authenticated
    using (
        tier = 'user'
        or (tier = 'vip' and public.is_vip())
    );

-- 管理员可以增删改
drop policy if exists "tool_downloads_admin_all" on public.tool_downloads;
create policy "tool_downloads_admin_all" on public.tool_downloads
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());


-- ------------------------------------------------------------
-- 5. 取下载链接的封装函数（前端只调这个）
-- ------------------------------------------------------------
-- 好处：
--   · 前端不用关心 RLS 细节
--   · 可以在这里统一做「没权限时返回什么」的逻辑
--   · 以后加「下载次数限制」「有效期」都在这里改
create or replace function public.get_download_url(p_tool_id bigint)
returns table (url text, tier text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    -- 未登录
    if auth.uid() is null then
        return;   -- 返回空，前端展示「请先登录」
    end if;

    return query
        select d.url, d.tier
        from public.tool_downloads d
        where d.tool_id = p_tool_id
          and (
              d.tier = 'user'
              or (d.tier = 'vip' and public.is_vip())
          )
        order by case d.tier when 'user' then 0 else 1 end
        limit 1;
end;
$$;

comment on function public.get_download_url(bigint) is
    '取指定工具的下载地址；VIP 专属链接只对有效 VIP 返回';


-- ------------------------------------------------------------
-- 6. 验证
-- ------------------------------------------------------------
-- 执行完可以用下面几条自检（会显示在结果区）：

-- 6.1 触发器存在？
select tgname as 触发器名, tgenabled as 状态
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and tgname = 'guard_vip_until_trg';

-- 6.2 函数存在？
select proname as 函数名
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin', 'is_vip', 'guard_vip_until', 'get_download_url')
order by proname;

-- 6.3 下载表策略
select polname as 策略名, polcmd as 操作
from pg_policy
where polrelid = 'public.tool_downloads'::regclass;
