// ============================================
// theme.js — 5色主题 + 暗色模式 + 自动跟随系统 v2
// ============================================
var savedTheme = localStorage.getItem('colorTheme') || 'sunrise';
var savedMode = localStorage.getItem('colorMode') || 'auto';

// 自动模式：跟随系统暗色偏好
function getAutoMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMode(mode) {
    var actual = mode === 'auto' ? getAutoMode() : mode;
    if (actual === 'dark') document.body.setAttribute('data-mode', 'dark');
    else document.body.removeAttribute('data-mode');
    updateToggleIcon(actual);
}

function updateToggleIcon(actualMode) {
    var toggleBtn = document.querySelector('.theme-toggle');
    if (!toggleBtn) return;
    var icon = toggleBtn.querySelector('i');
    if (!icon) return;
    icon.className = actualMode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    toggleBtn.title = actualMode === 'dark' ? '切换到亮色' : '切换到暗色';
}

document.body.setAttribute('data-theme', savedTheme);
applyMode(savedMode);

var toggleBtn = document.querySelector('.theme-toggle');
if (toggleBtn) {
    toggleBtn.onclick = function() {
        var current = localStorage.getItem('colorMode') || 'auto';
        var actual = current === 'auto' ? getAutoMode() : current;
        // 循环：auto -> light -> dark -> auto
        if (current === 'auto') {
            localStorage.setItem('colorMode', 'light');
            applyMode('light');
            showToast('亮色模式', 'info');
        } else if (current === 'light') {
            localStorage.setItem('colorMode', 'dark');
            applyMode('dark');
            showToast('暗色模式', 'info');
        } else {
            localStorage.setItem('colorMode', 'auto');
            applyMode('auto');
            showToast('跟随系统', 'info');
        }
    };
}

// 监听系统暗色模式变化（仅 auto 模式下生效）
if (window.matchMedia) {
    var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
    var darkListener = function(e) {
        if ((localStorage.getItem('colorMode') || 'auto') === 'auto') {
            applyMode('auto');
        }
    };
    if (darkMQ.addEventListener) {
        darkMQ.addEventListener('change', darkListener);
    } else if (darkMQ.addListener) {
        darkMQ.addListener(darkListener);
    }
}

// 主题色切换
var swatches = document.querySelectorAll('.theme-swatch');
swatches.forEach(function(s) {
    s.onclick = function() {
        var target = this.getAttribute('data-target');
        swatches.forEach(function(el) { el.classList.remove('active'); el.setAttribute('aria-checked', 'false'); });
        this.classList.add('active'); this.setAttribute('aria-checked', 'true');
        document.body.setAttribute('data-theme', target); localStorage.setItem('colorTheme', target);
        // 主题切换波纹效果
        var ripple = document.createElement('div');
        ripple.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;background:radial-gradient(circle at center, rgba(var(--primary-rgb),0.15), transparent 70%);animation:themeRipple .6s ease-out forwards;';
        document.body.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
    };
    if (s.getAttribute('data-target') === savedTheme) { s.classList.add('active'); s.setAttribute('aria-checked', 'true'); }
});

// 注入主题切换波纹动画
var style = document.createElement('style');
style.textContent = '@keyframes themeRipple{0%{opacity:1;transform:scale(.5)}100%{opacity:0;transform:scale(2)}}';
document.head.appendChild(style);
