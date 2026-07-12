// =====================================================================
// 1. 动态读取 config.js 中所有可用的 API 键名
const allAvailableApis = Object.keys(API_SITES);
let selectedAPIs = [];

try {
    let savedAPIs = localStorage.getItem('selectedAPIs');
    if (savedAPIs) {
        selectedAPIs = JSON.parse(savedAPIs).filter(api => allAvailableApis.includes(api));
    }
} catch (e) {
    console.error("缓存解析异常，将重置数据源选择");
}

if (selectedAPIs.length === 0) {
    selectedAPIs = [...allAvailableApis];
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
}
// =====================================================================

let customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); 
let currentEpisodeIndex = 0;
let currentEpisodes = [];
let currentVideoTitle = '';
let episodesReversed = false;

// === 分页全局变量 ===
let globalSearchResults = []; 
let currentPage = 1;          
const itemsPerPage = 20;  
let currentCategory = '全部';

// === 核心：递归就绪检查 ===
function tryAutoSearch(attempts = 0) {
    if (typeof search === 'function' && typeof API_SITES !== 'undefined') {
        search(true); 
    } else if (attempts < 15) { 
        setTimeout(() => tryAutoSearch(attempts + 1), 200);
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initAPICheckboxes();
    renderCustomAPIsList();
    updateSelectedApiCount();
    
    if (!localStorage.getItem('hasInitializedDefaults')) {
        selectedAPIs = [...allAvailableApis];
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
        localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, 'true');
        localStorage.setItem('hasInitializedDefaults', 'true');
    }
    

    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false';
    }
    
    setupEventListeners();
    
    tryAutoSearch();
});

// 初始化API复选框
function initAPICheckboxes() {
    const container = document.getElementById('apiCheckboxes');
    container.innerHTML = '';

    const normalTitle = document.createElement('div');
    normalTitle.className = 'api-group-title';
    normalTitle.textContent = '普通资源';
    container.appendChild(normalTitle);
    
    Object.keys(API_SITES).forEach(apiKey => {
        const api = API_SITES[apiKey];
        if (api.adult) return; 
        
        const checked = selectedAPIs.includes(apiKey);
        
        const checkbox = document.createElement('div');
        checkbox.className = 'flex items-center';
        checkbox.innerHTML = `
            <input type="checkbox" id="api_${apiKey}" 
                   class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333]" 
                   ${checked ? 'checked' : ''} 
                   data-api="${apiKey}">
            <label for="api_${apiKey}" class="ml-1 text-xs text-gray-400 truncate">${api.name}</label>
        `;
        container.appendChild(checkbox);
        
        checkbox.querySelector('input').addEventListener('change', function() {
            updateSelectedAPIs();
            checkAdultAPIsSelected();
        });
    });
    
    function renderCustomAPIsList() {
    const container = document.getElementById('customApisList');
    if (!container) return;
    
    if (customAPIs.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 text-center my-2">未添加自定义API</p>';
        return;
    }
    
    container.innerHTML = '';
    customAPIs.forEach((api, index) => {
        const apiItem = document.createElement('div');
        apiItem.className = 'flex items-center justify-between p-1 mb-1 bg-[#222] rounded';
        
        const textColorClass = api.isAdult ? 'text-pink-400' : 'text-white';
        const adultTag = api.isAdult ? '<span class="text-xs text-pink-400 mr-1">(18+)</span>' : '';
        
        apiItem.innerHTML = `
            <div class="flex items-center flex-1 min-w-0">
                <input type="checkbox" id="custom_api_${index}" 
                       class="form-checkbox h-3 w-3 text-blue-600 mr-1 ${api.isAdult ? 'api-adult' : ''}" 
                       ${selectedAPIs.includes('custom_' + index) ? 'checked' : ''} 
                       data-custom-index="${index}">
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium ${textColorClass} truncate">
                        ${api.name}
                    </div>
                    <div class="text-xs text-gray-500 truncate">${api.url}</div>
                </div>
            </div>
            <div class="flex items-center">
                <button class="text-blue-500 hover:text-blue-700 text-xs px-1" onclick="editCustomApi(${index})">✎</button>
                <button class="text-red-500 hover:text-red-700 text-xs px-1" onclick="removeCustomApi(${index})">✕</button>
            </div>
        `;
        container.appendChild(apiItem);
        
        apiItem.querySelector('input').addEventListener('change', function() {
            updateSelectedAPIs();
            checkAdultAPIsSelected();
        });
    });
}

function editCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    
    const api = customAPIs[index];
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const isAdultInput = document.getElementById('customApiIsAdult');
    
    nameInput.value = api.name;
    urlInput.value = api.url;
    if (isAdultInput) isAdultInput.checked = api.isAdult || false;
    
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.remove('hidden');
        const buttonContainer = form.querySelector('div:last-child');
        buttonContainer.innerHTML = `
            <button onclick="updateCustomApi(${index})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">更新</button>
            <button onclick="cancelEditCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
        `;
    }
}

function updateCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const isAdultInput = document.getElementById('customApiIsAdult');
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    
    if (!name || !url) {
        showToast('请输入API名称和链接', 'warning');
        return;
    }
    
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('API链接格式不正确，需以http://或https://开头', 'warning');
        return;
    }
    
    if (url.endsWith('/')) url = url.slice(0, -1);
    
    customAPIs[index] = { name, url, isAdult };
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    
    renderCustomAPIsList();
    checkAdultAPIsSelected();
    restoreAddCustomApiButtons();
    
    nameInput.value = '';
    urlInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    
    showToast('已更新自定义API: ' + name, 'success');
}

function cancelEditCustomApi() {
    document.getElementById('customApiName').value = '';
    document.getElementById('customApiUrl').value = '';
    const isAdultInput = document.getElementById('customApiIsAdult');
    if (isAdultInput) isAdultInput.checked = false;
    
    document.getElementById('addCustomApiForm').classList.add('hidden');
    restoreAddCustomApiButtons();
}

function restoreAddCustomApiButtons() {
    const form = document.getElementById('addCustomApiForm');
    const buttonContainer = form.querySelector('div:last-child');
    buttonContainer.innerHTML = `
        <button onclick="addCustomApi()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">添加</button>
        <button onclick="cancelAddCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
    `;
}

function updateSelectedAPIs() {
    const builtInApiCheckboxes = document.querySelectorAll('#apiCheckboxes input:checked');
    const builtInApis = Array.from(builtInApiCheckboxes).map(input => input.dataset.api);
    
    const customApiCheckboxes = document.querySelectorAll('#customApisList input:checked');
    const customApiIndices = Array.from(customApiCheckboxes).map(input => 'custom_' + input.dataset.customIndex);
    
    selectedAPIs = [...builtInApis, ...customApiIndices];
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
    updateSelectedApiCount();
}

function updateSelectedApiCount() {
    const countEl = document.getElementById('selectedApiCount');
    if (countEl) countEl.textContent = selectedAPIs.length;
}

function selectAllAPIs(selectAll = true, excludeAdult = false) {
    const checkboxes = document.querySelectorAll('#apiCheckboxes input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (excludeAdult && checkbox.classList.contains('api-adult')) {
            checkbox.checked = false;
        } else {
            checkbox.checked = selectAll;
        }
    });
    
    updateSelectedAPIs();
    checkAdultAPIsSelected();
}

function showAddCustomApiForm() {
    const form = document.getElementById('addCustomApiForm');
    if (form) form.classList.remove('hidden');
}

function cancelAddCustomApi() {
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('customApiName').value = '';
        document.getElementById('customApiUrl').value = '';
        const isAdultInput = document.getElementById('customApiIsAdult');
        if (isAdultInput) isAdultInput.checked = false;
        restoreAddCustomApiButtons();
    }
}

