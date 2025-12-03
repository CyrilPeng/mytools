// --- 1. 预设数据定义 ---
const presetEnginesList = [
    { name: "知乎", url: "https://www.zhihu.com/search?type=content&q=%s", icon: "https://static.zhihu.com/heifetz/favicon.ico" },
    { name: "哔哩哔哩", url: "https://search.bilibili.com/all?keyword=%s", icon: "https://www.bilibili.com/favicon.ico" },
    { name: "GitHub", url: "https://github.com/search?q=%s", icon: "https://github.githubassets.com/favicons/favicon.svg" },
    { name: "豆瓣", url: "https://www.douban.com/search?q=%s", icon: "https://img1.doubanio.com/favicon.ico" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s", icon: "https://duckduckgo.com/favicon.ico" },
    { name: "小红书", url: "https://www.xiaohongshu.com/search_result?keyword=%s", icon: "https://www.xiaohongshu.com/favicon.ico" },
    { name: "淘宝", url: "https://s.taobao.com/search?q=%s", icon: "https://www.taobao.com/favicon.ico" },
    { name: "京东", url: "https://search.jd.com/Search?keyword=%s", icon: "https://www.jd.com/favicon.ico" }
];

const BOOTSTRAP_ICONS_LIST = [
    "bi-house-door", "bi-house-fill", "bi-grid", "bi-grid-fill", "bi-briefcase", "bi-briefcase-fill",
    "bi-shop", "bi-bag", "bi-bag-fill", "bi-cart", "bi-controller", "bi-joystick",
    "bi-music-note-beamed", "bi-headphones", "bi-camera", "bi-camera-video",
    "bi-book", "bi-journal-bookmark", "bi-code-slash", "bi-terminal",
    "bi-chat-dots", "bi-chat-quote", "bi-envelope", "bi-telegram",
    "bi-cloud", "bi-hdd-network", "bi-tools", "bi-wrench",
    "bi-calendar-date", "bi-clock", "bi-alarm", "bi-sun", "bi-moon-stars",
    "bi-people", "bi-person-circle", "bi-heart", "bi-heart-fill", "bi-star", "bi-star-fill",
    "bi-bookmark", "bi-bookmark-fill", "bi-lightbulb", "bi-lightning",
    "bi-palette", "bi-brush", "bi-pen", "bi-pencil-square",
    "bi-bank", "bi-building", "bi-hospital", "bi-airplane", "bi-cup-hot", "bi-film", "bi-wallet2"
];

// --- 2. 全局变量与默认值 ---
const defaultData = {
    activeCatIndex: 0,
    bgType: "img", 
    bgValue: "https://4kwallpapers.com/images/walls/thumbs_3t/18741.png",
    openTarget: "_blank",
    webdav: { url: "", user: "", pass: "" },
    categories: [
        { name: "主页", icon: "bi-house-door", sites: [
            {name:"Google", url:"https://google.com", type: "online"},
            {name:"哔哩哔哩",url:"http://www.bilibili.com/",type:"online"},
            {name:"知乎",url:"https://www.zhihu.com/",type:"online"},
            {name:"必应Bing",url:"https://cn.bing.com/",type:"online"} ] }, 
        { name: "办公", icon: "bi-briefcase", sites: [] },
        { name: "娱乐", icon: "bi-controller", sites: [] },
        { name: "购物", icon: "bi-bag", sites: [] }
    ],
    customEngines: [] 
};

const defaultEngines = {
    bing: { name: "必应", url: "https://cn.bing.com/search?q=", icon: "https://cn.bing.com/sa/simg/favicon-2x.ico" },
    google: { name: "谷歌", url: "https://www.google.com/search?q=", icon: "https://www.google.com/favicon.ico" },
    baidu: { name: "百度", url: "https://www.baidu.com/s?wd=", icon: "https://www.baidu.com/favicon.ico" }
};

let currentEngine = 'bing'; 
let appData = null; 
let contextMenuTargetIndex = -1; 
let isEditMode = false; 
let editingIndex = -1;
let tempIconData = { type: 'online', content: '', bgColor: '' };
let sidebarContextMenuIndex = -1;
let sidebarEditingIndex = -1;
let tempSidebarIcon = "";
let cropper = null; 
let dragSrcEl = null;
let dragType = null; 
let dragSrcIndex = -1;

const grid = document.getElementById('grid');
const sidebarList = document.getElementById('sidebarList');
const bgLayer = document.getElementById('bgLayer');
const searchInput = document.getElementById('searchInput');
const contextMenu = document.getElementById('contextMenu'); 
const sidebarContextMenu = document.getElementById('sidebarContextMenu'); 

// --- 辅助函数：提取域名 ---
function getDomain(url) {
    if (!url) return '';
    try {
        let fullUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : 'https://' + url;
        return new URL(fullUrl).hostname;
    } catch (e) {
        return ''; 
    }
}

// --- 辅助函数：图片 URL 转 Base64 (网页版增强容错) ---
async function urlToBase64(url) {
    try {
        // 在网页环境，跨域 fetch 通常会失败，除非目标服务器允许 CORS
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Icon cache failed (CORS/Network):", error);
        return null; // 返回 null 表示转换失败，后续逻辑应直接保存 URL
    }
}

// --- 3. 初始化流程 ---
document.addEventListener('DOMContentLoaded', () => {
    initContextMenu();          
    initSidebarContextMenu();   
    initSettings();             
    initDrawer();               
    initEngineModal();          
    initSidebarModal();         

    document.addEventListener('click', () => {
        if(contextMenu) contextMenu.style.display = 'none';
        if(sidebarContextMenu) sidebarContextMenu.style.display = 'none';
    });

    loadData();

    // 网页版监听 localStorage 变化（多标签页同步）
    window.addEventListener('storage', (e) => {
        if (e.key === 'myTabData') loadData();
    });
});

function loadData() {
    // 纯网页模式，只从 localStorage 读取
    try {
        const localStr = localStorage.getItem('myTabData');
        appData = localStr ? JSON.parse(localStr) : JSON.parse(JSON.stringify(defaultData));
        
        // 数据结构补全
        if(!appData.categories) appData.categories = defaultData.categories;
        if(!appData.customEngines) appData.customEngines = []; 
        if(!appData.bgType) appData.bgType = 'img';
        if(appData.openTarget === undefined) appData.openTarget = "_blank";
        
        renderUI();
        initSearch();
    } catch (e) {
        console.error("Load Data Error:", e);
        appData = JSON.parse(JSON.stringify(defaultData));
        renderUI();
    }
}

function saveData() {
    if (!appData) return; 
    // 纯网页模式，只存 localStorage
    localStorage.setItem('myTabData', JSON.stringify(appData));
    renderUI();
}

// --- 4. 核心渲染逻辑 ---
function renderUI() {
    if (!appData) return;

    if (appData.bgType === 'color') {
        bgLayer.style.backgroundImage = 'none';
        bgLayer.style.backgroundColor = appData.bgValue;
    } else {
        bgLayer.style.backgroundColor = '#333';
        bgLayer.style.backgroundImage = `url('${appData.bgValue}')`;
    }

    renderSidebar();
    
    // 防止分类索引越界
    if (appData.activeCatIndex >= appData.categories.length) {
        appData.activeCatIndex = 0;
    }

    const currentCat = appData.categories[appData.activeCatIndex];
    if(currentCat && currentCat.sites) {
        renderGrid(currentCat.sites);
    } else if (appData.categories.length > 0) {
        appData.activeCatIndex = 0;
        renderGrid(appData.categories[0].sites);
    }
}

function renderSidebar() {
    if (!appData) return;
    sidebarList.innerHTML = '';
    
    appData.categories.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = `sidebar-item ${index === appData.activeCatIndex ? 'active' : ''}`;
        item.setAttribute('draggable', 'true');
        item.dataset.index = index;
        
        let iconHtml = '';
        if (cat.icon && cat.icon.startsWith('bi-')) {
            iconHtml = `<i class="bi ${cat.icon}"></i>`;
        } else {
            iconHtml = cat.icon || '<i class="bi bi-grid"></i>';
        }

        item.innerHTML = `
            <div class="sidebar-icon">${iconHtml}</div>
            <div class="sidebar-text">${cat.name}</div>
        `;
        
        item.onclick = () => {
            appData.activeCatIndex = index;
            saveData();
        };

        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            showSidebarContextMenu(e, index);
        };

        addSidebarDragEvents(item, index);
        sidebarList.appendChild(item);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'sidebar-item';
    addBtn.innerHTML = `
        <div class="sidebar-icon"><i class="bi bi-plus-lg"></i></div>
        <div class="sidebar-text">添加</div>
    `;
    addBtn.onclick = () => openSidebarModal(-1); 
    sidebarList.appendChild(addBtn);
}

