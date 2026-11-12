-- ============================================================
-- VIP 防护验证（极简版，只输出一行结论）
-- 复制整段执行，看「总体状态」这一列
-- ============================================================

select
    (select count(*) from pg_trigger
      where tgrelid = 'public.profiles'::regclass
        and tgname = 'guard_vip_until_trg' and tgenabled = 'O') as 触发器数,
    (select count(*) from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname in ('is_admin','is_vip','guard_vip_until','get_download_url')) as 函数数,
    (select count(*) from pg_policy
      where polrelid = 'public.tool_downloads'::regclass) as 下载表策略数,
    (select count(*) from pg_proc
      where proname = 'guard_vip_until'
        and prosrc like '%new.vip_until := old.vip_until%'
        and prosrc like '%is_admin()%') as 还原逻辑数,
    case
      when (select count(*) from pg_trigger where tgrelid='public.profiles'::regclass
              and tgname='guard_vip_until_trg' and tgenabled='O') = 1
       and (select count(*) from pg_proc where pronamespace='public'::regnamespace
              and proname in ('is_admin','is_vip','guard_vip_until','get_download_url')) = 4
       and (select count(*) from pg_proc where proname='guard_vip_until'
              and prosrc like '%new.vip_until := old.vip_until%'
              and prosrc like '%is_admin()%') = 1
      then '✅ 防护已生效，普通用户无法自己开 VIP'
      else '❌ 防护不完整，请检查上面几列哪个是 0'
    end as 总体状态;
