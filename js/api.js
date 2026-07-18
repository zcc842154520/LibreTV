// ==========================================
// ����� API ���������봦��(ר���̾�Դ�Ż���)
// ==========================================

async function handleApiRequest(url) {
    // ǿ��Ĭ��ʹ������ר���� n8n �ӿ�Դ
    const source = url.searchParams.get('source') || 'douyin_n8n';
    
    try {
        // ----------------------------------------
        // 1. ������������ҳ�б�����(/api/search)
        // ----------------------------------------
        if (url.pathname === '/api/search') {
            const searchQuery = url.searchParams.get('wd') || '';
            
            // ƴ��Ŀ�� API ��ַ
            const apiUrl = `${API_SITES[source].api}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
                    headers: API_CONFIG.search.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`API����ʧ��: ${response.status}`);
                
                const data = await response.json();
                if (!data || !Array.isArray(data.list)) {
                    throw new Error('API���ص����ݸ�ʽ��Ч');
                }
                
                // ��ÿ����Ƶ��������ר��Դ��ǩ
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
        // 2. ������Ƶ����Ͳ����б�����(/api/detail)
        // ----------------------------------------
        if (url.pathname === '/api/detail') {
            const id = url.searchParams.get('id');
            if (!id) throw new Error('ȱ����ƵID����');
            
            // ƴ��Ŀ������ API ��ַ
            // ����ӿ���֧��ids���ˣ�ֱ��ʹ��
            const detailUrl = `${API_SITES[source].api}${API_CONFIG.detail.path}${id}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(detailUrl), {
                    headers: API_CONFIG.detail.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`��������ʧ��: ${response.status}`);
                
                const data = await response.json();
                if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                    throw new Error('��ȡ��������������Ч');
                }
                
                // �޸�: ���webhookû�й���ids�����ڷ��ص�list�в���ƥ���vod_id
                const videoDetail = data.list.find(item => item.vod_id === id) || data.list[0];
                let episodes = [];
                
                // ����ƻ��CMS��׼���ŵ�ַ��ʽ (����$http...#����2$http...)
                if (videoDetail.vod_play_url) {
                    const playSources = videoDetail.vod_play_url.split('$$$');
                    if (playSources.length > 0) {
                        const mainSource = playSources[0];
                        const episodeList = mainSource.split('#');
                        
                        episodes = episodeList.map(ep => {
                            const dollarIdx = ep.indexOf('$http');
                            if (dollarIdx !== -1) { return ep.substring(dollarIdx + 1); }
                            const httpIdx = ep.indexOf('http');
                            if (httpIdx !== -1) { return ep.substring(httpIdx); }
                            return ep;
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

        throw new Error('δ֪��API·��');
    } catch (error) {
        console.error('API��������:', error);
        return JSON.stringify({
            code: 400,
            msg: error.message || '������ʧ��',
            list: [],
            episodes: [],
        });
    }
}

// ==========================================
// �ײ�����������(������ҳ�� /api/... ����������)
// ==========================================
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
        const requestUrl = typeof input === 'string' ? new URL(input, window.location.origin) : input.url;
        
        // ���Ǵ��� /api/ �����󣬶��������ǵ� handleApiRequest ������
        if (requestUrl.pathname.startsWith('/api/')) {
            // ����У���߼� (�����˰�ȫ����)
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
                    msg: '�������ڲ�����',
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
        
        // ����������������У�ʹ���������ԭ�� fetch
        return originalFetch.apply(this, arguments);
    };
})();
