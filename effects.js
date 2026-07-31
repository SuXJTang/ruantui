// ============================================
// effects.js — 鼠标跟随光斑 + 卡片 spotlight
// 仅在桌面端 (pointer:fine) 且未开启「减弱动态效果」时启用
// 性能注意：
//   - 不使用 mix-blend-mode（强制全页合成）
//   - spotlight 缓存卡片 rect，避免 mousemove 高频触发 reflow
// ============================================
(function() {
    'use strict';
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ---------- 鼠标跟随光斑 ----------
    var glow = document.createElement('div');
    glow.id = 'cursorGlow';
    document.body.appendChild(glow);

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty, raf = null;

    // ---------- 卡片 spotlight（rect 缓存，滚动/缩放时失效） ----------
    var hover = null; // { card, rect }
    function invalidateRects() { hover = null; }
    document.addEventListener('scroll', invalidateRects, { passive: true });
    window.addEventListener('resize', invalidateRects, { passive: true });

    document.addEventListener('mousemove', function(e) {
        tx = e.clientX; ty = e.clientY;
        if (!glow.classList.contains('on')) glow.classList.add('on');
        if (!raf) raf = requestAnimationFrame(tick);

        // 卡片 spotlight + 3D 倾斜：为鼠标所在卡片设置坐标与角度
        var el = e.target;
        var card = el && el.closest ? el.closest('.tool-card') : null;
        if (card) {
            if (!hover || hover.card !== card) {
                hover = { card: card, rect: card.getBoundingClientRect() };
            }
            var rect = hover.rect;
            card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
            var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6; // -3° ~ 3°
            var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
            card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
            card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        } else if (hover) {
            hover = null;
        }
    }, { passive: true });

    function tick() {
        raf = null;
        cx += (tx - cx) * 0.14; // 缓动跟随
        cy += (ty - cy) * 0.14;
        if (Math.abs(tx - cx) < 0.5 && Math.abs(ty - cy) < 0.5) { cx = tx; cy = ty; }
        glow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
            raf = requestAnimationFrame(tick);
        }
    }

    document.addEventListener('mouseleave', function() { glow.classList.remove('on'); });
    document.addEventListener('mouseenter', function() { glow.classList.add('on'); });
})();