function renderGrid(sites, filterText = "") {
    grid.innerHTML = '';
    const displaySites = filterText 
        ? sites.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()))
        : sites;

    displaySites.forEach((site, index) => {
        const realIndex = sites.indexOf(site); 
        const div = document.createElement('div');
        div.className = 'app-icon';
        div.setAttribute('draggable', 'true');
        div.dataset.index = realIndex;
        
        let iconHtml = '';
        
        if (site.type === 'solid') {
            iconHtml = `
                <div class="icon-box" style="background:${site.bgColor}; color:white;">
                    <span>${site.content || site.name.substring(0,2)}</span>
                </div>`;
        } else {
            let imgSrc = site.content;
            const domain = getDomain(site.url);
            // 如果没有 content 或者 type 是 online 且 content 不是 base64，尝试使用在线 API
            if (!imgSrc && site.type === 'online') {
                imgSrc = `https://api.iowen.cn/favicon/${domain}.png`;
            }
            
            // 在网页版，content 可能直接存储的是 URL 而不是 base64
            // Fallback 处理
            const fallbackIconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            
            iconHtml = `
                <div class="icon-box">
                    <img src="${imgSrc}" data-fallback="${fallbackIconUrl}" draggable="false">
                </div>`;
        }

        div.innerHTML = `${iconHtml}<span class="app-name">${site.name}</span>`;

        const img = div.querySelector('img');
        if (img && site.type !== 'solid') {
            img.onerror = function() {
                const currentSrc = this.src;
                const fallback = this.getAttribute('data-fallback');
                if (currentSrc !== fallback && fallback && !currentSrc.startsWith('data:')) {
                    this.src = fallback;
                } else {
                    this.style.display = 'none';
                    this.parentNode.innerHTML = `<span>${site.name.substring(0,1)}</span>`;
                    this.parentNode.style.backgroundColor = '#ccc';
                    this.parentNode.style.color = '#fff';
                }
            };
        }

        div.onclick = () => {
            let url = site.url.startsWith('http') ? site.url : `https://${site.url}`;
            if (appData.openTarget === '_self') {
                window.location.href = url;
            } else {
                window.open(url, '_blank');
            }
        };

        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, realIndex);
        });

        addGridDragEvents(div, realIndex);
        grid.appendChild(div);
    });

    if (!filterText) {
        const addBtn = document.createElement('div');
        addBtn.className = 'app-icon';
        addBtn.innerHTML = `<div class="icon-box add-icon-box">+</div><span class="app-name">添加</span>`;
        addBtn.onclick = () => openDrawer(false);
        grid.appendChild(addBtn);
    }
}

