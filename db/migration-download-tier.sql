-- ============================================================
-- 下载权限控制
-- ============================================================
-- 目标：每个工具可以单独设置「谁能下载」
--
--   free  = 所有人（含游客）可下载           ← 默认
--   user  = 需要登录
--   vip   = 仅 VIP 可下载
--
-- 设计说明：
--   权限标记放在 tools 表（download_tier），因为它是工具的属性。
--   真实的 VIP 专属链接仍然放 tool_downloads（前端源码里看不到）。
--   这样一个工具可以：
--     · download 字段给普通链接（free/user 级）
--     · tool_downloads 里放 VIP 专属链接（vip 级）
--
-- 在 Supabase SQL Editor 执行，可重复运行。
-- ============================================================

-- ------------------------------------------------------------
-- 1. tools 表加 download_tier 字段
-- ------------------------------------------------------------
alter table public.tools
    add column if not exists download_tier text not null default 'free';

-- 加约束（用 if not exists 的等价写法：先删后建）
alter table public.tools drop constraint if exists tools_download_tier_check;
alter table public.tools
    add constraint tools_download_tier_check
    check (download_tier in ('free', 'user', 'vip'));

comment on column public.tools.download_tier is
    '下载权限：free=所有人可下，user=需登录，vip=仅 VIP';

-- 已有工具默认都是 free，不用改

create index if not exists tools_download_tier_idx on public.tools (download_tier);


-- ------------------------------------------------------------
-- 2. 统一判断「当前用户能否下载某工具」
-- ------------------------------------------------------------
-- 前端只调这个函数，不用自己拼逻辑。
-- 返回：
--   { can_download: bool, reason: text, url: text }
--   reason: 'ok' | 'need_login' | 'need_vip' | 'no_link'
create or replace function public.check_download(p_tool_id bigint)
returns table (can_download boolean, reason text, url text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    v_tier   text;
    v_url    text;
    v_vip_enabled boolean;
    v_is_vip boolean;
    v_logged boolean;
begin
    v_logged := auth.uid() is not null;
    v_is_vip := public.is_vip();

    -- 取工具的权限等级和公开下载地址
    select t.download_tier, t.download
      into v_tier, v_url
      from public.tools t
     where t.id = p_tool_id;

    if not found then
        return query select false, 'no_tool'::text, null::text;
        return;
    end if;

    -- 是否有 VIP 专属链接
    select exists (
        select 1 from public.tool_downloads d
         where d.tool_id = p_tool_id and d.tier = 'vip'
    ) into v_vip_enabled;

    -- 情况一：工具标为 vip
    if v_tier = 'vip' then
        if not v_logged then
            return query select false, 'need_login'::text, null::text;
        end if;
        if not v_is_vip then
            return query select false, 'need_vip'::text, null::text;
        end if;
        -- VIP 优先给专属链接，没有就用公开的
        select d.url into v_url
          from public.tool_downloads d
         where d.tool_id = p_tool_id and d.tier = 'vip'
         limit 1;
        if v_url is null then
            select t.download into v_url from public.tools t where t.id = p_tool_id;
        end if;
        if v_url is null then
            return query select false, 'no_link'::text, null::text;
        end if;
        return query select true, 'ok'::text, v_url;
        return;
    end if;

    -- 情况二：工具标为 user
    if v_tier = 'user' then
        if not v_logged then
            return query select false, 'need_login'::text, null::text;
        end if;
        select t.download into v_url from public.tools t where t.id = p_tool_id;
        if v_url is null then
            return query select false, 'no_link'::text, null::text;
        end if;
        return query select true, 'ok'::text, v_url;
        return;
    end if;

    -- 情况三：free —— 所有人可下
    select t.download into v_url from public.tools t where t.id = p_tool_id;
    if v_url is null or v_url = '' then
        return query select false, 'no_link'::text, null::text;
        return;
    end if;
    return query select true, 'ok'::text, v_url;
end;
$$;

comment on function public.check_download(bigint) is
    '判断当前用户能否下载指定工具，返回是否可下、原因、实际链接';


-- ------------------------------------------------------------
-- 3. 批量查询（列表页一次取全部，避免 N 次请求）
-- ------------------------------------------------------------
create or replace function public.list_download_access()
returns table (tool_id bigint, can_download boolean, reason text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    v_logged boolean;
    v_is_vip boolean;
begin
    v_logged := auth.uid() is not null;
    v_is_vip := public.is_vip();

    return query
    select t.id as tool_id,
           case
             when t.download_tier = 'free' then (t.download is not null and t.download <> '')
             when t.download_tier = 'user' then v_logged and (t.download is not null and t.download <> '')
             when t.download_tier = 'vip'  then v_logged and v_is_vip
             else false
           end as can_download,
           case
             when t.download_tier = 'vip' and not v_logged then 'need_login'
             when t.download_tier = 'vip' and not v_is_vip then 'need_vip'
             when t.download_tier = 'user' and not v_logged then 'need_login'
             when t.download_tier = 'vip' then 'ok'
             when t.download is null or t.download = '' then 'no_link'
             else 'ok'
           end as reason
      from public.tools t;
end;
$$;

comment on function public.list_download_access() is
    '一次性返回所有工具的下载权限（列表页用，避免逐条请求）';


-- ------------------------------------------------------------
-- 4. 验证
-- ------------------------------------------------------------
select
    (select count(*) from information_schema.columns
      where table_schema='public' and table_name='tools' and column_name='download_tier') as 字段数,
    (select count(*) from pg_proc
      where pronamespace='public'::regnamespace
        and proname in ('check_download','list_download_access')) as 函数数,
    (select count(*) from public.tools where download_tier='free') as free工具数,
    (select count(*) from public.tools where download_tier='vip') as vip工具数;
