// ============================================
// effects.js — 卡片 spotlight + 轻微 3D 倾斜
// 仅在桌面端 (pointer:fine) 且未开启「减弱动态效果」时启用
// 性能注意：
//   - 不使用 mix-blend-mode（强制全页合成）
//   - spotlight 缓存卡片 rect，避免 mousemove 高频触发 reflow
//   - 鼠标跟随的大光斑（#cursorGlow）已移除：200px 橙光跟着光标跑，
//     不解释任何状态，纯装饰噪声
// ============================================
(function() {
    'use strict';
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ---------- 卡片 spotlight（rect 缓存，滚动/缩放时失效） ----------
    var hover = null; // { card, rect }
    function invalidateRects() { hover = null; }
    document.addEventListener('scroll', invalidateRects, { passive: true });
    window.addEventListener('resize', invalidateRects, { passive: true });

    document.addEventListener('mousemove', function(e) {
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
            // v7 图标视差：归一化到 -1 ~ 1，style.css 里按 -3px 反向位移
            card.style.setProperty('--dx', ((e.clientX - rect.left) / rect.width - 0.5) * 2);
            card.style.setProperty('--dy', ((e.clientY - rect.top) / rect.height - 0.5) * 2);
            var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6; // -3° ~ 3°
            var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
            card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
            card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        } else if (hover) {
            hover = null;
        }
    }, { passive: true });
})();