// --- 拖拽逻辑 (保持不变) ---
function addSidebarDragEvents(item, index) {
    item.addEventListener('dragstart', (e) => {
        dragSrcEl = item;
        dragType = 'sidebar';
        dragSrcIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('drag-over'));
        dragSrcEl = null;
        dragType = null;
    });

    item.addEventListener('dragenter', (e) => {
        item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', (e) => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    });

    item.addEventListener('drop', (e) => {
        e.stopPropagation();
        item.classList.remove('drag-over');
        
        if (dragType === 'sidebar' && dragSrcEl !== item) {
            const dragIndex = dragSrcIndex;
            const dropIndex = index;
            const temp = appData.categories[dragIndex];
            appData.categories.splice(dragIndex, 1);
            appData.categories.splice(dropIndex, 0, temp);
            
            if (appData.activeCatIndex === dragIndex) {
                appData.activeCatIndex = dropIndex;
            } else {
                if (dragIndex < appData.activeCatIndex && dropIndex >= appData.activeCatIndex) {
                    appData.activeCatIndex--;
                } else if (dragIndex > appData.activeCatIndex && dropIndex <= appData.activeCatIndex) {
                    appData.activeCatIndex++;
                }
            }
            saveData();
            return;
        }

        if (dragType === 'grid') {
            if (index === appData.activeCatIndex) return; 
            const sourceSite = appData.categories[appData.activeCatIndex].sites[dragSrcIndex];
            if (sourceSite) {
                appData.categories[index].sites.push(sourceSite);
                appData.categories[appData.activeCatIndex].sites.splice(dragSrcIndex, 1);
                saveData();
            }
        }
    });
}

function addGridDragEvents(item, index) {
    item.addEventListener('dragstart', (e) => {
        dragSrcEl = item;
        dragType = 'grid';
        dragSrcIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        item.style.opacity = '0.4';
    });

    item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        document.querySelectorAll('.app-icon').forEach(el => el.classList.remove('drag-over'));
        dragSrcEl = null;
        dragType = null;
    });

    item.addEventListener('dragenter', () => {
        if(dragType === 'grid') item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('dragover', (e) => {
        if(dragType === 'grid') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    item.addEventListener('drop', (e) => {
        e.stopPropagation();
        if (dragType === 'grid' && dragSrcEl !== item) {
            const dragIndex = dragSrcIndex;
            const dropIndex = index;
            const sites = appData.categories[appData.activeCatIndex].sites;
            const temp = sites[dragIndex];
            sites.splice(dragIndex, 1);
            sites.splice(dropIndex, 0, temp);
            saveData();
        }
    });
}

// --- 5. 侧边栏 & 网格交互 ---
function initSidebarContextMenu() {
    const editBtn = document.getElementById('ctxSidebarEdit');
    const delBtn = document.getElementById('ctxSidebarDelete');

    editBtn.onclick = () => {
        if (sidebarContextMenuIndex > -1) openSidebarModal(sidebarContextMenuIndex);
        sidebarContextMenu.style.display = 'none';
    };

    delBtn.onclick = () => {
        if (sidebarContextMenuIndex > -1) {
            if (appData.categories.length <= 1) return alert("至少保留一个分类");
            if (confirm('确定删除该分类及其下所有图标吗？')) {
                appData.categories.splice(sidebarContextMenuIndex, 1);
                if (appData.activeCatIndex >= appData.categories.length) appData.activeCatIndex = 0;
                saveData();
            }
        }
        sidebarContextMenu.style.display = 'none';
    };
}

function showSidebarContextMenu(e, index) {
    sidebarContextMenuIndex = index;
    if(contextMenu) contextMenu.style.display = 'none';
    
    let top = e.clientY;
    let left = e.clientX + 10; 
    if (top + 100 > window.innerHeight) top = window.innerHeight - 100;

    sidebarContextMenu.style.display = 'block';
    sidebarContextMenu.style.top = `${top}px`;
    sidebarContextMenu.style.left = `${left}px`;
}

function initSidebarModal() {
    const modal = document.getElementById('sidebarModal');
    const closeBtn = document.getElementById('closeSidebarModal');
    const saveBtn = document.getElementById('saveSidebarBtn');
    const cancelBtn = document.getElementById('deleteSidebarBtn'); 
    const iconGrid = document.getElementById('sidebarIconGrid');
    const nameInput = document.getElementById('sidebarNameInput');
    const closeModal = () => modal.style.display = 'none';

    closeBtn.onclick = closeModal;
    if(cancelBtn) cancelBtn.onclick = closeModal;

    iconGrid.innerHTML = '';
    BOOTSTRAP_ICONS_LIST.forEach(iconClass => {
        const div = document.createElement('div');
        div.className = 's-icon-item';
        div.innerHTML = `<i class="bi ${iconClass}"></i>`;
        div.onclick = () => {
            tempSidebarIcon = iconClass;
            document.querySelectorAll('.s-icon-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
        };
        iconGrid.appendChild(div);
    });

    saveBtn.onclick = () => {
        const name = nameInput.value.trim();
        if (!name) return alert("请输入分类名称");

        if (sidebarEditingIndex === -1) {
            appData.categories.push({ name: name, icon: tempSidebarIcon || "bi-grid", sites: [] });
            appData.activeCatIndex = appData.categories.length - 1;
        } else {
            const cat = appData.categories[sidebarEditingIndex];
            cat.name = name;
            cat.icon = tempSidebarIcon;
        }
        saveData();
        closeModal();
    };
}

function openSidebarModal(index) {
    sidebarEditingIndex = index;
    const modal = document.getElementById('sidebarModal');
    const nameInput = document.getElementById('sidebarNameInput');
    const title = modal.querySelector('h3');

    document.querySelectorAll('.s-icon-item').forEach(el => el.classList.remove('selected'));

    if (index === -1) {
        title.textContent = "新建分组";
        nameInput.value = '';
        tempSidebarIcon = 'bi-grid'; 
    } else {
        title.textContent = "编辑分组";
        const cat = appData.categories[index];
        nameInput.value = cat.name;
        tempSidebarIcon = cat.icon;

        const items = document.querySelectorAll('.s-icon-item');
        for(let item of items) {
            if(item.innerHTML.includes(tempSidebarIcon)) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'center' });
                break;
            }
        }
    }
    modal.style.display = 'flex';
}

function initContextMenu() {
    document.getElementById('ctxOpenCurrent').onclick = () => {
        const site = appData.categories[appData.activeCatIndex].sites[contextMenuTargetIndex];
        window.location.href = site.url.startsWith('http') ? site.url : `https://${site.url}`;
    };
    document.getElementById('ctxOpenNew').onclick = () => {
        const site = appData.categories[appData.activeCatIndex].sites[contextMenuTargetIndex];
        window.open(site.url.startsWith('http') ? site.url : `https://${site.url}`, '_blank');
    };
    document.getElementById('ctxEdit').onclick = () => {
        openDrawer(true, contextMenuTargetIndex); 
        contextMenu.style.display = 'none';
    };
    document.getElementById('ctxDelete').onclick = () => {
        if(confirm('确定删除此图标吗？')) {
            appData.categories[appData.activeCatIndex].sites.splice(contextMenuTargetIndex, 1);
            saveData();
        }
        contextMenu.style.display = 'none';
    };
}

function showContextMenu(e, index) {
    contextMenuTargetIndex = index;
    if(sidebarContextMenu) sidebarContextMenu.style.display = 'none';
    
    const menuWidth = 150;
    const menuHeight = 160;
    let top = e.clientY;
    let left = e.clientX;

    if (left + menuWidth > window.innerWidth) left -= menuWidth;
    if (top + menuHeight > window.innerHeight) top -= menuHeight;

    contextMenu.style.display = 'block';
    contextMenu.style.top = `${top}px`;
    contextMenu.style.left = `${left}px`;
}

// --- 6. 搜索引擎逻辑 ---
function initSearch() {
    if (!appData || !appData.customEngines) return;

    const engineSelectBtn = document.getElementById('engineSelectBtn');
    const engineDropdown = document.getElementById('engineDropdown');
    const currentEngineIcon = document.getElementById('currentEngineIcon');
    
    let allEngines = { ...defaultEngines };
    appData.customEngines.forEach(eng => allEngines[eng.name] = eng);
    
    if (!allEngines[currentEngine]) currentEngine = 'bing';
    currentEngineIcon.src = allEngines[currentEngine].icon;
    searchInput.placeholder = `在 ${allEngines[currentEngine].name} 中搜索...`;
    
    engineSelectBtn.onclick = (e) => {
        e.stopPropagation();
        const isVisible = engineDropdown.style.display === 'flex';
        engineDropdown.style.display = isVisible ? 'none' : 'flex';
        if(isVisible) engineSelectBtn.classList.remove('active');
        else engineSelectBtn.classList.add('active');
    };
    
    engineDropdown.innerHTML = '';
    Object.keys(allEngines).forEach(key => {
        const eng = allEngines[key];
        const item = document.createElement('div');
        item.className = 'engine-item';
        item.innerHTML = `<img src="${eng.icon}"><span>${eng.name}</span>`;
        const img = item.querySelector('img');
        if(img) img.onerror = function() { this.src = 'icon.png'; };

        item.onclick = () => {
            currentEngine = key;
            currentEngineIcon.src = eng.icon;
            searchInput.placeholder = `在 ${eng.name} 中搜索...`;
            engineDropdown.style.display = 'none';
            engineSelectBtn.classList.remove('active');
        };
        engineDropdown.appendChild(item);
    });

    const addItem = document.createElement('div');
    addItem.className = 'engine-item';
    addItem.innerHTML = `<div class="add-symbol">+</div><span>添加</span>`;
    addItem.onclick = (e) => {
        e.stopPropagation(); 
        const modal = document.getElementById('engineModal');
        modal.style.display = 'flex'; 
        if(modal.renderPresets) modal.renderPresets();
        engineDropdown.style.display = 'none';
        engineSelectBtn.classList.remove('active');
    };
    engineDropdown.appendChild(addItem);

    document.onclick = (e) => {
        if (engineDropdown.style.display === 'flex' && !engineSelectBtn.contains(e.target) && !engineDropdown.contains(e.target)) {
            engineDropdown.style.display = 'none';
            engineSelectBtn.classList.remove('active');
        }
    };

    searchInput.oninput = (e) => {
        const val = e.target.value.trim();
        if (appData && appData.categories) renderGrid(appData.categories[appData.activeCatIndex].sites, val);
    };

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const val = searchInput.value;
            if (val) {
                const eng = allEngines[currentEngine];
                let targetUrl = eng.url;
                if (eng.isCustom && targetUrl.includes('%s')) {
                    targetUrl = targetUrl.replace('%s', encodeURIComponent(val));
                } else {
                    targetUrl = targetUrl + encodeURIComponent(val);
                }
                if (appData.openTarget === '_self') {
                    window.location.href = targetUrl;
                } else {
                    window.open(targetUrl, '_blank');
                }
            }
        }
    };
}

