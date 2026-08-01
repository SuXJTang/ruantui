// ============================================
// data.js — 工具/公告数据加载（Supabase 优先 → localStorage 缓存 → 本地兜底）
// ============================================

// 本地兜底数据 — Supabase 不可用时使用
var FALLBACK_TOOLS = [
    // ===== 开发工具 =====
    {id:1, name:'VS Code', category:'开发工具', slug:'visualstudiocode', color:'#007ACC', comment:'宇宙最强编辑器，插件生态无敌', detail:'微软出品的免费开源代码编辑器，支持几乎所有编程语言。智能补全、调试、Git集成、终端一体化，插件市场拥有数万款扩展。无论是前端、后端还是数据科学，VS Code 都能胜任。轻量级启动速度快，但通过插件可以变得非常强大。', tags:['日常必备','免费','跨平台'], url:'https://code.visualstudio.com', views:1280, pinned:true},
    {id:2, name:'GitHub', category:'开发工具', slug:'github', color:'#181717', comment:'全球最大代码托管平台，开发者社交中心', detail:'微软旗下的代码托管平台，支持 Git 版本控制、Pull Request 协作、CI/CD（GitHub Actions）、项目管理、安全扫描等。免费版支持无限私有仓库，Pages 功能可托管静态网站。开源项目聚集地，是开发者必备的社交和协作平台。', tags:['日常必备','免费','协作'], url:'https://github.com', views:980},
    {id:3, name:'Docker', category:'开发工具', slug:'docker', color:'#2496ED', comment:'容器化部署利器，环境一致性保障', detail:'将应用及其依赖打包到轻量级容器中，实现「一次构建，到处运行」。解决环境配置地狱，简化部署流程。Docker Hub 拥有海量官方镜像，docker-compose 支持多容器编排。开发、测试、生产环境完全一致。', tags:['部署','免费','运维'], url:'https://docker.com', views:720},
    {id:4, name:'Postman', category:'开发工具', slug:'postman', color:'#FF6C37', comment:'API 开发测试神器，团队协作友好', detail:'API 开发协作平台，支持请求构建、环境变量、测试脚本、Mock Server、文档生成。Collections 功能可以组织和管理所有 API 请求，支持导入 OpenAPI/Swagger 规范。团队工作区支持共享和协作。', tags:['API','免费','测试'], url:'https://postman.com', views:560},
    {id:5, name:'JetBrains Toolbox', category:'开发工具', slug:'jetbrains', color:'#000000', comment:'IDE 全家桶管理器，一站式安装更新', detail:'JetBrains 全系列 IDE 的管理工具，包括 IntelliJ IDEA、PyCharm、WebStorm、GoLand 等。一键安装、更新、回滚，支持多版本并存。每个 IDE 都有社区版（免费）和旗舰版（付费）。智能补全和重构功能业界最强。', tags:['IDE','付费','跨平台'], url:'https://jetbrains.com/toolbox-app', views:480},
    {id:6, name:'Warp', category:'开发工具', slug:'warpdotdev', color:'#01A4FF', comment:'下一代终端，AI 加持的命令行体验', detail:'Rust 编写的现代化终端，支持 AI 命令建议、命令块分组、工作流自动化。原生 GPU 渲染，速度快如闪电。支持 SSH 远程连接、团队共享工作流。免费版功能足够日常使用，Pro 版增加 AI 和团队功能。', tags:['终端','AI','免费'], url:'https://warp.dev', views:340},
    {id:7, name:'Cursor', category:'开发工具', slug:'cursor', color:'#000000', comment:'AI 驱动的代码编辑器，ChatGPT 深度集成', detail:'基于 VS Code fork 的 AI 代码编辑器，深度集成 Claude、GPT-4 等大模型。支持自然语言编程、代码库问答、多文件编辑、AI 代码审查。免费版每天有额度限制，Pro 版无限使用。是目前最火的 AI 编程工具之一。', tags:['AI','编辑器','免费'], url:'https://cursor.sh', views:890, pinned:true},
    {id:8, name:'Tabnine', category:'开发工具', slug:'tabnine', color:'#6F42C1', comment:'AI 代码补全，隐私优先', detail:'AI 代码补全工具，支持本地模型运行，代码不上传云端。支持 VS Code、JetBrains 等主流编辑器。免费版提供基础补全，Pro 版提供整行、整函数补全。特别适合对代码隐私有要求的团队。', tags:['AI','补全','隐私'], url:'https://tabnine.com', views:290},

    // ===== AI 工具 =====
    {id:9, name:'ChatGPT', category:'AI工具', slug:'openai', color:'#10A37F', comment:'改变世界的 AI 对话助手', detail:'OpenAI 开发的对话式 AI，支持文本生成、代码编写、翻译、分析、创意写作等。GPT-4 模型支持多模态（图片、文件、语音）。免费版使用 GPT-4o mini，Plus 版每月 $20 使用 GPT-4o。API 可集成到自己的应用中。', tags:['AI','日常必备','付费'], url:'https://chat.openai.com', views:2100, pinned:true},
    {id:10, name:'Claude', category:'AI工具', slug:'anthropic', color:'#D97757', comment:'最强推理能力，超长上下文窗口', detail:'Anthropic 开发的 AI 助手，以推理能力和安全性著称。Claude 3.5 Sonnet 在编码、分析、写作方面表现卓越。支持 200K token 超长上下文，可处理整本书或大型代码库。免费版有日限额，Pro 版每月 $20。', tags:['AI','推理','长文本'], url:'https://claude.ai', views:1680},
    {id:11, name:'DeepSeek', category:'AI工具', slug:'deepseek', color:'#4D6BFE', comment:'国产 AI 骄傲，性价比之王', detail:'深度求索开发的 AI 大模型，DeepSeek-V3 和 R1 模型在数学、编码方面表现优异。API 价格仅为 GPT-4 的 1/10，性价比极高。开源模型可本地部署。支持联网搜索、深度思考模式。国内直连无需梯子。', tags:['AI','国产','免费'], url:'https://deepseek.com', views:1450},
    {id:12, name:'Midjourney', category:'AI工具', slug:'midjourney', color:'#4B4747', comment:'AI 绘画天花板，艺术品质惊人', detail:'AI 图像生成领域的领导者，以艺术品质和美学理解著称。通过 Discord 或网页界面使用，支持文生图、图生图、风格融合、局部重绘。基础版每月 $10（约200张图），支持商业使用。V6 模型照片级真实感惊人。', tags:['AI','绘画','付费'], url:'https://midjourney.com', views:1320},
    {id:13, name:'Stable Diffusion', category:'AI工具', slug:'stabilityai', color:'#9B51E0', comment:'开源 AI 绘画，本地部署无限出图', detail:'开源的 AI 图像生成模型，可本地部署、无限出图、完全免费。支持 LoRA 微调、ControlNet 精确控制、图生图、局部重绘。Automatic1111 和 ComfyUI 是最流行的前端界面。需要较好的 GPU（建议 8GB+ 显存）。', tags:['AI','绘画','开源'], url:'https://stability.ai', views:980},
    {id:14, name:'Suno', category:'AI工具', slug:'suno', color:'#F47120', comment:'AI 音乐生成，一首歌只需 30 秒', detail:'AI 音乐生成平台，输入文字描述即可生成带歌词的完整歌曲。支持多种风格：流行、摇滚、古典、说唱、电子等。免费版每天生成 10 首（50 秒/首），Pro 版每月 $8 生成 500 首。生成的音乐质量已经接近专业制作水平。', tags:['AI','音乐','免费'], url:'https://suno.ai', views:760},
    {id:15, name:'Gamma', category:'AI工具', slug:'gamma', color:'#7C3AED', comment:'AI 一键生成 PPT，告别排版地狱', detail:'AI 驱动的演示文稿生成工具，输入主题或大纲即可自动生成精美 PPT。支持多种模板和布局，AI 自动配图、排版、配色。免费版有水印，Pro 版每月 $10 去水印并解锁更多模板。生成的 PPT 可导出为 PPTX 或 PDF。', tags:['AI','PPT','效率'], url:'https://gamma.app', views:680},
    {id:16, name:'Perplexity', category:'AI工具', slug:'perplexity', color:'#20B8CD', comment:'AI 搜索引擎，答案带引用来源', detail:'AI 驱动的搜索引擎，结合大语言模型和网络搜索，给出带引用来源的答案。支持追问、多轮对话、文件上传分析。免费版使用基础模型，Pro 版每月 $20 使用 GPT-4o、Claude 3.5 等高级模型。是搜索和研究的利器。', tags:['AI','搜索','免费'], url:'https://perplexity.ai', views:620},

    // ===== 设计工具 =====
    {id:17, name:'Figma', category:'设计工具', slug:'figma', color:'#F24E1E', comment:'协作设计标杆，浏览器即可用', detail:'浏览器端的专业 UI/UX 设计工具，支持实时多人协作、组件库、自动布局、原型交互。免费版支持 3 个项目，Professional 版每月 $15/人。插件生态丰富，社区有海量免费设计资源。设计到开发的交接流程非常顺畅。', tags:['日常必备','免费','协作'], url:'https://figma.com', views:1120},
    {id:18, name:'Photopea', category:'设计工具', icon:'fa-image', color:'#18A497', comment:'免费在线 PS，浏览器里跑 Photoshop', detail:'浏览器端的专业图片编辑器，界面和操作习惯与 Photoshop 高度一致。支持 PSD、AI、XD、Sketch 等格式导入导出。图层、蒙版、滤镜、矢量工具全都有。完全免费，无需注册，是 PS 的最佳免费替代品。', tags:['免费','在线','图片编辑'], url:'https://photopea.com', views:540},
    {id:19, name:'Canva', category:'设计工具', slug:'canva', color:'#00C4CC', comment:'非设计师也能做出好看的设计', detail:'在线设计平台，提供海量模板：海报、名片、PPT、社交媒体配图、Logo 等。拖拽式编辑，内置百万+ 图片素材和字体。免费版功能够用，Pro 版每月 $12.99 解锁更多模板和高级功能。团队协作和品牌管理功能完善。', tags:['设计','免费','模板'], url:'https://canva.com', views:890},
    {id:20, name:'Excalidraw', category:'设计工具', slug:'excalidraw', color:'#6965DB', comment:'手绘风格图表，简单到极致', detail:'手绘风格的在线白板工具，适合画流程图、架构图、思维导图。线条自带抖动效果，营造手绘感。支持实时协作、导出 PNG/SVG、快捷键操作。完全免费开源，可本地部署。是技术方案讲解和头脑风暴的利器。', tags:['免费','在线','手绘'], url:'https://excalidraw.com', views:430},
    {id:21, name:'Coolors', category:'设计工具', slug:'coolors', color:'#F38B00', comment:'配色方案生成器，一键按出灵感', detail:'配色方案生成工具，按空格键随机生成配色方案。支持锁定颜色、调整色相、导出各种格式（CSS、SVG、PNG）。提供色彩理论检查（对比度、色盲友好性）。免费版功能完整，Pro 版增加渐变和收藏功能。', tags:['配色','免费','设计'], url:'https://coolors.co', views:380},
    {id:22, name:'Remove.bg', category:'设计工具', slug:'removebg', color:'#000000', comment:'AI 一键抠图，3 秒去除背景', detail:'AI 驱动的在线抠图工具，上传图片后 3 秒内自动去除背景。效果出色，发丝级别精度。免费版输出 720p 分辨率带水印，付费版输出高清无水印。API 可集成到其他应用。还有擦除/恢复工具可手动修正边缘。', tags:['AI','抠图','免费'], url:'https://remove.bg', views:520},

    // ===== 效率工具 =====
    {id:23, name:'Notion', category:'效率工具', slug:'notion', color:'#000000', comment:'All-in-one 知识管理神器', detail:'集笔记、任务管理、数据库、Wiki、看板于一体的全能工具。支持嵌套页面、数据库视图（表格/看板/日历/画廊）、公式、API 集成。免费版对个人足够使用，Plus 版每月 $10 增加无限文件上传和协作功能。模板社区有海量现成模板。', tags:['日常必备','笔记','免费'], url:'https://notion.so', views:1560, pinned:true},
    {id:24, name:'Obsidian', category:'效率工具', slug:'obsidian', color:'#7C3AED', comment:'本地优先的双链笔记，数据完全自主', detail:'基于本地 Markdown 文件的知识管理工具，支持双向链接、关系图谱、插件系统。数据存储在本地，完全离线可用，隐私安全。免费版功能完整，Sync 服务每年 $96（跨设备同步）。插件社区有 1000+ 插件扩展功能。', tags:['笔记','免费','本地'], url:'https://obsidian.md', views:720},
    {id:25, name:'Todoist', category:'效率工具', slug:'todoist', color:'#E44332', comment:'简洁优雅的任务管理，自然语言输入', detail:'自然语言任务管理工具，输入「明天下午3点开会」自动解析时间和优先级。支持项目、标签、过滤器、 Karma 统计。跨平台同步，支持与 Google Calendar、Slack 等集成。免费版 5 个项目，Pro 版每月 $4。', tags:['任务管理','免费','跨平台'], url:'https://todoist.com', views:480},
    {id:26, name:'Trello', category:'效率工具', slug:'trello', color:'#0079BF', comment:'看板管理鼻祖，简单直观', detail:'Atlassian 旗下的看板式项目管理工具。看板、列表、卡片三层级结构，支持拖拽排序、标签、截止日期、清单、附件。免费版支持 10 个看板，Power-Up 可扩展功能。适合个人和小团队的轻量项目管理。', tags:['免费','看板','协作'], url:'https://trello.com', views:420},
    {id:27, name:'Snipaste', category:'效率工具', slug:'snipaste', color:'#0078D4', comment:'截图 + 贴图，效率翻倍的神器', detail:'截图与贴图工具，截取屏幕后可将截图「贴」在屏幕上置顶显示。支持标注、取色、像素级精确截图。快捷键操作流畅，F1 截图、F3 贴图。完全免费，Windows 版功能最全，Mac 版功能稍少。', tags:['截图','免费','日常必备'], url:'https://snipaste.com', views:650},
    {id:28, name:'Everything', category:'效率工具', icon:'fa-search', color:'#0066CC', comment:'Windows 文件搜索神器，秒出结果', detail:'Windows 平台最快的文件搜索工具，索引全部文件后搜索结果即时显示（毫秒级）。支持正则表达式、文件内容搜索、HTTP 服务器模式。完全免费，体积仅几 MB。比 Windows 自带搜索快几个数量级。', tags:['搜索','免费','Windows'], url:'https://voidtools.com', views:580},
    {id:29, name:'Raycast', category:'效率工具', slug:'raycast', color:'#FF6363', comment:'Mac 启动器天花板，替代 Spotlight', detail:'macOS 上的全能启动器，集应用启动、剪贴板管理、窗口管理、Snippets、计算器于一体。插件商店有 1000+ 扩展（GitHub、Jira、Linear 等）。AI 功能可调用 GPT-4。免费版功能强大，Pro 版每月 $8 增加 AI 和云同步。', tags:['Mac','启动器','免费'], url:'https://raycast.com', views:390},
    {id:30, name:'Rectangles', category:'效率工具', icon:'fa-window-restore', color:'#8B5CF6', comment:'Mac 窗口管理，快捷键分屏', detail:'macOS 窗口管理工具，通过快捷键快速将窗口移动到屏幕的不同位置（左半屏、右半屏、居中等）。完全免费开源，支持自定义快捷键。Pro 版增加鼠标拖拽和布局快照功能，一次性付费 $4.99。', tags:['Mac','免费','窗口管理'], url:'https://rectangleapp.com', views:280},

    // ===== 安全工具 =====
    {id:31, name:'Bitwarden', category:'安全工具', slug:'bitwarden', color:'#175DDC', comment:'开源密码管理器，免费版够用', detail:'开源的密码管理器，端到端加密，支持跨平台同步。免费版支持无限密码存储和双设备同步，Premium 版每年 $10 增加TOTP、文件附件等功能。浏览器扩展自动填充密码，支持生物识别解锁。安全性通过第三方审计。', tags:['密码','免费','开源'], url:'https://bitwarden.com', views:450},
    {id:32, name:'ProtonVPN', category:'安全工具', slug:'protonvpn', color:'#56B366', comment:'瑞士隐私 VPN，免费版不限流量', detail:'瑞士 ProtonAG 旗下的 VPN 服务，免费版不限流量不限时长（限 3 个国家/地区）。无日志政策，通过瑞士严格的隐私法律保护。Plus 版每月 $4.99+ 解锁全部 70+ 国家和 P2P 下载。支持 Kill Switch 和 Secure Core。', tags:['VPN','免费','隐私'], url:'https://protonvpn.com', views:520},
    {id:33, name:'VirusTotal', category:'安全工具', icon:'fa-shield-virus', color:'#3944BC', comment:'在线病毒扫描，70+ 引擎同时检测', detail:'Google 旗下的在线文件安全扫描服务，上传文件后由 70+ 杀毒引擎同时扫描。支持 URL、IP、域名、文件哈希扫描。完全免费，API 可集成。是检测可疑文件和链接的最佳工具。 owned by Google。', tags:['安全','免费','扫描'], url:'https://virustotal.com', views:380},

    // ===== 影音工具 =====
    {id:34, name:'OBS Studio', category:'影音工具', slug:'obsproject', color:'#302E31', comment:'免费开源录屏直播神器', detail:'开源的录屏和直播软件，支持多场景切换、画中画、绿幕抠像、音频混合。支持推流到 Twitch、YouTube、B站等平台。插件生态丰富，可实现虚拟摄像头、降噪、自动字幕等。完全免费无广告，是直播和录屏的首选。', tags:['录屏','直播','免费'], url:'https://obsproject.com', views:720},
    {id:35, name:'FFmpeg', category:'影音工具', icon:'fa-film', color:'#007806', comment:'音视频处理瑞士军刀，命令行全能', detail:'开源的音视频处理工具，支持格式转换、剪辑、合并、提取音频、添加字幕、调整分辨率等几乎所有音视频操作。命令行操作，可通过脚本批量处理。完全免费，是视频处理领域的行业标准。', tags:['视频','免费','命令行'], url:'https://ffmpeg.org', views:560},
    {id:36, name:'Spotify', category:'影音工具', slug:'spotify', color:'#1DB954', comment:'全球最大音乐流媒体平台', detail:'全球最大的音乐流媒体平台，拥有 1 亿+ 歌曲。免费版有广告且只能随机播放，Premium 版每月 $10.99 无广告、高品质、离线下载。支持歌词显示、播客、有声书。算法推荐精准，Weekly Mix 和 Daily Mix 体验出色。', tags:['音乐','免费','流媒体'], url:'https://spotify.com', views:890},
    {id:37, name:'PotPlayer', category:'影音工具', icon:'fa-play-circle', color:'#00B0FF', comment:'全能视频播放器，格式支持最全', detail:'Windows 平台最强大的视频播放器，支持几乎所有视频/音频格式。硬件加速解码，4K/8K 流畅播放。内置字幕搜索、3D 播放、360度视频、直播流播放。完全免费无广告，可高度自定义皮肤和快捷键。', tags:['播放器','免费','Windows'], url:'https://potplayer.daum.net', views:480},

    // ===== 浏览器 =====
    {id:38, name:'Arc Browser', category:'浏览器', slug:'arc', color:'#FF5C38', comment:'重新定义浏览器，告别标签页地狱', detail:'The Browser Company 开发的新一代浏览器，基于 Chromium 内核。创新的 Sidebar 标签管理、Space 多工作区、Boost 网页自定义、Split View 分屏浏览。完全免费，Mac 和 Windows 均可用。设计精美，交互创新，正在改变人们的浏览习惯。', tags:['浏览器','免费','创新'], url:'https://arc.net', views:680, pinned:true},
    {id:39, name:'uBlock Origin', category:'浏览器', icon:'fa-shield-alt', color:'#800000', comment:'最强广告拦截，内存占用最低', detail:'开源的高效广告拦截浏览器扩展，内存和 CPU 占用极低。支持自定义过滤规则、元素拾取、恶意域名拦截。比 AdBlock Plus 更高效更透明，不接受「可接受广告」计划。完全免费，是浏览器必装扩展。', tags:['浏览器','免费','广告拦截'], url:'https://github.com/gorhill/uBlock', views:920},
    {id:40, name:'Vimium', category:'浏览器', icon:'fa-keyboard', color:'#2E3436', comment:'键盘操控浏览器，Vim 党的福音', detail:'浏览器扩展，用 Vim 风格的快捷键操控浏览器。F 键显示页面所有可点击元素的字母提示，J/K 上下滚动，X 关闭标签页，T 打开新标签。完全键盘操作，效率极高。适合 Vim 用户和追求效率的开发者。', tags:['浏览器','免费','效率'], url:'https://vimium.github.io', views:340}
];

