// ============================================
// particles.js — 暗色星空+极光+流星 / 亮色落花背景特效 v2
// ============================================
(function() {
    var container, mode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    var timer, auroraTimer;
    var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var STAR_COLORS = ['#ffffff', '#cfe8ff', '#fff7e0', '#e0f0ff'];

    function createStars() {
        var count = isCoarse ? 50 : 100;
        for (var i = 0; i < count; i++) {
            var s = document.createElement('div');
            s.className = 'star';
            var size = Math.random() < 0.75 ? 1 : (Math.random() < 0.6 ? 2 : 3);
            var x = Math.random() * 100;
            var y = Math.pow(Math.random(), 1.7) * 65;
            var color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
            var baseOpacity = (Math.random() * 0.5 + 0.35).toFixed(2);
            var twinkleDur = (Math.random() * 3 + 2).toFixed(2);
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
            if (size >= 2) {
                css.push('box-shadow:0 0 ' + (size * 2.5) + 'px ' + color);
            }
            s.style.cssText = css.join(';');
            container.appendChild(s);
        }
    }

    // 极光效果 — 暗色模式下缓慢移动的彩色光带
    function createAurora() {
        var aurora = document.createElement('div');
        aurora.className = 'aurora-band';
        aurora.style.cssText = [
            'position:absolute',
            'top:0',
            'left:-20%',
            'width:140%',
            'height:100%',
            'pointer-events:none',
            'opacity:0.35',
            'background:linear-gradient(120deg,',
            'transparent 0%,',
            'rgba(var(--primary-rgb),0.08) 20%,',
            'rgba(var(--accent-rgb),0.06) 40%,',
            'transparent 60%,',
            'rgba(var(--primary-rgb),0.04) 80%,',
            'transparent 100%)',
            ').repeat(0,0,100%,100%)',
            'animation:auroraDrift 20s ease-in-out infinite alternate',
            'filter:blur(40px)'
        ].join(';');
        container.appendChild(aurora);
    }

    function createContainer() {
        if (container) return;
        container = document.createElement('div');
        container.id = 'particles';
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
        document.body.prepend(container);
    }

    function shootingStar() {
        if (container.querySelectorAll('.shooting').length > 8) return;
        var star = document.createElement('div');
        star.className = 'shooting';
        var x = Math.random() * 80 + 10;
        var y = Math.random() * 50;
        var len = Math.random() * 80 + 60;
        var dur = Math.random() * 1.5 + 1;
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
        if (container.querySelectorAll('.petal').length > 30) return;
        var petal = document.createElement('div');
        petal.className = 'petal';
        var x = Math.random() * 95;
        var size = Math.random() * 6 + 4;
        var dur = Math.random() * 4 + 4;
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
            createStars();
            createAurora();
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
        '}',
        '@keyframes auroraDrift {',
        '  0% { transform:translateX(-5%) skewX(-5deg); }',
        '  100% { transform:translateX(5%) skewX(5deg); }',
        '}'
    ].join('');
    document.head.appendChild(style);

    startEffect();

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) stopEffect();
        else startEffect();
    });

    var observer = new MutationObserver(function() { startEffect(); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
})();
