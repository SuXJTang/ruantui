// ============================================
// particles.js — 暗色流星 / 亮色落花背景特效
// ============================================
(function() {
    var container, mode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    var timer;

    function createContainer() {
        if (container) return;
        container = document.createElement('div');
        container.id = 'particles';
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
        document.body.prepend(container);
    }

    function shootingStar() {
        var star = document.createElement('div');
        var x = Math.random() * 80 + 10; // 10-90% from left
        var y = Math.random() * 50; // 0-50% from top
        var len = Math.random() * 80 + 60; // 60-140px
        var dur = Math.random() * 1.5 + 1; // 1-2.5s
        var delay = Math.random() * 3;
        star.style.cssText = [
            'position:absolute',
            'left:' + x + '%',
            'top:' + y + '%',
            'width:' + len + 'px',
            'height:1.5px',
            'background:linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent)',
            'border-radius:1px',
            'transform:rotate(-25deg)',
            'opacity:0',
            'animation:shootingStar ' + dur + 's ease-in ' + delay + 's',
            'filter:blur(0.5px)'
        ].join(';');
        container.appendChild(star);
        setTimeout(function() { star.remove(); }, (dur + delay) * 1000 + 200);
    }

    function fallingPetal() {
        var petal = document.createElement('div');
        var x = Math.random() * 95;
        var size = Math.random() * 6 + 4; // 4-10px
        var dur = Math.random() * 4 + 4; // 4-8s
        var delay = Math.random() * 5;
        var colors = ['#f8bbd0','#e1bee7','#ffccbc','#ffe0b2','#ffcdd2','#f3e5f5','#ffebee'];
        var color = colors[Math.floor(Math.random() * colors.length)];
        petal.style.cssText = [
            'position:absolute',
            'left:' + x + '%',
            'top:-20px',
            'width:' + size + 'px',
            'height:' + (size * 1.4) + 'px',
            'background:' + color,
            'border-radius:50% 0 50% 50%',
            'opacity:' + (Math.random() * 0.4 + 0.2),
            'animation:petalFall ' + dur + 's linear ' + delay + 's',
            'transform:rotate(' + Math.random() * 360 + 'deg)'
        ].join(';');
        container.appendChild(petal);
        setTimeout(function() { petal.remove(); }, (dur + delay) * 1000 + 200);
    }

    function startEffect() {
        createContainer();
        stopEffect();
        mode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
        if (mode === 'dark') {
            timer = setInterval(function() {
                if (Math.random() < 0.3) shootingStar();
            }, 800);
        } else {
            timer = setInterval(function() {
                if (document.body.getAttribute('data-mode') === 'dark') return;
                fallingPetal();
            }, 400);
        }
    }

    function stopEffect() {
        if (timer) { clearInterval(timer); timer = null; }
        if (container) container.innerHTML = '';
    }

    // 注入动画关键帧
    var style = document.createElement('style');
    style.textContent = [
        '@keyframes shootingStar {',
        '  0% { opacity:0; transform:rotate(-25deg) translateX(0); }',
        '  5% { opacity:1; }',
        '  15% { opacity:1; }',
        '  100% { opacity:0; transform:rotate(-25deg) translateX(-300px); }',
        '}',
        '@keyframes petalFall {',
        '  0% { transform:translateY(0) rotate(0deg) translateX(0); opacity:0; }',
        '  10% { opacity:0.6; }',
        '  25% { transform:translateY(25vh) rotate(90deg) translateX(40px); }',
        '  50% { transform:translateY(50vh) rotate(180deg) translateX(-30px); }',
        '  75% { transform:translateY(75vh) rotate(270deg) translateX(20px); }',
        '  90% { opacity:0.3; }',
        '  100% { transform:translateY(105vh) rotate(360deg) translateX(0); opacity:0; }',
        '}'
    ].join('');
    document.head.appendChild(style);

    // 初始启动
    startEffect();

    // 监听主题切换
    var observer = new MutationObserver(function() { startEffect(); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
})();