function initEngineModal() {
    const modal = document.getElementById('engineModal');
    const closeBtn = document.querySelector('.close-engine-modal');
    const grid = document.getElementById('presetEngineGrid');
    const saveCustomBtn = document.getElementById('saveCustomEngineBtn');
    const customUrlInput = document.getElementById('customEngineUrlInput');
    const customNameInput = document.getElementById('customEngineNameInput');

    closeBtn.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

    modal.renderPresets = () => {
        grid.innerHTML = '';
        const addedNames = appData.customEngines.map(e => e.name);
        const defaultNames = Object.values(defaultEngines).map(e => e.name);

        presetEnginesList.forEach(preset => {
            const isAdded = addedNames.includes(preset.name);
            const isDefault = defaultNames.includes(preset.name);
            
            const item = document.createElement('div');
            item.className = `preset-item ${isAdded ? 'selected' : ''}`;
            if (isDefault) item.style.opacity = '0.5';

            item.innerHTML = `
                <div class="preset-checkbox"></div>
                <div class="preset-info">
                    <div class="preset-top">
                        <img src="${preset.icon}" class="preset-icon"> 
                        <span class="preset-name">${preset.name}</span>
                    </div>
                    <div class="preset-url">${preset.url}</div>
                </div>
            `;

            if (!isDefault) {
                item.onclick = () => {
                    const alreadyAddedIndex = appData.customEngines.findIndex(e => e.name === preset.name);
                    if (alreadyAddedIndex > -1) {
                        appData.customEngines.splice(alreadyAddedIndex, 1);
                        item.classList.remove('selected');
                    } else {
                        appData.customEngines.push(preset);
                        item.classList.add('selected');
                    }
                    saveData();
                    initSearch(); 
                };
            }
            grid.appendChild(item);
        });
    };

    saveCustomBtn.onclick = () => {
        const urlStr = customUrlInput.value.trim();
        let nameStr = customNameInput.value.trim();
        if (!urlStr) return alert('请输入网址');
        if (!nameStr) nameStr = "自定义";
        
        appData.customEngines.push({
            name: nameStr, 
            url: urlStr, 
            icon: `https://api.iowen.cn/favicon/${getDomain(urlStr)}.png`, 
            isCustom: true
        });
        saveData();
        initSearch();
        customUrlInput.value = ''; customNameInput.value = '';
        modal.renderPresets(); 
    };
}

