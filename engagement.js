// ============================================
// engagement.js — 用户互动：收藏 + 浏览历史 + 评分
// ============================================
(function() {
    'use strict';

    var FAV_KEY = 'ruantui_favorites';
    var HISTORY_KEY = 'ruantui_history';
    var RATING_KEY = 'ruantui_ratings';
    var MAX_HISTORY = 12;

    // ---------- 收藏管理 ----------
    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; }
    }
    function isFavorited(id) {
        return getFavorites().indexOf(id) >= 0;
    }
    function toggleFavorite(id) {
        var favs = getFavorites();
        var idx = favs.indexOf(id);
        if (idx >= 0) { favs.splice(idx, 1); showToast('已取消收藏', 'info'); }
        else { favs.push(id); showToast('已收藏 ❤', 'success'); }
        try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch(e) {}
        return idx < 0;
    }

    // ---------- 浏览历史 ----------
    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; }
    }
    function addToHistory(id) {
        var hist = getHistory().filter(function(x) { return x !== id; });
        hist.unshift(id);
        if (hist.length > MAX_HISTORY) hist = hist.slice(0, MAX_HISTORY);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch(e) {}
    }

    // ---------- 评分管理 ----------
    function getRatings() {
        try { return JSON.parse(localStorage.getItem(RATING_KEY) || '{}'); } catch(e) { return {}; }
    }
    function getUserRating(id) {
        return getRatings()[id] || 0;
    }
    function setUserRating(id, rating) {
        var ratings = getRatings();
        ratings[id] = rating;
        try { localStorage.setItem(RATING_KEY, JSON.stringify(ratings)); } catch(e) {}
    }

    // ---------- 渲染收藏按钮 ----------
    window.renderFavButton = function(toolId) {
        var fav = isFavorited(toolId);
        return '<button class="fav-btn ' + (fav ? 'active' : '') + '" data-fav-id="' + toolId + '" aria-label="' + (fav ? '取消收藏' : '收藏') + '" title="' + (fav ? '取消收藏' : '收藏') + '"><i class="' + (fav ? 'fas' : 'far') + ' fa-heart"></i></button>';
    };

    // ---------- 渲染评分星星 ----------
    window.renderRatingStars = function(toolId, avgRating) {
        var userR = getUserRating(toolId);
        var display = avgRating || userR || 0;
        var html = '<div class="rating-stars" data-rating-id="' + toolId + '">';
        for (var i = 1; i <= 5; i++) {
            html += '<i class="' + (i <= display ? 'fas' : 'far') + ' fa-star rating-star" data-star="' + i + '" data-rating-id="' + toolId + '"></i>';
        }
        html += '<span class="rating-num">' + (display > 0 ? display.toFixed(1) : '暂无') + '</span>';
        html += '</div>';
        return html;
    };

    // ---------- 在卡片上添加收藏按钮 ----------
    function injectFavButtons() {
        var cards = document.querySelectorAll('.tool-card:not(.fav-injected)');
        cards.forEach(function(card) {
            var id = parseInt(card.dataset.id);
            if (!id) return;
            card.classList.add('fav-injected');
            var favBtn = document.createElement('button');
            favBtn.className = 'card-fav-btn ' + (isFavorited(id) ? 'active' : '');
            favBtn.innerHTML = '<i class="' + (isFavorited(id) ? 'fas' : 'far') + ' fa-heart"></i>';
            favBtn.setAttribute('aria-label', isFavorited(id) ? '取消收藏' : '收藏');
            favBtn.dataset.favId = id;
            card.appendChild(favBtn);
        });
    }

    // 监听收藏点击
    document.addEventListener('click', function(e) {
        var favBtn = e.target.closest('.card-fav-btn, [data-fav-id]');
        if (!favBtn) return;
        e.stopPropagation();
        e.preventDefault();
        var id = parseInt(favBtn.dataset.favId);
        var nowFav = toggleFavorite(id);
        var icon = favBtn.querySelector('i');
        if (icon) {
            icon.className = nowFav ? 'fas fa-heart' : 'far fa-heart';
        }
        favBtn.classList.toggle('active', nowFav);
        // 心形飞溅动画
        if (nowFav) {
            var rect = favBtn.getBoundingClientRect();
            var heart = document.createElement('span');
            heart.textContent = '❤';
            heart.style.cssText = 'position:fixed;left:' + (rect.left + rect.width/2) + 'px;top:' + (rect.top + rect.height/2) + 'px;font-size:20px;color:#ef4444;pointer-events:none;z-index:10000;animation:heartFly .8s ease-out forwards;';
            document.body.appendChild(heart);
            setTimeout(function() { heart.remove(); }, 900);
        }
    });

    // ---------- 评分交互（在详情弹窗中） ----------
    document.addEventListener('click', function(e) {
        var star = e.target.closest('.rating-star');
        if (!star) return;
        e.stopPropagation();
        var id = parseInt(star.dataset.ratingId);
        var rating = parseInt(star.dataset.star);
        setUserRating(id, rating);
        showToast('已评分 ' + rating + ' 星 ⭐', 'success');
        // 更新星星显示
        var container = star.closest('.rating-stars');
        if (container) {
            var stars = container.querySelectorAll('.rating-star');
            stars.forEach(function(s, i) {
                s.className = (i < rating ? 'fas' : 'far') + ' fa-star rating-star';
            });
            var num = container.querySelector('.rating-num');
            if (num) num.textContent = rating.toFixed(1);
        }
    });

    // ---------- 添加收藏筛选标签 ----------
    function addFavoritesFilter() {
        var filterBar = document.querySelector('.filter-bar');
        if (!filterBar || filterBar.querySelector('[data-filter="__favorites__"]')) return;
        var favCount = getFavorites().length;
        var btn = document.createElement('button');
        btn.className = 'filter-tag filter-fav';
        btn.dataset.filter = '__favorites__';
        btn.innerHTML = '<span><i class="fas fa-heart" style="color:#ef4444;"></i> 收藏</span> <em class="filter-count">' + favCount + '</em>';
        filterBar.appendChild(btn);
    }

    // 处理收藏筛选
    var origRenderTools = window.renderTools;
    if (origRenderTools) {
        // 在 rebuildCategories 后注入收藏筛选
        var origRebuild = window.rebuildCategories;
        window.rebuildCategories = function() {
            if (origRebuild) origRebuild();
            addFavoritesFilter();
        };
    }

    // 在渲染工具时过滤收藏
    var _origFilter = window.renderTools;
    if (_origFilter) {
        var _wrapped = function(filter) {
            if (filter === '__favorites__') {
                var favs = getFavorites();
                var origTools = App.state.tools;
                App.state.tools = origTools.filter(function(t) { return favs.indexOf(t.id) >= 0; });
                _origFilter('all');
                App.state.tools = origTools;
                return;
            }
            _origFilter(filter);
        };
        window.renderTools = _wrapped;
    }

    // ---------- 详情弹窗：记录浏览历史 + 显示评分 ----------
    var origOpenModal = window.openModal;
    if (origOpenModal) {
        window.openModal = function(tool) {
            origOpenModal(tool);
            if (tool) {
                addToHistory(tool.id);
                // 在弹窗中注入评分区域
                setTimeout(function() {
                    var modalBody = document.getElementById('modalBody');
                    if (modalBody && !modalBody.querySelector('.rating-stars')) {
                        var tagsSection = modalBody.querySelector('.modal-section:last-of-type');
                        if (tagsSection) {
                            var ratingSection = document.createElement('div');
                            ratingSection.className = 'modal-section';
                            ratingSection.innerHTML = '<h4>我的评分</h4>' + window.renderRatingStars(tool.id, tool.rating);
                            tagsSection.parentNode.insertBefore(ratingSection, tagsSection.nextSibling);
                        }
                    }
                }, 50);
            }
        };
    }

    // ---------- 注入收藏按钮到卡片 ----------
    var observer = new MutationObserver(function() {
        injectFavButtons();
    });
    var toolGrid = document.getElementById('toolGrid');
    if (toolGrid) {
        observer.observe(toolGrid, { childList: true });
    }

    // 注入心形飞溅动画
    var style = document.createElement('style');
    style.textContent = '@keyframes heartFly{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-180%) scale(2);opacity:0}}';
    document.head.appendChild(style);

    // ---------- 收藏按钮 CSS ----------
    var favStyle = document.createElement('style');
    favStyle.textContent = [
        '.card-fav-btn{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(128,128,128,0.08);border:none;color:var(--text-light);font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .25s;z-index:3;opacity:0;}',
        '.tool-card:hover .card-fav-btn{opacity:1;}',
        '.card-fav-btn:hover{background:rgba(239,68,68,0.1);color:#ef4444;transform:scale(1.15);}',
        '.card-fav-btn.active{opacity:1;color:#ef4444;}',
        '.card-fav-btn.active i{animation:heartBeat .6s ease;}',
        '@keyframes heartBeat{0%,100%{transform:scale(1)}25%{transform:scale(1.3)}50%{transform:scale(.9)}75%{transform:scale(1.15)}}',
        '.rating-stars{display:flex;align-items:center;gap:4px;margin:8px 0;}',
        '.rating-star{cursor:pointer;font-size:16px;color:#d1d5db;transition:all .2s;}',
        '.rating-star:hover{transform:scale(1.2);}',
        '.rating-star.fas{color:#f5b800;}',
        '.rating-num{font-size:13px;color:var(--text-light);margin-left:4px;}',
        '.filter-fav .filter-count{color:#ef4444;}'
    ].join('');
    document.head.appendChild(favStyle);
})();
