// ============================================
// adsense.js — Google AdSense 辅助
// ============================================
var ADSENSE_CLIENT = 'ca-pub-1785974352610267';

(function() {
    if (!ADSENSE_CLIENT) return;
    // 有发布商 ID 时隐藏占位虚线框，广告由 inline push 自行初始化
    var ads = document.querySelectorAll('.adsbygoogle');
    for (var i = 0; i < ads.length; i++) {
        var container = ads[i].closest('.ad-container');
        if (container) container.classList.add('ad-active');
    }
})();
