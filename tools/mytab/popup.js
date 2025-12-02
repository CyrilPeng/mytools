document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const catSelect = document.getElementById('catSelect');
    const addBtn = document.getElementById('addBtn');
    const pIcon = document.getElementById('pIcon');
    const pTitle = document.getElementById('pTitle');
    const msg = document.getElementById('msg');

    let currentUrl = "";

    // 1. 获取当前标签页信息
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tab = tabs[0];
        currentUrl = tab.url;
        nameInput.value = tab.title;
        pTitle.textContent = tab.title;
        pIcon.src = `https://www.google.com/s2/favicons?domain=${tab.url}&sz=64`;
    });

    // 2. 读取分类数据填充下拉框
    chrome.storage.local.get(['myTabData'], (result) => {
        if (result.myTabData && result.myTabData.categories) {
            result.myTabData.categories.forEach((cat, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = cat.name;
                // 默认选中当前活跃的分类
                if (index === result.myTabData.activeCatIndex) {
                    option.selected = true;
                }
                catSelect.appendChild(option);
            });
        }
    });

    // 3. 保存逻辑
    addBtn.addEventListener('click', () => {
        const name = nameInput.value;
        const catIndex = parseInt(catSelect.value);

        if (!name || !currentUrl) return;

        chrome.storage.local.get(['myTabData'], (result) => {
            const data = result.myTabData;
            // 添加到对应分类的数组中
            data.categories[catIndex].sites.push({
                name: name,
                url: currentUrl
            });

            // 保存回 storage
            chrome.storage.local.set({ myTabData: data }, () => {
                msg.style.display = 'block';
                addBtn.textContent = '已添加';
                addBtn.disabled = true;
                setTimeout(() => window.close(), 1000); // 1秒后自动关闭弹窗
            });
        });
    });
});