function addCustomApi() {
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const isAdultInput = document.getElementById('customApiIsAdult');
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    
    if (!name || !url) {
        showToast('请输入API名称和链接', 'warning');
        return;
    }
    
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('API链接格式不正确，需以http://或https://开头', 'warning');
        return;
    }
    
    if (url.endsWith('/')) url = url.slice(0, -1);
    
    customAPIs.push({ name, url, isAdult });
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    
    const newApiIndex = customAPIs.length - 1;
    selectedAPIs.push('custom_' + newApiIndex);
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
    
    renderCustomAPIsList();
    updateSelectedApiCount();
    checkAdultAPIsSelected();
    
    nameInput.value = '';
    urlInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    
    showToast('已添加自定义API: ' + name, 'success');
}

function removeCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    const apiName = customAPIs[index].name;
    
    customAPIs.splice(index, 1);
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    
    const customApiId = 'custom_' + index;
    selectedAPIs = selectedAPIs.filter(id => id !== customApiId);
    
    selectedAPIs = selectedAPIs.map(id => {
        if (id.startsWith('custom_')) {
            const currentIndex = parseInt(id.replace('custom_', ''));
            if (currentIndex > index) {
                return 'custom_' + (currentIndex - 1);
            }
        }
        return id;
    });
    
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
    
    renderCustomAPIsList();
    updateSelectedApiCount();
    checkAdultAPIsSelected();
    
    showToast('已移除自定义API: ' + apiName, 'info');
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            search();
        }
    });

    document.addEventListener('click', function(e) {
        const panel = document.getElementById('settingsPanel');
        const settingsButton = document.querySelector('button[onclick*="toggleSettings"]'); 
        
        if (!panel) return;
        
        if ((settingsButton && settingsButton.contains(e.target)) || panel.contains(e.target)) {
            return;
        }
        
        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
        }
    });
    
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.addEventListener('change', function(e) {
            localStorage.setItem('yellowFilterEnabled', e.target.checked);
        });
    }
    
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.addEventListener('change', function(e) {
            localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
        });
    }
}

function resetSearchArea() {
    document.getElementById('results').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchArea').classList.add('flex-1');
    document.getElementById('searchArea').classList.remove('mb-8');
    document.getElementById('resultsArea').classList.add('hidden');
    
    const footer = document.querySelector('.footer');
    if (footer) footer.style.position = '';
    
    if (typeof updateDoubanVisibility === 'function') {
        updateDoubanVisibility();
    }
}

function getCustomApiInfo(customApiIndex) {
    const index = parseInt(customApiIndex);
    if (isNaN(index) || index < 0 || index >= customAPIs.length) {
        return null;
    }
    return customAPIs[index];
}

