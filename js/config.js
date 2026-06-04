// 全局常量配置
const PROXY_URL = '/proxy/';    // 适用于 Cloudflare, Netlify (带重写), Vercel (带重写)
const SEARCH_HISTORY_KEY = 'videoSearchHistory';
const MAX_HISTORY_ITEMS = 5;

const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified',
    verificationTTL: 90 * 24 * 60 * 60 * 1000,
};

const SITE_CONFIG = {
    name: 'LibreTV',
    url: 'https://libretv.is-an.org',
    description: '免费在线视频搜索与观看平台',
    logo: 'https://images.icon-icons.com/38/PNG/512/retrotv_5520.png',
    version: '1.0.3'
};

// ==========================================
// 👇 1. 专属 API 站点配置（注意结尾绝对不能有斜杠）
// ==========================================
const API_SITES = {
    douyin_n8n: {
        api: 'https://ocin8n.ccwork.nyc.mn/webhook/libretv-playlist/api.php/provide/vod', 
        name: '抖音短剧(专属)',
        adult: false,
        filterAdRule: null
    },
    gdrive_n8n: {
        api: 'https://ocin8n.ccwork.nyc.mn/webhook/gdrive-playlist',
        name: '沙雕社(云盘)',
        adult: false,
        filterAdRule: null
    },
    // 👇 新增：抖音合集接口 👇
    douyin_mix_n8n: {
        api: 'https://ocin8n.ccwork.nyc.mn/webhook/douyin-mix-playlist', // 对应从 MySQL 拉取列表的 Webhook
        name: '抖音合集(连载)',
        adult: false,
        filterAdRule: null
    }
    // 👆 新增结束 👆
};

const AGGREGATED_SEARCH_CONFIG = {
    enabled: true,             
    timeout: 8000,            
    maxResults: 10000,          
    parallelRequests: true,   
    showSourceBadges: true    
};

// ==========================================
// 👇 2. 接口请求配置（直接以问号开头，不要加斜杠）
// ==========================================
const API_CONFIG = {
    search: {
        path: '?ac=videolist&wd=', // <--- 确保这里直接是 ? 开头
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
    },
    detail: {
        path: '?ac=videolist&ids=', // <--- 确保这里直接是 ? 开头
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
    }
};

const M3U8_PATTERN = /\$https?:\/\/[^"'\s]+?\.m3u8/g;
const CUSTOM_PLAYER_URL = 'player.html'; 

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

const ERROR_MESSAGES = {
    NETWORK_ERROR: '网络连接错误，请检查网络设置',
    TIMEOUT_ERROR: '请求超时，服务器响应时间过长',
    API_ERROR: 'API接口返回错误，请尝试更换数据源',
    PLAYER_ERROR: '播放器加载失败，请尝试其他视频源',
    UNKNOWN_ERROR: '发生未知错误，请刷新页面重试'
};

const SECURITY_CONFIG = {
    enableXSSProtection: true,  
    sanitizeUrls: true,         
    maxQueryLength: 100,        
};

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

const HIDE_BUILTIN_ADULT_APIS = true;