// 从 Supabase 加载工具列表（失败时使用本地兜底）
function loadTools() {
    if (typeof fetchTools !== 'function') {
        App.state.tools = FALLBACK_TOOLS.slice();
        return Promise.resolve(FALLBACK_TOOLS);
    }
    App.state.loading = true;
    return fetchTools().then(function(data) {
        if (!data || !data.length) {
            App.state.tools = FALLBACK_TOOLS.slice();
        } else {
            App.state.tools = data;
        }
        try { localStorage.setItem(App.constants.CACHE_KEY, JSON.stringify(App.state.tools)); } catch(e) {}
        App.state.loading = false;
        return App.state.tools;
    }).catch(function(e) {
        console.warn('Supabase 不可用，使用本地兜底数据:', e);
        App.state.loading = false;
        try {
            var cached = localStorage.getItem(App.constants.CACHE_KEY);
            if (cached) {
                var parsed = JSON.parse(cached);
                if (parsed && parsed.length) {
                    App.state.tools = parsed;
                    return parsed;
                }
            }
        } catch(e2) {}
        App.state.tools = FALLBACK_TOOLS.slice();
        return FALLBACK_TOOLS;
    });
}

function refreshTools() {
    return loadTools().then(function() {
        rebuildCategories();
        renderTools(App.state.currentFilter);
    });
}

// ============================================
// 公告数据
// ============================================

function loadAnnouncements() {
    if (typeof fetchAnnouncements !== 'function') return Promise.resolve([]);
    return fetchAnnouncements().then(function(data) {
        App.state.announcements = data;
        try { localStorage.setItem(App.constants.ANNOUNCEMENT_CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        return data;
    }).catch(function(e) {
        console.warn('公告加载失败，使用缓存:', e);
        try {
            var cached = localStorage.getItem(App.constants.ANNOUNCEMENT_CACHE_KEY);
            if (cached) { App.state.announcements = JSON.parse(cached); return App.state.announcements; }
        } catch(e2) {}
        App.state.announcements = [];
        return [];
    });
}