// === 核心搜索函数 ===
async function search(isInit = false) { 
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            if (!isInit) showPasswordModal && showPasswordModal();
            return;
        }
    }
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query && !isInit) {
        showToast('请输入搜索内容', 'info');
        return;
    }
    
    if (selectedAPIs.length === 0) {
        if (!isInit) showToast('请至少选择一个API源', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        saveSearchHistory(query);
        let allResults = [];
        
        const searchPromises = selectedAPIs.map(async (apiId) => {
            try {
                let apiUrl, apiName;
                
                if (apiId.startsWith('custom_')) {
                    const customIndex = apiId.replace('custom_', '');
                    const customApi = getCustomApiInfo(customIndex);
                    if (!customApi) return [];
                    
                    apiUrl = customApi.url + API_CONFIG.search.path + encodeURIComponent(query);
                    apiName = customApi.name;
                } else {
                    if (!API_SITES[apiId]) return [];
                    apiUrl = API_SITES[apiId].api + API_CONFIG.search.path + encodeURIComponent(query);
                    apiName = API_SITES[apiId].name;
                }
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);
                
                const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
                    headers: API_CONFIG.search.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (!response.ok) return [];
                const data = await response.json();
                
                if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                    // 缓存未命中，降级到主查询
                    if (API_SITES[apiId] && API_SITES[apiId].fallbackApi) {
                        try {
                            const fallbackUrl = API_SITES[apiId].fallbackApi + API_CONFIG.search.path + encodeURIComponent(query);
                            const fbController = new AbortController();
                            const fbTimeoutId = setTimeout(() => fbController.abort(), 30000);
                            const fbResponse = await fetch(PROXY_URL + encodeURIComponent(fallbackUrl), {
                                headers: API_CONFIG.search.headers,
                                signal: fbController.signal
                            });
                            clearTimeout(fbTimeoutId);
                            if (fbResponse.ok) {
                                const fbData = await fbResponse.json();
                                if (fbData && fbData.list && Array.isArray(fbData.list) && fbData.list.length > 0) {
                                    return fbData.list.map(item => ({
                                        ...item,
                                        source_name: apiName,
                                        source_code: apiId,
                                        api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
                                    }));
                                }
                            }
                        } catch (fbError) {
                            console.warn('GDrive降级查询失败:', fbError);
                        }
                    }
                    return [];
                }
                
                return data.list.map(item => ({
                    ...item,
                    source_name: apiName,
                    source_code: apiId,
                    api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
                }));
            } catch (error) {
                console.warn(`API ${apiId} 搜索失败:`, error);
                return [];
            }
        });
        
        const resultsArray = await Promise.all(searchPromises);
        resultsArray.forEach(results => {
            if (Array.isArray(results) && results.length > 0) {
                allResults = allResults.concat(results);
            }
        });
        
        const searchResultsCount = document.getElementById('searchResultsCount');
        if (searchResultsCount) searchResultsCount.textContent = allResults.length;
        
        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');
        
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea) doubanArea.classList.add('hidden');
        
        const resultsDiv = document.getElementById('results');
        
        if (!allResults || allResults.length === 0) {
            resultsDiv.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
                    <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
                </div>
            `;
            hideLoading();
            return;
        }

        const yellowFilterEnabled = localStorage.getItem('yellowFilterEnabled') === 'true';
        if (yellowFilterEnabled) {
            const banned = ['伦理片','门事件','萝莉少女','制服诱惑','国产传媒','cosplay','黑丝诱惑','无码','日本无码','有码','日本有码','SWAG','网红主播', '色情片','同性片','福利视频','福利片'];
            allResults = allResults.filter(item => {
                const typeName = item.type_name || '';
                return !banned.some(keyword => typeName.includes(keyword));
            });
        }

        // === 内存分页：存储最终数据并触发第一页渲染 ===
       // === 内存分页与分类：存储最终数据 ===
        globalSearchResults = allResults;
        currentCategory = '全部'; // 每次新搜索重置为全部
        currentPage = 1;
        
        // 生成顶部分类按钮
        renderCategoryTabs();
        // 渲染第一页
        renderPage(currentPage);

    } catch (error) {
        console.error('搜索错误:', error);
        if (error.name === 'AbortError') {
            showToast('搜索请求超时，请检查网络连接', 'error');
        } else {
            showToast('搜索请求失败，请稍后重试', 'error');
        }
    } finally {
        hideLoading();
    }
}

// === 详情与播放功能 ===
async function showDetails(id, vod_name, sourceCode) {
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    if (!id) {
        showToast('视频ID无效', 'error');
        return;
    }
    
    showLoading();
    try {
        let apiParams = '';
        if (sourceCode.startsWith('custom_')) {
            const customIndex = sourceCode.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) {
                showToast('自定义API配置无效', 'error');
                hideLoading();
                return;
            }
            apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&source=custom';
        } else {
            apiParams = '&source=' + sourceCode;
        }
        
        const response = await fetch('/api/detail?id=' + encodeURIComponent(id) + apiParams);
        const data = await response.json();
        
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        const sourceName = data.videoInfo && data.videoInfo.source_name ? 
            ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';
        
        modalTitle.innerHTML = `<span class="break-words">${vod_name || '未知视频'}</span>${sourceName}`;
        currentVideoTitle = vod_name || '未知视频';
        
        if (data.episodes && data.episodes.length > 0) {
            const safeEpisodes = data.episodes.map(url => {
                try {
                    return url && (url.startsWith('http://') || url.startsWith('https://'))
                        ? url.replace(/"/g, '&quot;') : '';
                } catch (e) {
                    return '';
                }
            }).filter(url => url); 
            
            currentEpisodes = safeEpisodes;
            episodesReversed = false; 
            modalContent.innerHTML = `
                <div class="flex justify-end mb-2">
                    <button onclick="toggleEpisodeOrder('${sourceCode}')" class="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                        </svg>
                        <span>倒序排列</span>
                    </button>
                </div>
                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    ${renderEpisodes(vod_name, sourceCode)}
                </div>
            `;
        } else {
            modalContent.innerHTML = '<p class="text-center text-gray-400 py-8">没有找到可播放的视频</p>';
        }
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('获取详情错误:', error);
        showToast('获取详情失败，请稍后重试', 'error');
    } finally {
        hideLoading();
    }
}

function playVideo(url, vod_name, sourceCode, episodeIndex = 0) {
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    if (!url) {
        showToast('无效的视频链接', 'error');
        return;
    }
    
    let sourceName = '';
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        const sourceSpan = modalTitle.querySelector('span.text-gray-400');
        if (sourceSpan) {
            const sourceText = sourceSpan.textContent;
            const match = sourceText.match(/\(([^)]+)\)/);
            if (match && match[1]) sourceName = match[1].trim();
        }
    }
    
    const currentVideoTitle = vod_name;
    localStorage.setItem('currentVideoTitle', currentVideoTitle);
    localStorage.setItem('currentEpisodeIndex', episodeIndex);
    localStorage.setItem('currentEpisodes', JSON.stringify(currentEpisodes));
    localStorage.setItem('episodesReversed', episodesReversed);
    
    const videoTitle = vod_name || currentVideoTitle;
    const videoInfo = {
        title: videoTitle,
        url: url,
        episodeIndex: episodeIndex,
        sourceName: sourceName,
        timestamp: Date.now(),
        episodes: currentEpisodes && currentEpisodes.length > 0 ? [...currentEpisodes] : []
    };
    
    if (typeof addToViewingHistory === 'function') {
        addToViewingHistory(videoInfo);
    }
    
    const playerUrl = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoTitle)}&index=${episodeIndex}&source=${encodeURIComponent(sourceName)}&source_code=${encodeURIComponent(sourceCode)}`;
    window.open(playerUrl, '_blank');
}

