// ============================================
// interactions.js — 页面互动特效
//   1. 滚动进度条（顶部渐变进度）
//   2. 点击迸溅小色点（按钮/卡片/链接）
//   3. 品牌/头像 emoji 彩蛋
// 动画型互动尊重「减弱动态效果」偏好（进度条除外）
// ============================================
(function() {
    'use strict';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- 1. 滚动进度条 ----------
    var bar = document.createElement('div');
    bar.id = 'scrollProgress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function updateProgress() {
        ticking = false;
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? doc.scrollTop / max : 0) + ')';
    }
    window.addEventListener('scroll', function() {
        if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
    }, { passive: true });
    updateProgress();

    if (reduced) return; // 以下为动画型互动

    // ---------- 2. 点击迸溅小色点 ----------
    var DOT_COLORS = ['var(--primary)', 'var(--accent)', '#ffd166', '#06d6a0', '#ef476f'];
    function burst(x, y) {
        var n = 6;
        for (var i = 0; i < n; i++) {
            (function(i) {
                var dot = document.createElement('span');
                dot.className = 'burst-dot';
                var angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
                var dist = 16 + Math.random() * 24;
                var size = 5 + Math.random() * 4;
                dot.style.cssText = 'left:' + x + 'px;top:' + y + 'px;' +
                    'width:' + size + 'px;height:' + size + 'px;' +
                    '--bx:' + (Math.cos(angle) * dist).toFixed(1) + 'px;' +
                    '--by:' + (Math.sin(angle) * dist).toFixed(1) + 'px;' +
                    'background:' + DOT_COLORS[i % DOT_COLORS.length] + ';' +
                    'animation-duration:' + (0.45 + Math.random() * 0.25).toFixed(2) + 's';
                document.body.appendChild(dot);
                setTimeout(function() { dot.remove(); }, 1000);
            })(i);
        }
    }

    // ---------- 3. 品牌 / 头像 emoji 彩蛋 ----------
    var EGGS = ['🎉', '✨', '⭐', '🌈', '🔥', '💖', '🚀', '🧰'];
    function emojiBurst(x, y) {
        for (var i = 0; i < 8; i++) {
            (function(i) {
                var em = document.createElement('span');
                em.className = 'emoji-pop';
                em.textContent = EGGS[Math.floor(Math.random() * EGGS.length)];
                var angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.6;
                var dist = 30 + Math.random() * 40;
                em.style.cssText = 'left:' + x + 'px;top:' + y + 'px;' +
                    '--ex:' + (Math.cos(angle) * dist).toFixed(1) + 'px;' +
                    '--ey:' + (Math.sin(angle) * dist).toFixed(1) + 'px;' +
                    '--rot:' + (Math.random() * 90 - 45).toFixed(1) + 'deg;' +
                    'animation-duration:' + (0.6 + Math.random() * 0.4).toFixed(2) + 's';
                document.body.appendChild(em);
                setTimeout(function() { em.remove(); }, 1300);
            })(i);
        }
    }

    // 统一点击处理：彩蛋优先，其余可点元素迸溅
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('.brand-icon') || t.closest('.profile-avatar')) {
            emojiBurst(e.clientX, e.clientY);
        } else if (t.closest('button, a, .tool-card, select')) {
            burst(e.clientX, e.clientY);
        }
    }, { passive: true });
})();
