// ============================================
// particles.js — 暗色流星 / 亮色落花背景特效
// ============================================
(function() {
    var container, mode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    var timer;
    // 触屏设备性能较弱，降低生成频率
    var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    // 星星色温：纯白 / 淡蓝白 / 暖白 / 冰蓝，贴近真实星空
    var STAR_COLORS = ['#ffffff', '#cfe8ff', '#fff7e0', '#e0f0ff'];

    // 暗色模式：生成拟真静态星空（大小/亮度/色温随机，独立闪烁节奏）
    function createStars() {
        var count = isCoarse ? 40 : 80; // 桌面 80 颗，触屏 40 颗
        for (var i = 0; i < count; i++) {
            var s = document.createElement('div');
            s.className = 'star';
            // 尺寸：75% 概率 1px 小星，其余为 2-3px 亮星
            var size = Math.random() < 0.75 ? 1 : (Math.random() < 0.6 ? 2 : 3);
            // 位置：幂分布偏向顶部（上方密集、下方稀疏，模拟地平线大气散射）
            var x = Math.random() * 100;
            var y = Math.pow(Math.random(), 1.7) * 65;
            var color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
            var baseOpacity = (Math.random() * 0.5 + 0.35).toFixed(2); // 0.35-0.85
            var twinkleDur = (Math.random() * 3 + 2).toFixed(2);       // 2-5s 随机节奏
            var twinkleDelay = (Math.random() * 6).toFixed(2);
            var css = [
                'position:absolute',
                'left:' + x.toFixed(1) + '%',
                'top:' + y.toFixed(1) + '%',
                'width:' + size + 'px',
                'height:' + size + 'px',
                'background:' + color,
                'border-radius:50%',
                '--bo:' + baseOpacity,
                'opacity:' + baseOpacity,
                'animation:twinkle ' + twinkleDur + 's ease-in-out ' + twinkleDelay + 's infinite'
            ];
            // 亮星带柔和辉光，小星无光晕（更拟真且省性能）
            if (size >= 2) {
                css.push('box-shadow:0 0 ' + (size * 2.5) + 'px ' + color);
            }
            s.style.cssText = css.join(';');
            container.appendChild(s);
        }
    }

    function createContainer() {
        if (container) return;
        container = document.createElement('div');
        container.id = 'particles';
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
        document.body.prepend(container);
    }

    function shootingStar() {
        if (container.querySelectorAll('.shooting').length > 8) return; // 流星上限，防止堆积
        var star = document.createElement('div');
        star.className = 'shooting';
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
        if (container.querySelectorAll('.petal').length > 30) return; // 落花上限，防止堆积
        var petal = document.createElement('div');
        petal.className = 'petal';
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
        stopEffect();
        createContainer();
        mode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
        if (mode === 'dark') {
            createStars(); // 先铺静态星空
            timer = setInterval(function() {
                if (Math.random() < 0.3) shootingStar();
            }, isCoarse ? 1400 : 800);
        } else {
            timer = setInterval(function() {
                if (document.body.getAttribute('data-mode') === 'dark') return;
                fallingPetal();
            }, isCoarse ? 700 : 400);
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
        '@keyframes twinkle {',
        '  0%, 100% { opacity: var(--bo, .5); }',
        '  50% { opacity: .95; }',
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

    // 页面不可见时暂停特效，节省 CPU/电量
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) stopEffect();
        else startEffect();
    });

    // 监听主题切换
    var observer = new MutationObserver(function() { startEffect(); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
})();
