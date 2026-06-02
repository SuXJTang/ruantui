// ============================================
// adsense.js — Google AdSense 广告初始化
// ============================================
var ADSENSE_CLIENT = 'ca-pub-1785974352610267';

(function() {
    window.adsbygoogle = window.adsbygoogle || [];

    function initAds() {
        var ads = document.querySelectorAll('.adsbygoogle');
        for (var i = 0; i < ads.length; i++) {
            if (!ads[i].dataset.adInitialized) {
                ads[i].dataset.adInitialized = '1';
                ads[i].setAttribute('data-ad-client', ADSENSE_CLIENT);
                window.adsbygoogle.push({});
                var container = ads[i].closest('.ad-container');
                if (container) container.classList.add('ad-active');
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAds);
    } else {
        initAds();
    }
})();
