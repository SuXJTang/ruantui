// ============================================
// adsense.js — Google AdSense 智能辅助 v4
// ============================================
// 约定（全站唯一）：页面里每个 <ins class="adsbygoogle"> 只 push 一次，
// 且 push 只发生在本文件。index.html / ui.js 都不内联 push。
//
// 关于 async 加载器的队列语义：
//   adsbygoogle.js 不到位时 window.adsbygoogle 只是一个普通数组，
//   push() 仅把 {} 入队；库加载完成后会消费队首并填充「第一个未填充的 ins」。
//   这是 Google 官方支持的写法，所以 async 加载器本身没有问题。
//   真正的 bug 是「一次 push 配多个 ins」——本文件 v3 只 push 了 1 次，
//   却要填充顶/底/内嵌共 3+ 个广告位，其余 ins 永远空缺。
//   现在改为：每个未填充的 ins 各 push 一次。
var ADSENSE_CLIENT = 'ca-pub-1785974352610267';

(function() {
    // 兜底入口：ui.js 动态插入内嵌广告后调用此函数即可，不必自己 push。
    function adPush() {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) { /* 库已就绪时异常仅记录不抛出 */ }
    }
    window.adPush = adPush;

    function eachIns(fn) {
        var nodes = document.querySelectorAll('ins.adsbygoogle');
        for (var i = 0; i < nodes.length; i++) fn(nodes[i], i);
    }

    function fillIns(ins) {
        // 已 push 过的（通过 dataset 或 Google 自己打的 data-ad-status）一律跳过
        if (!ins || ins.dataset.adPushed || ins.getAttribute('data-ad-status')) return;
        ins.dataset.adPushed = '1';
        adPush();
    }

    // 等待 Google 库就绪（最多 waitMs）。库就绪后 push 会立即填充；
    // 未就绪时 push 只是入队，库到位后自动消费，因此超时也照常 push。
    function whenLoaded(cb, waitMs) {
        if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') { cb(); return; }
        var waited = 0;
        var timer = setInterval(function() {
            waited += 100;
            if (typeof window.adsbygoogle !== 'undefined' && typeof window.adsbygoogle.push === 'function') {
                clearInterval(timer); cb();
            } else if (waited >= (waitMs || 8000)) {
                clearInterval(timer); cb();
            }
        }, 100);
    }

    function hideAllAds() {
        var allAdBoxes = document.querySelectorAll('.ad-container');
        for (var k = 0; k < allAdBoxes.length; k++) {
            allAdBoxes[k].style.display = 'none';
        }
    }

    // 检测广告拦截器
    // 旧实现把探测元素做成 class="adsbygoogle" 再挂进 <body>，有两个问题：
    //   1) 它会被算作一个「未填充的 ins」，把一次 push 吞掉（错位填充）；
    //   2) 放行时残留的 .adsbygoogle 元素会让后面的查询选中幽灵节点。
    // 现在改为：调用 Google 自身的提示 API（广告拦截器普遍会 stub 掉它），
    // 不做任何 DOM 污染；拿不到结论就按「未被拦截」处理，交给后续的
    // checkAndHideBlank 在广告确实没出来时隐藏容器。
    function isAdBlocked() {
        return new Promise(function(resolve) {
            setTimeout(function() {
                var a = window.adsbygoogle;
                if (!a || typeof a.push !== 'function') {
                    // 加载器被拦截（fetch 失败），8s 后由 checkAndHideBlank 兜底隐藏
                    resolve(false);
                    return;
                }
                if (typeof a.getAdblockStatus === 'function') {
                    var blocked = false;
                    try {
                        a.getAdblockStatus(function(status) { blocked = (status === true); });
                    } catch (e) { blocked = false; }
                    resolve(blocked);
                    return;
                }
                resolve(false);
            }, 300);
        });
    }

    if (!ADSENSE_CLIENT) {
        hideAllAds();
        return;
    }

    isAdBlocked().then(function(blocked) {
        if (blocked) {
            console.warn('Ad blocker detected, hiding ad containers');
            hideAllAds();
            return;
        }
        initAds();
    });

    function markContainersActive() {
        eachIns(function(ins) {
            var container = ins.closest('.ad-container');
            if (container) container.classList.add('ad-active');
        });
    }

    function initAds() {
        markContainersActive();

        // 懒加载：ins 进入视口（前 200px）才 push，每个 ins 只 push 一次
        if ('IntersectionObserver' in window) {
            var adObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (!entry.isIntersecting) return;
                    var ins = entry.target.querySelector('ins.adsbygoogle') ||
                              (entry.target.matches && entry.target.matches('ins.adsbygoogle') ? entry.target : null);
                    if (ins) fillIns(ins);
                    adObserver.unobserve(entry.target);
                });
            }, { rootMargin: '200px' });

            var observedContainers = [];
            document.querySelectorAll('.ad-container').forEach(function(c) {
                adObserver.observe(c);
                observedContainers.push(c);
            });

            // ui.js 渲染时可能晚于本文件插入内嵌广告位：监听 DOM 自动接管，
            // 这样 ui.js 不需要写任何 push 逻辑。
            if ('MutationObserver' in window) {
                var mo = new MutationObserver(function(muts) {
                    var fresh = [];
                    muts.forEach(function(m) {
                        for (var i = 0; i < m.addedNodes.length; i++) {
                            var n = m.addedNodes[i];
                            if (n.nodeType !== 1) continue;
                            if (n.matches('.ad-container')) fresh.push(n);
                            else if (n.querySelectorAll) {
                                n.querySelectorAll('.ad-container').forEach(function(c) { fresh.push(c); });
                            }
                        }
                    });
                    fresh.forEach(function(c) {
                        if (observedContainers.indexOf(c) !== -1) return;
                        observedContainers.push(c);
                        adObserver.observe(c);
                    });
                });
                if (document.body) {
                    mo.observe(document.body, { childList: true, subtree: true });
                }
            }
        } else {
            // 降级：立即为每个 ins 各 push 一次
            eachIns(fillIns);
        }

        // 广告渲染完成后：空的容器要隐藏，不留空白
        function checkAndHideBlank() {
            var adContainers = document.querySelectorAll('.ad-container');
            for (var j = 0; j < adContainers.length; j++) {
                var box = adContainers[j];
                var ins = box.querySelector('ins.adsbygoogle');
                if (!ins) continue;
                var status = ins.getAttribute('data-ad-status');
                var filled = status === 'filled' || !!ins.querySelector('iframe');
                // unfilled 或既无状态也无 iframe = 没广告，隐藏；规则：ad-status 明确
                // 为 unfilled 直接隐藏，否则等到 9s 观察窗结束仍无 iframe 才隐藏
                if (!filled) box.style.display = 'none';
            }
        }

        setTimeout(markContainersActive, 1500);
        setTimeout(checkAndHideBlank, 9000);
    }
})();