function playPreviousEpisode(sourceCode) {
    if (currentEpisodeIndex > 0) {
        const prevIndex = currentEpisodeIndex - 1;
        const prevUrl = currentEpisodes[prevIndex];
        playVideo(prevUrl, currentVideoTitle, sourceCode, prevIndex);
    }
}

function playNextEpisode(sourceCode) {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        const nextIndex = currentEpisodeIndex + 1;
        const nextUrl = currentEpisodes[nextIndex];
        playVideo(nextUrl, currentVideoTitle, sourceCode, nextIndex);
    }
}

function handlePlayerError() {
    hideLoading();
    showToast('视频播放加载失败，请尝试其他视频源', 'error');
}

function renderEpisodes(vodName, sourceCode) {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    return episodes.map((episode, index) => {
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        return `
            <button id="episode-${realIndex}" onclick="playVideo('${episode}','${vodName.replace(/"/g, '&quot;')}', '${sourceCode}', ${realIndex})" 
                    class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn">
                第${realIndex + 1}集
            </button>
        `;
    }).join('');
}

function toggleEpisodeOrder(sourceCode) {
    episodesReversed = !episodesReversed;
    const episodesGrid = document.getElementById('episodesGrid');
    if (episodesGrid) {
        episodesGrid.innerHTML = renderEpisodes(currentVideoTitle, sourceCode);
    }
    
    const toggleBtn = document.querySelector(`button[onclick="toggleEpisodeOrder('${sourceCode}')"]`);
    if (toggleBtn) {
        toggleBtn.querySelector('span').textContent = episodesReversed ? '正序排列' : '倒序排列';
        const arrowIcon = toggleBtn.querySelector('svg');
        if (arrowIcon) {
            arrowIcon.style.transform = episodesReversed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// =====================================================================
// === 纯前端内存分页核心模块 ===
// =====================================================================

function renderPage(page) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    resultsDiv.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full';

    // 👈 核心修改点：先按分类过滤，再切片分页
    let filteredData = globalSearchResults;
    if (currentCategory !== '全部') {
        filteredData = globalSearchResults.filter(item => (item.source_name || '其他') === currentCategory);
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    resultsDiv.innerHTML = pageData.map(item => {
        // ... (保留您原有的 item 渲染代码，完全不用动) ...
        const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
        const safeName = (item.vod_name || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const sourceInfo = item.source_name ? `<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">${item.source_name}</span>` : '';
        const sourceCode = item.source_code || '';
        const apiUrlAttr = item.api_url ? `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"` : '';
        const hasCover = item.vod_pic && item.vod_pic.startsWith('http');
        
        return `
            <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md flex flex-col" 
                 onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
                ${hasCover ? `
                <div class="relative overflow-hidden shrink-0" style="height: 160px;">
                    <img src="${item.vod_pic}" alt="${safeName}" 
                         class="w-full h-full object-cover transition-transform hover:scale-110" 
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=无封面'; this.classList.add('object-contain');" 
                         loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent opacity-60"></div>
                </div>` : ''}
                <div class="p-2 flex flex-col flex-grow">
                    <div class="flex-grow">
                        <h3 class="text-sm font-semibold mb-1 break-words line-clamp-2 text-center" title="${safeName}">${safeName}</h3>
                        <div class="flex flex-wrap justify-center gap-1 mb-1">
                            ${(item.type_name || '').toString().replace(/</g, '&lt;') ? `<span class="text-xs py-0 px-1 rounded bg-opacity-20 bg-blue-500 text-blue-300">${(item.type_name || '').toString().replace(/</g, '&lt;')}</span>` : ''}
                            ${(item.vod_year || '') ? `<span class="text-xs py-0 px-1 rounded bg-opacity-20 bg-purple-500 text-purple-300">${item.vod_year}</span>` : ''}
                        </div>
                        <p class="text-gray-400 text-xs line-clamp-1 overflow-hidden text-center">${(item.vod_remarks || '暂无介绍').toString().replace(/</g, '&lt;')}</p>
                    </div>
                    <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800 text-xs shrink-0">
                        ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                        <div><span class="text-xs text-gray-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>播放</span></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // 把当前分类的总数据量传给分页控件
    renderPaginationControls(filteredData.length);
    
    const resultsArea = document.getElementById('resultsArea');
    if (resultsArea) {
        window.scrollTo({ top: resultsArea.offsetTop - 20, behavior: 'smooth' });
    }
}

// 接收 totalFilteredLength，动态计算分页
function renderPaginationControls(totalFilteredLength) {
    const totalPages = Math.ceil(totalFilteredLength / itemsPerPage);
    const resultsArea = document.getElementById('resultsArea');
    
    let existingPagination = document.getElementById('paginationContainer');
    if (existingPagination) existingPagination.remove();

    if (totalPages <= 1) return; // 如果过滤后只有1页或没数据，不显示分页

    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'paginationContainer';
    // 增加了 flex-wrap 和 gap-y-3 适配手机端换行显示
    paginationDiv.className = 'w-full flex justify-center items-center mt-10 mb-6 flex-wrap gap-y-4 col-span-full';

    const prevDisabled = currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#333] hover:text-white cursor-pointer';
    const prevAction = currentPage === 1 ? '' : `onclick="changePage(${currentPage - 1})"`;

    const nextDisabled = currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#333] hover:text-white cursor-pointer';
    const nextAction = currentPage === totalPages ? '' : `onclick="changePage(${currentPage + 1})"`;

    paginationDiv.innerHTML = `
        <div class="flex items-center space-x-4">
            <button ${prevAction} class="px-4 py-2 bg-[#222] text-gray-300 border border-[#444] rounded-md transition-colors ${prevDisabled}">上一页</button>
            <span class="text-sm text-gray-400">
                第 <span class="text-white font-bold">${currentPage}</span> / ${totalPages} 页
                <span class="ml-2 text-xs hidden sm:inline">(共 ${totalFilteredLength} 条)</span>
            </span>
            <button ${nextAction} class="px-4 py-2 bg-[#222] text-gray-300 border border-[#444] rounded-md transition-colors ${nextDisabled}">下一页</button>
        </div>
        
        <div class="flex items-center space-x-2 w-full sm:w-auto justify-center sm:ml-6 sm:pl-6 sm:border-l border-[#444]">
            <span class="text-sm text-gray-400">跳至</span>
            <input type="number" id="jumpPageInput" min="1" max="${totalPages}" value="${currentPage}" 
                   class="w-16 px-2 py-1.5 bg-[#111] border border-[#444] rounded-md text-white text-center text-sm focus:outline-none focus:border-pink-600 focus:ring-1 focus:ring-pink-600"
                   onkeypress="if(event.key === 'Enter') jumpToPage(${totalPages})">
            <span class="text-sm text-gray-400">页</span>
            <button onclick="jumpToPage(${totalPages})" class="px-3 py-1.5 bg-[#222] text-gray-300 hover:bg-[#333] hover:text-white border border-[#444] rounded-md transition-colors text-sm">
                确定
            </button>
        </div>
    `;

    resultsArea.appendChild(paginationDiv);
}

// 处理翻页动作
function changePage(newPage) {
    const filteredData = currentCategory === '全部' ? 
        globalSearchResults : 
        globalSearchResults.filter(item => (item.source_name || '其他') === currentCategory);
        
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage(currentPage);
    }
}

// 新增：处理输入框跳转逻辑
function jumpToPage(totalPages) {
    const input = document.getElementById('jumpPageInput');
    if (!input) return;
    
    let newPage = parseInt(input.value);
    
    // 如果输入的不是数字，给个提示
    if (isNaN(newPage)) {
        if (typeof showToast === 'function') {
            showToast('请输入有效的页码', 'warning');
        }
        input.value = currentPage; // 恢复当前页
        return;
    }
    
    // 智能边界处理：输入太大跳最后一页，输入负数跳第一页
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    
    // 如果输入的刚好是当前页，就不重复渲染了
    if (newPage !== currentPage) {
        changePage(newPage);
    } else {
        input.value = currentPage; // 修正格式（比如输入01变成1）
    }
}

// =====================================================================
// === 全局分类标签与过滤模块 ===
// =====================================================================

// 1. 动态生成分类按钮
function renderCategoryTabs() {
    // 寻找或创建按钮容器
    let tabsContainer = document.getElementById('categoryTabsContainer');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.id = 'categoryTabsContainer';
        tabsContainer.className = 'w-full flex justify-center flex-wrap gap-3 mt-6 mb-4';
        
        // 插入到搜索框下方，结果列表上方
        const searchArea = document.getElementById('searchArea');
        if (searchArea) {
            searchArea.parentNode.insertBefore(tabsContainer, searchArea.nextSibling);
        }
    }

    // 从所有 479 条结果中，提取出所有不重复的来源名称 (source_name)
    const categories = ['全部'];
    globalSearchResults.forEach(item => {
        const source = item.source_name || '其他';
        if (!categories.includes(source)) {
            categories.push(source);
        }
    });

    // 渲染按钮（完美复刻您截图里的 UI 风格）
    tabsContainer.innerHTML = categories.map(cat => {
        const isActive = cat === currentCategory;
        const activeClass = isActive ? 'bg-[#E11D48] text-white' : 'bg-[#1F2937] text-gray-300 hover:bg-[#374151]';
        return `
            <button onclick="changeCategory('${cat}')" 
                    class="px-5 py-1.5 rounded-md text-sm cursor-pointer transition-colors border border-[#333] ${activeClass}">
                ${cat}
            </button>
        `;
    }).join('');
}

// 2. 切换分类动作
function changeCategory(newCategory) {
    currentCategory = newCategory;
    currentPage = 1; // 切换分类时，强制回到第1页
    
    // 重新渲染按钮高亮状态
    renderCategoryTabs();
    // 重新渲染当前页
    renderPage(currentPage);
}
