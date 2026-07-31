// ============================================
// effects.js — 鼠标跟随光斑 + 卡片 spotlight
// 仅在桌面端 (pointer:fine) 且未开启「减弱动态效果」时启用
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

    document.addEventListener('mousemove', function(e) {
        tx = e.clientX; ty = e.clientY;
        if (!glow.classList.contains('on')) glow.classList.add('on');
        if (!raf) raf = requestAnimationFrame(tick);

        // 卡片 spotlight：为鼠标所在卡片设置光晕坐标
        var el = e.target;
        var card = el && el.closest ? el.closest('.tool-card') : null;
        if (card) {
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
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