// --- 7. 设置窗口 ---
function initSettings() {
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettings');
    const settingsBtn = document.getElementById('settingsBtn');
    
    if(settingsBtn) {
        settingsBtn.onclick = () => {
            if (!appData) return; 
            
            const isColor = appData.bgType === 'color';
            const bgRadio = document.querySelector(`input[name="bgType"][value="${isColor ? 'color' : 'img'}"]`);
            if(bgRadio) bgRadio.checked = true;
            document.getElementById('bgInputGroupUrl').style.display = isColor ? 'none' : 'block';
            document.getElementById('bgInputGroupColor').style.display = isColor ? 'block' : 'none';

            if (isColor) document.getElementById('bgColorInput').value = appData.bgValue;
            else document.getElementById('bgInput').value = appData.bgValue;

            if(appData.webdav) {
                document.getElementById('davUrl').value = appData.webdav.url || "";
                document.getElementById('davUser').value = appData.webdav.user || "";
                document.getElementById('davPass').value = appData.webdav.pass || "";
            }

            const targetValueSpan = document.getElementById('openTargetValue');
            targetValueSpan.innerText = (appData.openTarget === '_self') ? '当前标签页' : '新标签页';

            document.querySelector('.nav-item[data-target="set-general"]').click();
            modal.style.display = 'flex';
        };
    }

    closeBtn.onclick = () => modal.style.display = 'none';

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.setting-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        };
    });

    const openTargetControl = document.getElementById('openTargetControl');
    if(openTargetControl) {
        openTargetControl.onclick = () => {
            if (appData.openTarget === '_blank') {
                appData.openTarget = '_self';
            } else {
                appData.openTarget = '_blank';
            }
            const targetValueSpan = document.getElementById('openTargetValue');
            targetValueSpan.innerText = (appData.openTarget === '_self') ? '当前标签页' : '新标签页';
            saveData();
        };
    }

    document.querySelectorAll('input[name="bgType"]').forEach(radio => {
        radio.onchange = (e) => {
            const isColor = e.target.value === 'color';
            document.getElementById('bgInputGroupUrl').style.display = isColor ? 'none' : 'block';
            document.getElementById('bgInputGroupColor').style.display = isColor ? 'block' : 'none';
        };
    });

    document.getElementById('saveBgBtn').onclick = () => {
        const type = document.querySelector('input[name="bgType"]:checked').value;
        let value = type === 'img' ? document.getElementById('bgInput').value : document.getElementById('bgColorInput').value;
        if (value) {
            appData.bgType = type;
            appData.bgValue = value;
            saveData();
            modal.style.display = 'none';
        }
    };

    document.getElementById('exportLocalBtn').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
        const a = document.createElement('a');
        a.href = dataStr; a.download = "mytab_backup.json"; a.click();
    };

    document.getElementById('importLocalBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const newData = JSON.parse(evt.target.result);
                if(newData && newData.categories) {
                    appData = newData;
                    saveData();
                    alert("恢复成功");
                    modal.style.display = 'none';
                } else alert("文件格式不对");
            } catch(e) { alert("文件解析失败"); }
        }
        reader.readAsText(file);
    };

    const davMsg = document.getElementById('davMsg');
    const getDav = () => ({
        url: document.getElementById('davUrl').value,
        user: document.getElementById('davUser').value,
        pass: document.getElementById('davPass').value
    });
    document.getElementById('davUploadBtn').onclick = async () => {
        const {url, user, pass} = getDav();
        appData.webdav = {url, user, pass};
        try {
            davMsg.textContent = "上传中...";
            await fetch(url + 'mytab_backup.json', {
                method: 'PUT',
                headers: {'Authorization': 'Basic ' + btoa(user + ":" + pass)},
                body: JSON.stringify(appData)
            });
            davMsg.textContent = "上传成功";
            saveData();
        } catch(e) { davMsg.textContent = "失败:" + e.message; }
    };
    document.getElementById('davDownloadBtn').onclick = async () => {
        const {url, user, pass} = getDav();
        try {
            davMsg.textContent = "下载中...";
            const res = await fetch(url + 'mytab_backup.json', {
                headers: {'Authorization': 'Basic ' + btoa(user + ":" + pass)}
            });
            if(res.ok) {
                appData = await res.json();
                saveData();
                davMsg.textContent = "恢复成功";
                modal.style.display = 'none';
            } else throw new Error(res.status);
        } catch(e) { davMsg.textContent = "失败:" + e.message; }
    };
}

