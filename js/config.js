// 全局常量配置
const PROXY_URL = '/proxy/';    // 适用于 Cloudflare, Netlify (带重写), Vercel (带重写)
const SEARCH_HISTORY_KEY = 'videoSearchHistory';
const MAX_HISTORY_ITEMS = 5;

// 密码保护配置
const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified',  // 存储验证状态的键名
    verificationTTL: 90 * 24 * 60 * 60 * 1000,  // 验证有效期（90天，约3个月）
};

// 网站信息配置
const SITE_CONFIG = {
    name: 'LibreTV',
    url: 'https://libretv.is-an.org',
    description: '免费在线视频搜索与观看平台',
    logo: 'https://images.icon-icons.com/38/PNG/512/retrotv_5520.png',
    version: '1.0.3'
};

// ==========================================
// 👇 1. 您的专属 API 站点配置
// ==========================================
const API_SITES = {
    douyin_n8n: {
        api: 'https://ocin8n.ccwork.nyc.mn/webhook/libretv-playlist', // n8n 接口根路径（不要加斜杠）
        name: '抖音短剧(专属)',
        adult: false,
        filterAdRule: null
    }
};

const AGGREGATED_SEARCH_CONFIG = {
    enabled: true,             
    timeout: 8000,            
    maxResults: 10000,          
    parallelRequests: true,   
    showSourceBadges: true    
};

// ==========================================
// 👇 2. 核心修复：抽象API请求配置（去掉冗余路径，直接问号传参）
// ==========================================
const API_CONFIG = {
    search: {
        path: '?ac=videolist&wd=', // 直接用 ? 拼接，这样 n8n 就能完美识别了
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    },
    detail: {
        path: '?ac=videolist&ids=', // 直接用 ? 拼接
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    }
};

// 优化后的正则表达式模式
const M3U8_PATTERN = /\$https?:\/\/[^"'\s]+?\.m3u8/g;

// 添加自定义播放器URL
const CUSTOM_PLAYER_URL = 'player.html'; 

// 增加视频播放相关配置
const PLAYER_CONFIG = {
    autoplay: true,
    allowFullscreen: true,
    width: '100%',
    height: '600',
    timeout: 15000,  
    filterAds: true,  
    autoPlayNext: true,  
    adFilteringEnabled: true, 
    adFilteringStorage: 'adFilteringEnabled' 
};

// 增加错误信息本地化
const ERROR_MESSAGES = {
    NETWORK_ERROR: '网络连接错误，请检查网络设置',
    TIMEOUT_ERROR: '请求超时，服务器响应时间过长',
    API_ERROR: 'API接口返回错误，请尝试更换数据源',
    PLAYER_ERROR: '播放器加载失败，请尝试其他视频源',
    UNKNOWN_ERROR: '发生未知错误，请刷新页面重试'
};

// 添加进一步安全设置
const SECURITY_CONFIG = {
    enableXSSProtection: true,  
    sanitizeUrls: true,         
    maxQueryLength: 100,        
};

// 添加多个自定义API源的配置
const CUSTOM_API_CONFIG = {
    separator: ',',           
    maxSources: 5,            
    testTimeout: 5000,        
    namePrefix: 'Custom-',    
    validateUrl: true,        
    cacheResults: true,       
    cacheExpiry: 5184000000,  
    adultPropName: 'isAdult' 
};

// 隐藏内置黄色采集站API的变量
const HIDE_BUILTIN_ADULT_APIS = true;
