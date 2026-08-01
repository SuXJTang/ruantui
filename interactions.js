// ============================================
// interactions.js — 页面互动特效 v2
//   1. 页面加载动画
//   2. 品牌标题打字机效果
//   3. 滚动进度条
//   4. 点击迸溅小色点
//   5. 品牌/头像 emoji 彩蛋
//   6. 视差滚动
// ============================================
(function() {
    'use strict';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- 0. 页面加载动画 ----------
    var loader = document.getElementById('pageLoader');
    if (loader) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                loader.classList.add('hidden');
                setTimeout(function() { loader.remove(); }, 600);
            }, 300);
        });
        // 超时兜底
        setTimeout(function() {
            if (loader && !loader.classList.contains('hidden')) {
                loader.classList.add('hidden');
                setTimeout(function() { if (loader) loader.remove(); }, 600);
            }
        }, 3000);
    }

    // ---------- 1. 品牌标题打字机效果 ----------
    if (!reduced) {
        var brandText = document.querySelector('.brand-text');
        if (brandText) {
            var original = brandText.textContent;
            brandText.textContent = '';
            brandText.classList.add('typing-cursor');
            var idx = 0;
            function typeNext() {
                if (idx < original.length) {
                    brandText.textContent = original.substring(0, idx + 1);
                    idx++;
                    setTimeout(typeNext, 150 + Math.random() * 80);
                } else {
                    setTimeout(function() {
                        brandText.classList.remove('typing-cursor');
                    }, 1500);
                }
            }
            setTimeout(typeNext, 500);
        }
    }

    // ---------- 2. 滚动进度条 ----------
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

    if (reduced) return;

    // ---------- 3. 点击迸溅小色点 ----------
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

    // ---------- 4. 品牌 / 头像 emoji 彩蛋 ----------
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

    // ---------- 5. 视差滚动 ----------
    var parallaxElements = document.querySelectorAll('[data-parallax]');
    var pTicking = false;
    function updateParallax() {
        pTicking = false;
        var scrollY = window.scrollY;
        parallaxElements.forEach(function(el) {
            var speed = parseFloat(el.dataset.parallax) || 0.3;
            el.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
        });
    }
    if (parallaxElements.length > 0) {
        window.addEventListener('scroll', function() {
            if (!pTicking) { pTicking = true; requestAnimationFrame(updateParallax); }
        }, { passive: true });
    }

    // 统一点击处理
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
