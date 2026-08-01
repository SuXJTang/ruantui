// ============================================
// adsense.js — Google AdSense 辅助
// ============================================
var ADSENSE_CLIENT = 'ca-pub-1785974352610267';

(function() {
    if (!ADSENSE_CLIENT) {
        // 无发布商 ID：直接移除所有广告容器
        var allAdBoxes = document.querySelectorAll('.ad-container');
        for (var k = 0; k < allAdBoxes.length; k++) {
            allAdBoxes[k].style.display = 'none';
        }
        return;
    }

    // 有发布商 ID：初始化时先隐藏占位虚线框
    var ads = document.querySelectorAll('.adsbygoogle');
    for (var i = 0; i < ads.length; i++) {
        var container = ads[i].closest('.ad-container');
        if (container) container.classList.add('ad-active');
    }

    // 延迟检测：广告是否真正渲染
    // Google AdSense 加载后会替换 ins 为 iframe；如果被拦截或无填充则留空
    function hideEmptyAds() {
        var adContainers = document.querySelectorAll('.ad-container');
        for (var j = 0; j < adContainers.length; j++) {
            var box = adContainers[j];
            var ins = box.querySelector('ins.adsbygoogle');
            if (!ins) continue;
            // 判断是否真正有广告内容：iframe 存在 或 内部有可见内容
            var hasAd = ins.querySelector('iframe') ||
                        (ins.textContent.trim().length > 0 && ins.offsetHeight > 5);
            if (!hasAd) {
                box.style.display = 'none';
            }
        }
    }

    // 2.5 秒后检测一次（广告通常 1-2 秒内加载完成）
    setTimeout(hideEmptyAds, 2500);
    // 8 秒后再兜底检测一次（慢网络或延迟填充场景）
    setTimeout(hideEmptyAds, 8000);
})();
