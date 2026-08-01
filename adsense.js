// ============================================
// adsense.js — Google AdSense 智能辅助 v3
// ============================================
var ADSENSE_CLIENT = 'ca-pub-1785974352610267';

(function() {
    // 检测广告拦截器
    function isAdBlocked() {
        return new Promise(function(resolve) {
            var test = document.createElement('div');
            test.className = 'adsbygoogle';
            test.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:1px;width:1px;';
            document.body.appendChild(test);
            // 广告拦截器通常会隐藏或移除这类元素
            var blocked = false;
            setTimeout(function() {
                blocked = test.offsetHeight === 0 && test.offsetParent === null;
                document.body.removeChild(test);
                resolve(blocked);
            }, 300);
        });
    }

    function hideAllAds() {
        var allAdBoxes = document.querySelectorAll('.ad-container');
        for (var k = 0; k < allAdBoxes.length; k++) {
            allAdBoxes[k].style.display = 'none';
        }
    }

    if (!ADSENSE_CLIENT) {
        hideAllAds();
        return;
    }

    // 检测广告拦截
    isAdBlocked().then(function(blocked) {
        if (blocked) {
            console.warn('Ad blocker detected, hiding ad containers');
            hideAllAds();
            return;
        }
        initAds();
    });

    function initAds() {
        // 标记所有广告容器（去除占位样式）
        var ads = document.querySelectorAll('.adsbygoogle');
        for (var i = 0; i < ads.length; i++) {
            var container = ads[i].closest('.ad-container');
            if (container) container.classList.add('ad-active');
        }

        // 使用 IntersectionObserver 懒加载广告 — 进入视口才初始化
        if ('IntersectionObserver' in window) {
            var adObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var ins = entry.target.querySelector('.adsbygoogle');
                        if (ins && !ins.dataset.adInitialized) {
                            ins.dataset.adInitialized = '1';
                            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
                        }
                        adObserver.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '200px' });
            document.querySelectorAll('.ad-container').forEach(function(c) { adObserver.observe(c); });
        } else {
            // 降级：直接初始化所有广告
            document.querySelectorAll('.adsbygoogle').forEach(function(ins) {
                if (!ins.dataset.adInitialized) {
                    ins.dataset.adInitialized = '1';
                    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
                }
            });
        }

        // 延迟检测广告是否真正渲染
        function checkAndHideEmpty() {
            var adContainers = document.querySelectorAll('.ad-container:not(.ad-inline)');
            for (var j = 0; j < adContainers.length; j++) {
                var box = adContainers[j];
                // 检查广告容器内是否有实际渲染的 iframe 或可见内容
                var hasContent = box.querySelector('iframe') ||
                    (box.textContent.trim().length > 3 && box.querySelector('.adsbygoogle') && box.querySelector('.adsbygoogle').offsetHeight > 20);
                if (!hasContent) {
                    box.style.display = 'none';
                }
            }
            // 内嵌广告：如果无内容也隐藏
            var inlineAds = document.querySelectorAll('.ad-inline');
            for (var k = 0; k < inlineAds.length; k++) {
                var ibox = inlineAds[k];
                var hasAd = ibox.querySelector('iframe') || ibox.querySelector('[data-ad-status]');
                if (!hasAd) {
                    ibox.style.display = 'none';
                }
            }
        }

        setTimeout(checkAndHideEmpty, 3000);
        setTimeout(checkAndHideEmpty, 9000);
    }
})();