// --- 8. 图标添加/编辑抽屉 ---
function initDrawer() {
    const backBtn = document.getElementById('closeDrawerBtn');
    if (backBtn) backBtn.onclick = closeDrawer;
    document.getElementById('drawerOverlay').onclick = closeDrawer;

    const tabs = document.querySelectorAll('.type-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tab.dataset.type}`).classList.add('active');
            tempIconData.type = tab.dataset.type;
            updatePreview();
        };
    });

    document.getElementById('drawerUrl').addEventListener('input', () => {
        if(tempIconData.type === 'online') updatePreview();
    });

    document.getElementById('drawerIconText').addEventListener('input', (e) => {
        tempIconData.content = e.target.value;
        if(tempIconData.type === 'solid') updatePreview();
    });

    document.getElementById('drawerName').addEventListener('input', () => {
        if(tempIconData.type === 'solid') updatePreview();
    });
    
    const colorGrid = document.getElementById('colorGrid');
    const solidColors = ["#FF9C9C", "#FFB785", "#FFD685", "#D4FF85", "#9CFF9C", "#85FFD6", "#85E0FF", "#85B7FF", "#9C9CFF", "#D685FF", "#FF85E0", "#FF85B7", "#C0C0C0", "#505050"];
    colorGrid.innerHTML = '';
    solidColors.forEach(c => {
        const d = document.createElement('div');
        d.className = 'color-circle';
        d.style.backgroundColor = c;
        d.onclick = () => {
            document.querySelectorAll('.color-circle').forEach(x => x.classList.remove('selected'));
            d.classList.add('selected');
            tempIconData.bgColor = c;
            updatePreview();
        };
        colorGrid.appendChild(d);
    });

    const uploadArea = document.getElementById('uploadArea');
    const localFileInput = document.getElementById('localFileInput');
    
    uploadArea.onclick = () => localFileInput.click();
    localFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                openCropper(evt.target.result);
                localFileInput.value = ''; 
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('saveDrawerBtn').onclick = saveDrawerData;

    document.getElementById('cancelCropBtn').onclick = () => {
        document.getElementById('cropperModal').style.display = 'none';
        if (cropper) cropper.destroy();
    };

    document.getElementById('confirmCropBtn').onclick = () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({
            width: 256, 
            height: 256
        });
        const base64Url = canvas.toDataURL('image/png');
        
        tempIconData.content = base64Url;
        updatePreview();
        
        document.getElementById('cropperModal').style.display = 'none';
        cropper.destroy();
    };
}

