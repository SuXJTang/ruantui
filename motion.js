// ============================================
// motion.js — 交互式与可视化动效（v6）
// ------------------------------------------------------------
// 设计原则：
//   1. 动效必须有信息量（数字滚动 = 看到规模，分布条 = 看到分类占比）
//   2. JS 失败绝不能影响可用性 —— 所有隐藏态都挂在 html.motion-on 上，
//      脚本没跑起来时页面保持完全可见
//   3. 移动端与 prefers-reduced-motion 一律降级：只保留点击涟漪
// ============================================
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(pointer: coarse)').matches;
    var root = document.documentElement;

    // ------------------------------------------------------------
    // 0. 点击涟漪 —— 最便宜、感知最强的反馈，全端保留
    // ------------------------------------------------------------
    var RIPPLE_SEL = '.filter-tag, .footer-btn, .header-btn, .tool-visit-btn, ' +
                     '.detail-btn, .share-reco, .sort-select, .mgmt-add-btn, .data-retry-btn';
    document.addEventListener('pointerdown', function (e) {
        var el = e.target.closest(RIPPLE_SEL);
        if (!el) return;
        var r = el.getBoundingClientRect();
        var d = Math.max(r.width, r.height) * 1.6;
        var s = document.createElement('span');
        s.className = 'ripple';
        s.style.width = s.style.height = d + 'px';
        s.style.left = (e.clientX - r.left - d / 2) + 'px';
        s.style.top = (e.clientY - r.top - d / 2) + 'px';
        el.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 620);
    }, { passive: true });

    // 减少动态效果时到此为止（涟漪是唯一保留的，且已被 CSS 削短）
    if (reduced) return;

    // 从这里开始给 <html> 打标记：CSS 里所有「先隐藏、再动画出现」的规则
    // 都挂在这个类下面，脚本没跑 / 报错时页面照常可见。
    root.classList.add('motion-on');

    // ------------------------------------------------------------
    // 1. 数字滚动：Hero 的工具数 / 分类数
    // ------------------------------------------------------------
    function countUp(el) {
        var target = parseInt(el.getAttribute('data-countup-target') || el.textContent, 10);
        if (isNaN(target) || target <= 0) return;
        el.setAttribute('data-countup-target', target);
        var dur = 900, t0 = performance.now();
        el.textContent = '0';
        function step(now) {
            var p = Math.min(1, (now - t0) / dur);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target;
        }
        requestAnimationFrame(step);
    }

    var countTargets = document.querySelectorAll('#totalCount, #categoryCount');
    if ('IntersectionObserver' in window && countTargets.length) {
        var cio = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                countUp(en.target);
                cio.unobserve(en.target);
            });
        }, { threshold: 0.4 });
        countTargets.forEach(function (el) { cio.observe(el); });
    } else {
        countTargets.forEach(countUp);
    }
    // 数据到达后重新数一次（首屏的数字初始是 0）
    var recountTimer = null;
    function scheduleRecount() {
        clearTimeout(recountTimer);
        recountTimer = setTimeout(function () {
            countTargets.forEach(function (el) {
                if (Number(el.textContent) > 0) countUp(el);
            });
            buildCatBar();
        }, 200);
    }

    // ------------------------------------------------------------
    // 2. 分类分布条（可视化）：一条堆叠色带，点击某段即筛选该类
    // ------------------------------------------------------------
    var CAT_HUES = [12, 32, 48, 162, 192, 212, 262, 292, 322, 342];
    function buildCatBar() {
        var bar = document.getElementById('catBar');
        if (!bar || bar.dataset.built === '1') return;
        var tools = (window.App && App.state && App.state.tools) || [];
        if (!tools.length) return;

        var order = [], map = {};
        tools.forEach(function (t) {
            var c = t.category || '其他';
            if (!map[c]) { map[c] = 0; order.push(c); }
            map[c]++;
        });
        var total = tools.length;

        bar.innerHTML = order.map(function (c, i) {
            var pct = (map[c] / total * 100);
            var hue = CAT_HUES[i % CAT_HUES.length];
            return '<button type="button" class="cat-seg" data-cat="' + escHTML(c) + '"' +
                ' style="flex:' + map[c] + ';--seg:' + hue + '"' +
                ' title="' + escHTML(c) + ' · ' + map[c] + ' 款（' + pct.toFixed(0) + '%）">' +
                '<span class="cat-seg-label">' + escHTML(c) + '</span>' +
                '</button>';
        }).join('');
        bar.dataset.built = '1';
        bar.classList.add('built');
    }

    document.addEventListener('click', function (e) {
        var seg = e.target.closest('.cat-seg');
        if (!seg) return;
        var cat = seg.getAttribute('data-cat');
        var tag = document.querySelector('.filter-tag[data-filter="' + cat + '"]');
        if (tag) {
            tag.click();
            tag.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    });

    // ------------------------------------------------------------
    // 3. 卡片进入视口时才播入场动画（长列表不会一次性播完）
    // ------------------------------------------------------------
    var cardIO = null;
    if ('IntersectionObserver' in window) {
        cardIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                en.target.classList.add('in-view');
                cardIO.unobserve(en.target);
            });
        }, { rootMargin: '0px 0px -30px 0px', threshold: 0.02 });
    }
    function watchCards() {
        var grid = document.getElementById('toolGrid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.tool-card:not(.in-view)');
        cards.forEach(function (c) { if (cardIO) cardIO.observe(c); else c.classList.add('in-view'); });
    }

    // ------------------------------------------------------------
    // 4. 顶栏滚动收缩
    // ------------------------------------------------------------
    var topbar = document.querySelector('.topbar');
    if (topbar) {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var y = window.pageYOffset;
                topbar.classList.toggle('compact', y > 90);
                ticking = false;
            });
        }, { passive: true });
    }

    // ------------------------------------------------------------
    // 5. Hero 光斑视差（桌面端，指针精细设备）
    // ------------------------------------------------------------
    var glow = document.querySelector('.profile-glow');
    if (glow && !isTouch) {
        var pticking = false;
        window.addEventListener('scroll', function () {
            if (pticking) return;
            pticking = true;
            requestAnimationFrame(function () {
                var y = Math.min(window.pageYOffset, 700);
                glow.style.transform = 'translate3d(0,' + (y * 0.14).toFixed(1) + 'px,0)';
                glow.style.opacity = String(Math.max(0.25, 1 - y / 900));
                pticking = false;
            });
        }, { passive: true });
    }

    // ------------------------------------------------------------
    // 6. 数据到达 / 列表重渲染后做一次收尾
    // ------------------------------------------------------------
    var grid = document.getElementById('toolGrid');
    if (grid && 'MutationObserver' in window) {
        var mo = new MutationObserver(function () {
            watchCards();
            scheduleRecount();
        });
        mo.observe(grid, { childList: true });
    }
    watchCards();
    // 首次数据加载完成（data.js 是异步的，轮询几次足够）
    var tries = 0;
    var poll = setInterval(function () {
        tries++;
        var tools = (window.App && App.state && App.state.tools) || [];
        if (tools.length) {
            buildCatBar();
            scheduleRecount();
            clearInterval(poll);
        } else if (tries > 40) {
            clearInterval(poll);
        }
    }, 250);
})();
