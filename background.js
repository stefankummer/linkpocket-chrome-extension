// LinkPocket Chrome Extension - Background Service Worker

const DEFAULT_SETTINGS = {
    apiEndpoint: 'https://linkpocket.app/api',
    autoGetSelection: true,
};

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(async () => {
        const { apiKey } = await chrome.storage.local.get(['apiKey']);
        const enabled = !!apiKey;

        chrome.contextMenus.create({
            id: 'saveToLinkPocket',
            title: chrome.i18n.getMessage('contextMenuSave'),
            contexts: ['page', 'link'],
            enabled: enabled,
        });

        chrome.contextMenus.create({
            id: 'quickSaveToLinkPocket',
            title: chrome.i18n.getMessage('contextMenuQuickSave'),
            contexts: ['page', 'link'],
            enabled: enabled,
        });
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const url = info.linkUrl || info.pageUrl || tab.url;
    const title = tab.title || url;

    if (info.menuItemId === 'saveToLinkPocket') {
        await chrome.storage.local.set({
            pendingUrl: url,
            pendingTitle: title,
        });
        chrome.action.openPopup();
    } else if (info.menuItemId === 'quickSaveToLinkPocket') {
        await quickSaveLink(url, title, tab);
    }
});

// Quick save function
async function quickSaveLink(url, title, tab) {
    try {
        const localData = await chrome.storage.local.get(['apiKey']);
        const syncData = await chrome.storage.sync.get(['settings']);

        const apiKey = localData.apiKey;
        const mergedSettings = { ...DEFAULT_SETTINGS, ...syncData.settings };

        if (!apiKey) {
            await sendNotification(
                chrome.i18n.getMessage('notificationConnect'),
                'error',
            );
            chrome.action.openPopup();
            return;
        }

        const response = await fetch(`${mergedSettings.apiEndpoint}/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url: url,
                title: title || 'Quick Save',
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to save');
        }

        await sendNotification(
            chrome.i18n.getMessage('notificationSaved'),
            'success',
        );

        // Send visual feedback to content script
        const sendMessage = async () => {
            return chrome.tabs.sendMessage(tab.id, {
                type: 'LINK_SAVED',
                success: true,
            });
        };

        try {
            await sendMessage();
        } catch {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js'],
                });
                await new Promise((resolve) => setTimeout(resolve, 100));
                await sendMessage();
            } catch {
                // Silent fail - notification already shown
            }
        }
    } catch (error) {
        console.error('Quick save error:', error);
        await sendNotification(
            error.message || chrome.i18n.getMessage('notificationFailed'),
            'error',
        );
    }
}

// Send notification helper
async function sendNotification(message, type = 'info') {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'LinkPocket',
        message: message,
        priority: 1,
    });
}

// Listen for keyboard shortcuts
chrome.commands?.onCommand?.addListener(async (command) => {
    if (command === 'quick-save') {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab?.id || !tab?.url || tab.url.startsWith('chrome://')) return;

        // Ensure content script is injected
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js'],
            });
        } catch {
            // Ignore
        }

        await quickSaveLink(tab.url, tab.title, tab);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PENDING_LINK') {
        chrome.storage.local.get(['pendingUrl', 'pendingTitle'], (data) => {
            sendResponse(data);
            chrome.storage.local.remove(['pendingUrl', 'pendingTitle']);
        });
        return true;
    }

    if (request.type === 'QUICK_SAVE') {
        quickSaveLink(request.url, request.title, request.tab)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Update context menu based on auth status
async function updateContextMenu() {
    const { apiKey } = await chrome.storage.local.get(['apiKey']);
    const enabled = !!apiKey;

    chrome.contextMenus.update('saveToLinkPocket', { enabled });
    chrome.contextMenus.update('quickSaveToLinkPocket', { enabled });
}

// Listen for storage changes to update context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.apiKey) {
        updateContextMenu();
    }
});