function openCropper(imageSrc) {
    const modal = document.getElementById('cropperModal');
    const image = document.getElementById('cropperImage');
    
    modal.style.display = 'flex';
    image.src = imageSrc;

    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(image, {
        aspectRatio: 1, 
        viewMode: 1,   
        autoCropArea: 0.8,
        background: false,
        zoomable: true
    });
}

function openDrawer(isEdit, index = -1) {
    if(!appData) return;
    isEditMode = isEdit;
    editingIndex = index;
    
    const drawerUrl = document.getElementById('drawerUrl');
    const drawerName = document.getElementById('drawerName');
    const drawerIconText = document.getElementById('drawerIconText');
    const title = document.getElementById('drawerTitle');
    
    title.textContent = isEdit ? "编辑图标" : "自定义添加";

    drawerUrl.value = '';
    drawerName.value = '';
    drawerIconText.value = '';
    
    tempIconData = { type: 'online', content: '', bgColor: '#FF9C9C' };
    
    const onlineTab = document.querySelector('.type-tab[data-type="online"]');
    if(onlineTab) onlineTab.click();

    if (isEdit) {
        const site = appData.categories[appData.activeCatIndex].sites[index];
        drawerUrl.value = site.url;
        drawerName.value = site.name;
        tempIconData.type = site.type || 'online';
        tempIconData.content = site.content || ''; 
        tempIconData.bgColor = site.bgColor || '#FF9C9C';
        
        if(tempIconData.type === 'solid') drawerIconText.value = tempIconData.content;
        
        const targetTab = document.querySelector(`.type-tab[data-type="${tempIconData.type}"]`);
        if(targetTab) targetTab.click();
    }

    updatePreview();
    const drawer = document.getElementById('editDrawer');
    const overlay = document.getElementById('drawerOverlay');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('show');
        drawer.classList.add('open');
    }, 10);
}

