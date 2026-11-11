// ============================================
// mobile.js — 移动端手势支持 + 安装提示优化
// ============================================
(function() {
    'use strict';

    // ---------- 模态框滑动关闭 ----------
    var overlays = document.querySelectorAll('.overlay');
    overlays.forEach(function(overlay) {
        var modal = overlay.querySelector('.modal');
        if (!modal) return;
        var startY = 0, currentY = 0, dragging = false;

        modal.addEventListener('touchstart', function(e) {
            // 仅在 modal 顶部区域触发
            var touch = e.touches[0];
            var rect = modal.getBoundingClientRect();
            if (touch.clientY - rect.top < 60) {
                startY = touch.clientY;
                dragging = true;
                modal.style.transition = 'none';
            }
        }, { passive: true });

        modal.addEventListener('touchmove', function(e) {
            if (!dragging) return;
            var touch = e.touches[0];
            currentY = touch.clientY - startY;
            if (currentY > 0) {
                modal.style.transform = 'translateY(' + currentY + 'px) scale(' + Math.max(0.9, 1 - currentY / 800) + ')';
                overlay.style.opacity = Math.max(0.2, 1 - currentY / 400);
            }
        }, { passive: true });

        modal.addEventListener('touchend', function() {
            if (!dragging) return;
            dragging = false;
            modal.style.transition = '';
            overlay.style.opacity = '';
            if (currentY > 100) {
                modal.style.transform = '';
                // 触发关闭
                var closeBtn = overlay.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
                else overlay.classList.remove('active');
            } else {
                modal.style.transform = '';
            }
            currentY = 0;
        }, { passive: true });
    });

    // ---------- 卡片长按预览 ----------
    var previewTimer = null;
    document.addEventListener('touchstart', function(e) {
        var card = e.target.closest('.tool-card');
        if (!card) return;
        previewTimer = setTimeout(function() {
            // 长按震动反馈（如果支持）
            if (navigator.vibrate) navigator.vibrate(30);
            card.style.transform = 'scale(0.97)';
            setTimeout(function() { card.style.transform = ''; }, 200);
        }, 500);
    }, { passive: true });

    document.addEventListener('touchend', function() {
        if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
    }, { passive: true });

    // ---------- 智能安装提示 ----------
    var deferredPrompt = null;
    var installBanner = null;

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        // 延迟 5 秒后显示安装提示（避免打扰）
        setTimeout(function() {
            if (!deferredPrompt || sessionStorage.getItem('installDismissed')) return;
            showInstallBanner();
        }, 5000);
    });

    function showInstallBanner() {
        if (installBanner) return;
        // 嵌入页脚区域，作为正常文档流元素参与排版。
        // 之前是 position:fixed + z-index:9998 悬浮在视口底部，会遮住卡片和页脚内容，
        // 在手机上尤其碍事。现在改为插入到站点容器末尾，跟随页面滚动。
        var host = document.querySelector('.container') || document.querySelector('footer.footer') || document.body;
        installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML =
            '<div class="install-banner-content">' +
            '<span class="install-banner-icon install-icon-brand">' + '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 64 64"> <defs> <radialGradient id="fBg-auth" cx="45%" cy="35%" r="75%"> <stop offset="0%" stop-color="#1e2a4d"/> <stop offset="100%" stop-color="#080d18"/> </radialGradient> <radialGradient id="fBall-auth" cx="34%" cy="28%" r="78%"> <stop offset="0%" stop-color="#a5e9ff"/> <stop offset="35%" stop-color="#38bdf8"/> <stop offset="75%" stop-color="#4f46e5"/> <stop offset="100%" stop-color="#312e81"/> </radialGradient> <linearGradient id="fRing-auth" x1="0" y1="0" x2="1" y2="1"> <stop offset="0%" stop-color="#a5f3fc"/> <stop offset="100%" stop-color="#67e8f9"/> </linearGradient> <filter id="fGlow-auth" x="-50%" y="-50%" width="200%" height="200%"> <feGaussianBlur stdDeviation="1.2" result="b"/> <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge> </filter> </defs> <rect width="64" height="64" rx="15" fill="url(#fBg-auth)"/> <!-- 球体：占比大，颜色亮 --> <circle cx="32" cy="32" r="19" fill="url(#fBall-auth)"/> <!-- 简化经纬线：只留 2 条，比原来粗 --> <g clip-path="url(#fClip-auth)" stroke="#bae6fd" fill="none" stroke-width="1.1" opacity="0.5"> <ellipse cx="32" cy="32" rx="19" ry="7"/> <ellipse cx="32" cy="32" rx="7" ry="19"/> </g> <clipPath id="fClip-auth"><circle cx="32" cy="32" r="19"/></clipPath> <!-- 高光 --> <ellipse cx="25" cy="24" rx="8" ry="5" fill="#fff" opacity="0.35" transform="rotate(-28 25 24)"/> <!-- 轨道环：粗，亮，清晰可见 --> <g filter="url(#fGlow-auth)" fill="none"> <ellipse cx="32" cy="32" rx="30" ry="9" stroke="url(#fRing-auth)" stroke-width="2.8" transform="rotate(-28 32 32)"/> <ellipse cx="32" cy="32" rx="26" ry="7.5" stroke="#c4b5fd" stroke-width="2" transform="rotate(48 32 32)" opacity="0.85"/> </g> <!-- 两个光点：大一点，16px 下能看见 --> <circle cx="59" cy="22" r="2.8" fill="#a5f3fc" filter="url(#fGlow-auth)"/> <circle cx="6" cy="43" r="2.4" fill="#c4b5fd" filter="url(#fGlow-auth)"/></svg>' + '</span>' +
            '<div class="install-banner-text"><strong>安装软推到桌面</strong><small>离线可用 · 随时访问</small></div>' +
            '<button class="install-banner-btn" id="installAccept">安装</button>' +
            '<button class="install-banner-close" id="installDismiss" aria-label="关闭"><i class="fas fa-times"></i></button>' +
            '</div>';

        // 若插到 .container 内，则追加到尾部；否则插到 footer 之前
        if (host.classList && host.classList.contains('container')) {
            host.appendChild(installBanner);
        } else if (host.parentNode) {
            host.parentNode.insertBefore(installBanner, host);
        } else {
            document.body.appendChild(installBanner);
        }

        requestAnimationFrame(function() { installBanner.classList.add('show'); });

        document.getElementById('installAccept').onclick = function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(r) {
                    deferredPrompt = null;
                    hideBanner();
                    if (r.outcome === 'accepted') showToast('安装成功 🎉', 'success');
                });
            }
        };
        document.getElementById('installDismiss').onclick = function() {
            sessionStorage.setItem('installDismissed', '1');
            hideBanner();
        };
    }

    function hideBanner() {
        if (!installBanner) return;
        installBanner.classList.remove('show');
        setTimeout(function() { if (installBanner) { installBanner.remove(); installBanner = null; } }, 300);
    }

    // ---------- 离线状态检测 ----------
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            showToast('已离线 — 显示缓存内容', 'info');
        }
    }
    window.addEventListener('offline', updateOnlineStatus);

    // ---------- 注入移动端样式 ----------
    var style = document.createElement('style');
    style.textContent = [
        // 安装提示条：嵌入页面文档流（不悬浮、不遮挡内容）
        '.install-banner{margin:24px auto 8px;width:100%;max-width:460px;background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);overflow:hidden;opacity:0;transform:translateY(-8px);transition:opacity .35s ease,transform .35s ease;}',
        '.install-banner.show{opacity:1;transform:translateY(0);}',
        '.install-banner-content{display:flex;align-items:center;gap:12px;padding:12px 16px;}',
        '.install-banner-icon{font-size:28px;}',
        '.install-banner-text{flex:1;}',
        '.install-banner-text strong{display:block;font-size:14px;font-weight:700;}',
        '.install-banner-text small{display:block;font-size:11px;color:var(--text-light);}',
        '.install-banner-btn{padding:8px 20px;border-radius:999px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;}',
        '.install-banner-close{width:28px;height:28px;border-radius:50%;background:rgba(128,128,128,.08);border:none;color:var(--text-light);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
        '@media(max-width:768px){.tool-card{-webkit-tap-highlight-color:transparent;}}'
    ].join('');
    document.head.appendChild(style);
})();
