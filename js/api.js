// ==========================================
// 极简版 API 请求拦截与处理(专属短剧源优化版)
// ==========================================

async function handleApiRequest(url) {
    // 强制默认使用我们专属的 n8n 接口源
    const source = url.searchParams.get('source') || 'douyin_n8n';
    
    try {
        // ----------------------------------------
        // 1. 处理搜索和首页列表请求(/api/search)
        // ----------------------------------------
        if (url.pathname === '/api/search') {
            const searchQuery = url.searchParams.get('wd') || '';
            
            // 拼接目标 API 地址
            const apiUrl = `${API_SITES[source].api}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
                    headers: API_CONFIG.search.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
                
                const data = await response.json();
                if (!data || !Array.isArray(data.list)) {
                    throw new Error('API返回的数据格式无效');
                }
                
                // 给每个视频打上您的专属源标签
                data.list.forEach(item => {
                    item.source_name = API_SITES[source].name;
                    item.source_code = source;
                });
                
                return JSON.stringify({
                    code: 200,
                    list: data.list || [],
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        }

        // ----------------------------------------
        // 2. 处理视频详情和播放列表请求(/api/detail)
        // ----------------------------------------
        if (url.pathname === '/api/detail') {
            const id = url.searchParams.get('id');
            if (!id) throw new Error('缺少视频ID参数');
            
            // 拼接目标详情 API 地址
            // 缓存接口已支持ids过滤，直接使用
            const detailUrl = `${API_SITES[source].api}${API_CONFIG.detail.path}${id}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(detailUrl), {
                    headers: API_CONFIG.detail.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`详情请求失败: ${response.status}`);
                
                const data = await response.json();
                if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                    throw new Error('获取到的详情内容无效');
                }
                
                // 修复: 如果webhook没有过滤ids，则在返回的list中查找匹配的vod_id
                const videoDetail = data.list.find(item => item.vod_id === id) || data.list[0];
                let episodes = [];
                
                // 解析苹果CMS标准播放地址格式 (播放$http...#播放2$http...)
                if (videoDetail.vod_play_url) {
                    const playSources = videoDetail.vod_play_url.split('$$$');
                    if (playSources.length > 0) {
                        const mainSource = playSources[0];
                        const episodeList = mainSource.split('#');
                        
                        episodes = episodeList.map(ep => {
                            const parts = ep.split('$');
                            // 提取 $ 符号后面的真实 HTTP 链接
                            return parts.length > 1 ? parts[1] : parts[0];
                        }).filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
                    }
                }
                
                return JSON.stringify({
                    code: 200,
                    episodes: episodes,
                    detailUrl: detailUrl,
                    videoInfo: {
                        title: videoDetail.vod_name,
                        cover: videoDetail.vod_pic,
                        desc: videoDetail.vod_content,
                        type: videoDetail.type_name,
                        year: videoDetail.vod_year,
                        area: videoDetail.vod_area,
                        director: videoDetail.vod_director,
                        actor: videoDetail.vod_actor,
                        remarks: videoDetail.vod_remarks,
                        source_name: API_SITES[source].name,
                        source_code: source
                    }
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        }

        throw new Error('未知的API路径');
    } catch (error) {
        console.error('API处理错误:', error);
        return JSON.stringify({
            code: 400,
            msg: error.message || '请求处理失败',
            list: [],
            episodes: [],
        });
    }
}

// ==========================================
// 底层请求拦截器(拦截网页向 /api/... 发出的请求)
// ==========================================
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
        const requestUrl = typeof input === 'string' ? new URL(input, window.location.origin) : input.url;
        
        // 凡是带有 /api/ 的请求，都交给我们的 handleApiRequest 来处理
        if (requestUrl.pathname.startsWith('/api/')) {
            // 密码校验逻辑 (防闪退安全保护)
            if (window.isPasswordProtected && window.isPasswordVerified) {
                if (window.isPasswordProtected() && !window.isPasswordVerified()) {
                    return;
                }
            }
            try {
                const data = await handleApiRequest(requestUrl);
                return new Response(data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    code: 500,
                    msg: '服务器内部错误',
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
        
        // 其他正常的请求放行，使用浏览器的原生 fetch
        return originalFetch.apply(this, arguments);
    };
})();