function closeDrawer() {
    const drawer = document.getElementById('editDrawer');
    const overlay = document.getElementById('drawerOverlay');
    drawer.classList.remove('open');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

function updatePreview() {
    const drawerUrl = document.getElementById('drawerUrl');
    const drawerName = document.getElementById('drawerName');
    const drawerIconText = document.getElementById('drawerIconText');
    const previewBox = document.getElementById('previewBox');
    const previewImg = document.getElementById('previewImg');
    const previewText = document.getElementById('previewText');

    previewBox.style.backgroundColor = 'rgba(255,255,255,0.9)';
    previewBox.style.color = '#333';
    previewImg.style.display = 'none';
    previewText.textContent = '';
    previewImg.onload = null;
    previewImg.onerror = null;

    if (tempIconData.type === 'online') {
        const urlVal = drawerUrl.value.trim();
        let targetSrc = "";
        let useFallback = false;
        const domain = getDomain(urlVal);

        if (tempIconData.content && tempIconData.content.startsWith('data:')) {
            targetSrc = tempIconData.content;
        } else if (urlVal && domain) {
            targetSrc = `https://api.iowen.cn/favicon/${domain}.png`;
            useFallback = true; 
        }

        if (targetSrc) {
            previewImg.src = targetSrc;
            previewImg.onload = function() {
                this.style.display = 'block';
                previewText.textContent = '';
            };
            previewImg.onerror = function() {
                if (useFallback && !this.src.includes('google.com')) {
                    this.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                } else {
                    this.style.display = 'none';
                    previewText.textContent = '?';
                }
            };
        } else {
            previewText.textContent = "?";
        }
    } else if (tempIconData.type === 'solid') {
        previewBox.style.backgroundColor = tempIconData.bgColor;
        previewBox.style.color = 'white';
        const text = drawerIconText.value || drawerName.value.substring(0, 2) || "图标";
        previewText.textContent = text;
    } else if (tempIconData.type === 'local') {
        if (tempIconData.content) {
            previewImg.src = tempIconData.content;
            previewImg.style.display = 'block';
        } else {
            previewText.textContent = "无图";
        }
    }
}

async function saveDrawerData() {
    if(!appData) return;
    const drawerUrl = document.getElementById('drawerUrl');
    const drawerName = document.getElementById('drawerName');
    const saveBtn = document.getElementById('saveDrawerBtn');
    
    const name = drawerName.value.trim();
    let url = drawerUrl.value.trim();

    if (!name || !url) return alert("请填写名称和网址");
    if (!url.startsWith('http')) url = 'https://' + url;

    saveBtn.innerText = "处理中...";
    saveBtn.disabled = true;

    if (tempIconData.type === 'online') {
        const domain = getDomain(url);
        // 如果没有手动上传或裁剪的 Base64 内容，尝试在线获取并转存
        if (!tempIconData.content || !tempIconData.content.startsWith('data:')) {
            const apiUrl = `https://api.iowen.cn/favicon/${domain}.png`;
            // 尝试转为 Base64
            const base64 = await urlToBase64(apiUrl);
            if (base64) {
                tempIconData.content = base64;
            } else {
                // 如果转 Base64 失败（跨域问题），直接保存 URL 字符串
                // 渲染时 img 标签可以直接加载这个 URL
                tempIconData.content = apiUrl;
            }
        }
    }

    const newSite = {
        name: name,
        url: url,
        type: tempIconData.type,
        content: tempIconData.content,
        bgColor: tempIconData.bgColor
    };

    if (newSite.type === 'solid' && !newSite.content) newSite.content = name.substring(0, 2);

    if (isEditMode) appData.categories[appData.activeCatIndex].sites[editingIndex] = newSite;
    else appData.categories[appData.activeCatIndex].sites.push(newSite);

    saveData();
    
    saveBtn.innerText = "完成";
    saveBtn.disabled = false;
    
    closeDrawer();
}
