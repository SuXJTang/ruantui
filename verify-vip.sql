-- ============================================================
-- 验证脚本：确认 VIP 权限防护已生效
-- 在 Supabase SQL Editor 里执行，看结果
-- ============================================================

-- 1. 触发器是否存在
select '1. 触发器' as 检查项,
       tgname as 名称,
       case tgenabled when 'O' then '已启用' when 'D' then '已禁用' else tgenabled::text end as 状态
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and not tgisinternal;

-- 2. 相关函数是否存在
select '2. 函数' as 检查项, proname as 名称
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin', 'is_vip', 'guard_vip_until', 'get_download_url')
order by proname;

-- 3. tool_downloads 表与策略
select '3. 下载表策略' as 检查项, polname as 名称, polcmd as 操作
from pg_policy
where polrelid = 'public.tool_downloads'::regclass;

-- 4. 模拟「普通用户改 vip_until」的触发器行为
--    不依赖真实登录，直接看触发器函数体是否包含还原逻辑
select '4. 触发器逻辑' as 检查项,
       case
         when prosrc like '%new.vip_until := old.vip_until%' then '包含静默还原 ✓'
         else '缺少还原逻辑 ✗'
       end as 状态
from pg_proc
where proname = 'guard_vip_until';

-- 5. 当前用户列表与 VIP 状态
select '5. 用户' as 检查项, email, vip_until
from public.profiles
order by created_at;
