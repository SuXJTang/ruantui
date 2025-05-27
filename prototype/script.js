// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 防抖函数
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // 节流函数
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const context = this;
            const args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 添加淡入动画类，使用批处理减少重排重绘
    const fadeElements = document.querySelectorAll('.software-card, .category-card, .testimonial-card, .ranking-item');
    // 使用requestAnimationFrame批量处理DOM操作
    requestAnimationFrame(() => {
        fadeElements.forEach((el, index) => {
            el.classList.add('fade-in');
            el.classList.add(`delay-${index % 4 + 1}`);
        });
    });

    // 顶部导航栏滚动效果
    const header = document.querySelector('.header');
    let lastScrollPosition = 0;
    
    // 使用节流函数减少滚动事件的处理频率
    window.addEventListener('scroll', throttle(function() {
        const currentScroll = window.pageYOffset;
        
        // 返回顶部按钮显示/隐藏
        const backToTopBtn = document.querySelector('.back-to-top');
        if (backToTopBtn) {
            if (currentScroll > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }
        
        // 导航栏滚动效果
        if (currentScroll > 100) {
            // 使用CSS变量提高性能
            header.style.boxShadow = 'var(--shadow-md)';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.boxShadow = 'var(--shadow-sm)';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        }
        
        lastScrollPosition = currentScroll;
    }, 100));

    // 返回顶部按钮功能
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopBtn.setAttribute('aria-label', '返回顶部');
    document.body.appendChild(backToTopBtn);
    
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // 主题切换功能
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        // 检查本地存储中的主题偏好
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
            const icon = themeToggle.querySelector('i');
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', currentTheme);
            
            // 保存主题偏好到本地存储
            localStorage.setItem('theme', currentTheme);
            
            // 更新图标
            const icon = themeToggle.querySelector('i');
            icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    // 筛选按钮效果
    const filterBtn = document.querySelector('.filter-btn');
    const resetBtn = document.querySelector('.reset-btn');
    const filterSelects = document.querySelectorAll('.filter-select');
    
    if (filterBtn && resetBtn) {
        filterBtn.addEventListener('click', function() {
            // 添加筛选动画
            const softwareCards = document.querySelectorAll('.software-card');
            
            // 模拟筛选逻辑 - 在实际应用中替换为真实数据筛选
            const selectedCategory = document.getElementById('category-filter').value;
            const selectedRating = document.getElementById('rating-filter').value;
            const selectedDownloads = document.getElementById('downloads-filter').value;
            
            console.log('筛选条件:', {类别: selectedCategory, 评分: selectedRating, 下载量: selectedDownloads});
            
            // 批处理DOM更新
            requestAnimationFrame(() => {
                softwareCards.forEach(card => {
                    card.classList.add('fade-in');
                    setTimeout(() => card.classList.remove('fade-in'), 600);
                });
            });
        });
        
        resetBtn.addEventListener('click', function() {
            // 重置所有选择器
            filterSelects.forEach(select => {
                select.selectedIndex = 0;
            });
            
            // 重置动画
            const softwareCards = document.querySelectorAll('.software-card');
            requestAnimationFrame(() => {
                softwareCards.forEach(card => {
                    card.classList.add('fade-in');
                    setTimeout(() => card.classList.remove('fade-in'), 600);
                });
            });
        });
    }

    // 搜索建议功能
    const searchInputs = document.querySelectorAll('.search-box input, .search-large input');
    const suggestions = [
        '设计软件', '办公软件', '开发工具', '视频编辑', '音乐制作',
        'Adobe Photoshop', 'Microsoft Office', 'Visual Studio Code', 'Final Cut Pro', 'Ableton Live'
    ];
    
    // 创建搜索建议容器
    const createSuggestionBox = (input) => {
        const suggestionBox = document.createElement('div');
        suggestionBox.className = 'suggestions-box';
        suggestionBox.style.display = 'none';
        input.parentNode.appendChild(suggestionBox);
        return suggestionBox;
    };
    
    searchInputs.forEach(input => {
        const suggestionBox = createSuggestionBox(input);
        
        input.addEventListener('focus', function() {
            // 模拟搜索聚焦效果
            this.setAttribute('placeholder', '输入关键词搜索...');
        });
        
        input.addEventListener('blur', function() {
            // 延迟隐藏建议框，让用户有时间点击建议
            setTimeout(() => {
                suggestionBox.style.display = 'none';
            }, 200);
            
            // 恢复原始占位符
            if (this.parentNode.classList.contains('search-large')) {
                this.setAttribute('placeholder', '试试搜索「设计软件」或「办公工具」...');
            } else {
                this.setAttribute('placeholder', '搜索软件...');
            }
        });
        
        // 使用防抖减少输入事件处理次数
        input.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            
            if (query.length < 2) {
                suggestionBox.style.display = 'none';
                return;
            }
            
            // 过滤搜索建议
            const matchedSuggestions = suggestions.filter(suggestion => 
                suggestion.toLowerCase().includes(query)
            );
            
            if (matchedSuggestions.length > 0) {
                // 清空并填充建议
                suggestionBox.innerHTML = '';
                matchedSuggestions.forEach(suggestion => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.textContent = suggestion;
                    item.addEventListener('click', () => {
                        input.value = suggestion;
                        suggestionBox.style.display = 'none';
                    });
                    suggestionBox.appendChild(item);
                });
                suggestionBox.style.display = 'block';
            } else {
                suggestionBox.style.display = 'none';
            }
        }, 300));
    });

    // 平滑滚动效果
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 图片懒加载
    const lazyLoadImages = () => {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.onload = () => img.classList.add('loaded');
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '0px 0px 200px 0px' // 提前200px加载
            });
            
            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // 回退方案
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.onload = () => img.classList.add('loaded');
                img.removeAttribute('data-src');
            });
        }
    };
    
    lazyLoadImages();

    // 鼠标悬停视差效果 - 使用RAF优化性能
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('mousemove', throttle(function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;
            
            requestAnimationFrame(() => {
                this.style.transform = `perspective(1000px) rotateY(${deltaX * 5}deg) rotateX(${-deltaY * 5}deg) translateY(-15px)`;
            });
        }, 50));
        
        card.addEventListener('mouseleave', function() {
            requestAnimationFrame(() => {
                this.style.transform = '';
            });
        });
    });
    
    // 添加注册表单验证
    const signupForm = document.querySelector('.signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            // 简单的邮箱验证
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!email || !emailPattern.test(email)) {
                // 显示错误
                if (!this.querySelector('.error-message')) {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = '请输入有效的邮箱地址';
                    this.appendChild(errorMessage);
                }
            } else {
                // 清除错误（如果有）
                const errorMessage = this.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
                
                // 显示成功消息
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = '注册成功！感谢您的订阅';
                this.innerHTML = '';
                this.appendChild(successMessage);
            }
        });
    }
    
    // 检测用户系统主题偏好并应用
    function detectPreferredTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
            const icon = document.querySelector('.theme-toggle i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }
    
    // 只有当用户未设定主题时才检测系统偏好
    if (!localStorage.getItem('theme')) {
        detectPreferredTheme();
    }
    
    // 移动导航菜单功能
    const navToggle = document.getElementById('nav-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (navToggle && mobileNav) {
        navToggle.addEventListener('click', function() {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            this.classList.toggle('open');
            mobileNav.classList.toggle('open');
            
            // 阻止滚动
            document.body.style.overflow = !expanded ? 'hidden' : '';
        });
        
        // 点击移动导航链接时关闭菜单
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.classList.remove('open');
                mobileNav.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
        
        // 点击外部关闭导航菜单
        document.addEventListener('click', function(event) {
            if (!mobileNav.contains(event.target) && !navToggle.contains(event.target) && mobileNav.classList.contains('open')) {
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.classList.remove('open');
                mobileNav.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }
    
    // 通知消息系统
    const toastContainer = document.getElementById('toast-container');
    
    // 创建通知消息
    window.showToast = function(message, type = 'info', duration = 3000) {
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close" aria-label="关闭通知">&times;</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // 使用requestAnimationFrame确保DOM添加后再添加动画
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
            });
        });
        
        // 添加关闭按钮功能
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeToast(toast);
            });
        }
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => closeToast(toast), duration);
        }
        
        // 关闭通知的函数
        function closeToast(toastElement) {
            toastElement.style.transform = 'translateX(100%)';
            toastElement.style.opacity = '0';
            
            // 动画完成后移除元素
            setTimeout(() => {
                if (toastElement.parentNode === toastContainer) {
                    toastContainer.removeChild(toastElement);
                }
            }, 300);
        }
        
        // 返回通知元素，以便外部控制
        return toast;
    };
    
    // 为所有查看详情按钮添加演示功能
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const softwareName = this.closest('.software-card').querySelector('h3').textContent;
            window.showToast(`正在查看 ${softwareName} 的详细信息`, 'info');
        });
    });
    
    // 为分类卡片添加点击事件
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            window.showToast(`正在浏览 ${categoryName} 分类`, 'info');
        });
    });
    
    // 为排行榜项目添加点击事件
    document.querySelectorAll('.ranking-item').forEach(item => {
        item.addEventListener('click', function() {
            const softwareName = this.querySelector('h3').textContent;
            window.showToast(`正在查看 ${softwareName} 的详细信息`, 'info');
            
            // 添加点击效果
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 300);
        });
    });
    
    // 辅助功能支持
    // 为标签添加键盘交互
    document.querySelectorAll('.popular-tags span').forEach(tag => {
        tag.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const tagText = this.textContent;
                window.showToast(`正在搜索 ${tagText}`, 'info');
                
                // 将标签文本填入搜索框
                const searchInput = document.querySelector('.search-large input');
                if (searchInput) {
                    searchInput.value = tagText;
                    searchInput.focus();
                }
            }
        });
        
        tag.addEventListener('click', function() {
            const tagText = this.textContent;
            window.showToast(`正在搜索 ${tagText}`, 'info');
            
            // 将标签文本填入搜索框
            const searchInput = document.querySelector('.search-large input');
            if (searchInput) {
                searchInput.value = tagText;
                searchInput.focus();
            }
        });
    });
    
    // 添加性能监控
    if (window.PerformanceObserver && 'renderTime' in PerformanceEntry.prototype) {
        const perfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                console.log(`[性能] ${entry.name}: ${entry.renderTime}`);
            }
        });
        perfObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    }

    // 底部移动导航栏功能
    const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav-item');
    if (bottomNavItems.length > 0) {
        bottomNavItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // 阻止默认行为，以便我们可以控制导航
                e.preventDefault();
                
                // 移除所有项目的活动状态
                bottomNavItems.forEach(navItem => navItem.classList.remove('active'));
                
                // 将当前点击的项目设置为活动状态
                this.classList.add('active');
                
                // 获取导航项的目标（根据图标或文本判断）
                const navText = this.querySelector('span').textContent.trim();
                
                // 显示通知
                window.showToast(`正在切换到${navText}`, 'info', 1500);
                
                // 这里可以添加实际导航逻辑
                // 例如：window.location.href = this.getAttribute('href');
            });
        });
    }
}); 