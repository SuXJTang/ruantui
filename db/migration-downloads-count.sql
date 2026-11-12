-- ============================================================
-- 下载次数统计
-- ============================================================
-- 目标：记录每个工具被点击下载了多少次（全站累计，所有用户共享）
--
-- 设计：
--   · tools 表加 downloads 字段（bigint，默认 0）
--   · increment_tool_download() 原子递增，避免并发丢计数
--   · 只有真正点「下载」时才计数（查看详情不算）
--
-- 与 views 的区别：
--   views      = 打开详情的次数（看的人多少）
--   downloads  = 实际点下载的次数（用的人多少）
--   两者的比值能反映工具「看起来吸引人但下载转化低」这类问题
--
-- 在 Supabase SQL Editor 执行，可重复运行。
-- ============================================================

-- ------------------------------------------------------------
-- 1. tools 表加 downloads 字段
-- ------------------------------------------------------------
alter table public.tools
    add column if not exists downloads bigint not null default 0;

comment on column public.tools.downloads is '全站累计下载次数';

create index if not exists tools_downloads_idx on public.tools (downloads desc);


-- ------------------------------------------------------------
-- 2. 原子递增下载次数
-- ------------------------------------------------------------
-- 用 update ... returning 保证并发安全，
-- 不会像「先读再写」那样丢计数。
create or replace function public.increment_tool_download(tool_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    new_count bigint;
begin
    update public.tools
       set downloads = coalesce(downloads, 0) + 1
     where id = tool_id
    returning downloads into new_count;

    if new_count is null then
        return 0;   -- 工具不存在
    end if;

    return new_count;
end;
$$;

comment on function public.increment_tool_download(bigint) is
    '下载次数 +1 并返回新值（原子操作，并发安全）';


-- ------------------------------------------------------------
-- 3. 验证
-- ------------------------------------------------------------
select
    (select count(*) from information_schema.columns
      where table_schema='public' and table_name='tools' and column_name='downloads') as 字段数,
    (select count(*) from pg_proc
      where pronamespace='public'::regnamespace
        and proname='increment_tool_download') as 函数数,
    (select count(*) from public.tools where downloads > 0) as 有下载的工具数,
    (select sum(downloads) from public.tools) as 总下载次数;
