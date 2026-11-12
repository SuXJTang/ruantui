-- ============================================================
-- VIP 权限防护验证（单条查询版）
-- Supabase SQL Editor 一次只显示最后一条语句的结果，
-- 所以这里用 UNION ALL 把 5 项检查合并成一张表。
-- ============================================================

with
-- 1. 触发器
t1 as (
    select '1.触发器' as 检查项,
           tgname as 详情,
           case tgenabled when 'O' then '已启用 ✓' when 'D' then '已禁用 ✗'
                else tgenabled::text end as 状态
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass and not tgisinternal
),
-- 2. 函数
t2 as (
    select '2.函数' as 检查项,
           proname as 详情,
           '存在 ✓' as 状态
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('is_admin','is_vip','guard_vip_until','get_download_url')
),
-- 3. 下载表策略
t3 as (
    select '3.下载表策略' as 检查项,
           polname as 详情,
           case polcmd when 'r' then 'SELECT' when 'a' then 'ALL'
                else polcmd::text end as 状态
    from pg_policy
    where polrelid = 'public.tool_downloads'::regclass
),
-- 4. 触发器逻辑
t4 as (
    select '4.触发器逻辑' as 检查项,
           'guard_vip_until' as 详情,
           case
             when prosrc like '%new.vip_until := old.vip_until%'
              and prosrc like '%is_admin()%'
             then '含静默还原 ✓'
             when prosrc like '%new.vip_until := old.vip_until%'
             then '有还原但缺管理员判断 ⚠'
             else '缺少还原逻辑 ✗'
           end as 状态
    from pg_proc where proname = 'guard_vip_until'
),
-- 5. profiles 的 RLS 策略
t5 as (
    select '5.profiles策略' as 检查项,
           polname as 详情,
           case polcmd when 'r' then 'SELECT' when 'a' then 'ALL'
                when 'w' then 'UPDATE' else polcmd::text end as 状态
    from pg_policy
    where polrelid = 'public.profiles'::regclass
)
select * from t1
union all select * from t2
union all select * from t3
union all select * from t4
union all select * from t5
order by 检查项, 详情;
