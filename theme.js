// ============================================
// theme.js — 5色主题 + 暗色模式
// ============================================
var savedTheme = localStorage.getItem('colorTheme') || 'sunrise';
var savedMode = localStorage.getItem('colorMode') || 'light';
document.body.setAttribute('data-theme', savedTheme);
if (savedMode === 'dark') document.body.setAttribute('data-mode', 'dark');

var toggleBtn = document.querySelector('.theme-toggle');
if (toggleBtn) {
    var icon = toggleBtn.querySelector('i');
    function updateIcon(dark) { icon.className = dark ? 'fas fa-sun' : 'fas fa-moon'; toggleBtn.title = dark ? '亮色' : '暗色'; }
    updateIcon(savedMode === 'dark');
    toggleBtn.onclick = function() {
        var isDark = document.body.getAttribute('data-mode') === 'dark';
        if (isDark) { document.body.removeAttribute('data-mode'); localStorage.setItem('colorMode', 'light'); updateIcon(false); }
        else { document.body.setAttribute('data-mode', 'dark'); localStorage.setItem('colorMode', 'dark'); updateIcon(true); }
    };
}

var swatches = document.querySelectorAll('.theme-swatch');
swatches.forEach(function(s) {
    s.onclick = function() {
        var target = this.getAttribute('data-target');
        swatches.forEach(function(el) { el.classList.remove('active'); el.setAttribute('aria-checked', 'false'); });
        this.classList.add('active'); this.setAttribute('aria-checked', 'true');
        document.body.setAttribute('data-theme', target); localStorage.setItem('colorTheme', target);
    };
    if (s.getAttribute('data-target') === savedTheme) { s.classList.add('active'); s.setAttribute('aria-checked', 'true'); }
});

if (!localStorage.getItem('colorMode') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.setAttribute('data-mode', 'dark'); localStorage.setItem('colorMode', 'dark');
    var ic = document.querySelector('.theme-toggle i'); if (ic) ic.className = 'fas fa-sun';
}
