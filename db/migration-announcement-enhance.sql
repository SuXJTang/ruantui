-- ============================================================
-- 通知增强：优先级、显示方式、定时、可关闭
-- ============================================================
-- 目标：让公告不再「一刀切全显示」，管理员可以精细控制。
--
-- 新增字段：
--   priority     优先级   normal / important / urgent
--   display_mode 显示方式  list（只进通知列表）/ banner（顶部横幅）
--   starts_at    开始显示时间（null = 立即）
--   ends_at      结束显示时间（null = 永久）
--   dismissible  用户可否关闭横幅（紧急通知设为 false）
--
-- 向后兼容：已有公告默认 priority='normal', display_mode='banner',
--           dismissible=true, 时间字段为 null（立即显示、永久有效）
--
-- 在 Supabase SQL Editor 执行，可重复运行。
-- ============================================================

-- ------------------------------------------------------------
-- 1. announcements 表加字段
-- ------------------------------------------------------------
alter table public.announcements
    add column if not exists priority text not null default 'normal';
alter table public.announcements
    add column if not exists display_mode text not null default 'banner';
alter table public.announcements
    add column if not exists starts_at timestamptz;
alter table public.announcements
    add column if not exists ends_at timestamptz;
alter table public.announcements
    add column if not exists dismissible boolean not null default true;

-- 约束
alter table public.announcements drop constraint if exists announcements_priority_check;
alter table public.announcements
    add constraint announcements_priority_check
    check (priority in ('normal', 'important', 'urgent'));

alter table public.announcements drop constraint if exists announcements_display_mode_check;
alter table public.announcements
    add constraint announcements_display_mode_check
    check (display_mode in ('list', 'banner'));

comment on column public.announcements.priority is '优先级：normal=普通 important=重要 urgent=紧急';
comment on column public.announcements.display_mode is '显示方式：list=只进列表 banner=顶部横幅';
comment on column public.announcements.starts_at is '开始显示时间，null=立即';
comment on column public.announcements.ends_at is '结束显示时间，null=永久';
comment on column public.announcements.dismissible is '用户能否关闭横幅，紧急通知建议 false';

create index if not exists announcements_priority_idx on public.announcements (priority);
create index if not exists announcements_window_idx on public.announcements (starts_at, ends_at);


-- ------------------------------------------------------------
-- 2. 只返回「当前有效」的公告
-- ------------------------------------------------------------
-- 前端读公告时调用这个 view 而不是直接查表，
-- 自动过滤掉还没到时间 / 已过期的。
create or replace view public.active_announcements as
select
    id, title, content, type, priority, display_mode,
    starts_at, ends_at, dismissible, created_at, updated_at
from public.announcements
where active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
order by
    -- 紧急的排前面，其次是重要的
    case priority when 'urgent' then 0 when 'important' then 1 else 2 end,
    created_at desc;

comment on view public.active_announcements is
    '当前有效的公告（已过滤未开始/已过期），按优先级和时间排序';

-- view 需要能被匿名读（和原表同样的 RLS 语义）
grant select on public.active_announcements to anon, authenticated;


-- ------------------------------------------------------------
-- 3. 统计信息：给管理面板显示用
-- ------------------------------------------------------------
create or replace function public.announcement_stats()
returns table (
    total bigint,
    active_now bigint,
    scheduled bigint,
    expired bigint,
    urgent_active bigint
)
language sql
security definer
set search_path = public
stable
as $$
    select
        count(*) as total,
        count(*) filter (
            where active
              and (starts_at is null or starts_at <= now())
              and (ends_at is null or ends_at > now())
        ) as active_now,
        count(*) filter (where active and starts_at is not null and starts_at > now()) as scheduled,
        count(*) filter (where active and ends_at is not null and ends_at <= now()) as expired,
        count(*) filter (
            where active and priority = 'urgent'
              and (starts_at is null or starts_at <= now())
              and (ends_at is null or ends_at > now())
        ) as urgent_active
    from public.announcements;
$$;

comment on function public.announcement_stats() is '公告统计：总数/生效中/待发布/已过期/生效中的紧急通知';


-- ------------------------------------------------------------
-- 4. 验证
-- ------------------------------------------------------------
select
    (select count(*) from information_schema.columns
      where table_schema='public' and table_name='announcements'
        and column_name in ('priority','display_mode','starts_at','ends_at','dismissible')) as 新字段数,
    (select count(*) from information_schema.views
      where table_schema='public' and table_name='active_announcements') as view数,
    (select count(*) from public.announcements) as 公告总数,
    (select count(*) from public.active_announcements) as 当前生效;
