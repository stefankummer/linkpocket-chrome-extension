// LinkPocket Chrome Extension - Background Service Worker

const DEFAULT_SETTINGS = {
    apiEndpoint: 'https://linkpocket.app/api',
    autoGetSelection: true,
};

// Create context menus on install and on every browser start — the service
// worker is torn down aggressively, so menus must be (re)declared idempotently.
// onInstalled and onStartup can fire back-to-back and the storage read below is
// async, so runs must be serialized or both end up creating duplicate ids.
let menuSetupQueue = Promise.resolve();
function setupContextMenus() {
    menuSetupQueue = menuSetupQueue.then(() => new Promise((resolve) => {
        chrome.contextMenus.removeAll(async () => {
            const { apiKey } = await chrome.storage.local.get(['apiKey']);
            const enabled = !!apiKey;
            // Reading lastError keeps a lost race from surfacing as "Unchecked runtime.lastError"
            const swallowError = () => void chrome.runtime.lastError;

            chrome.contextMenus.create({
                id: 'saveToLinkPocket',
                title: chrome.i18n.getMessage('contextMenuSave'),
                contexts: ['page', 'link'],
                enabled: enabled,
            }, swallowError);

            chrome.contextMenus.create({
                id: 'quickSaveToLinkPocket',
                title: chrome.i18n.getMessage('contextMenuQuickSave'),
                contexts: ['page', 'link'],
                enabled: enabled,
            }, swallowError);

            resolve();
        });
    }));
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST a link with a hard timeout, so a flaky network does not look like a lost
 * session. Only failures that provably never reached the API are replayed —
 * the API does not de-duplicate, so replaying an ambiguous request (timeout,
 * 5xx) would create a second link.
 */
async function postLink(endpoint, apiKey, body) {
    const attempts = 3;
    let lastError;

    for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);

        try {
            const response = await fetch(`${endpoint}/links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (response.ok) return response.json().catch(() => null);

            const data = await response.json().catch(() => ({}));
            const error = new Error(data.message || `Error ${response.status}`);
            error.status = response.status;

            // Rate limiting is the only rejection we know did not save anything
            if (response.status !== 429) throw error;
            lastError = error;
        } catch (error) {
            if (error.status) throw error;

            if (error.name === 'AbortError') {
                throw new Error(
                    chrome.i18n.getMessage('notificationFailed') || 'Request timed out',
                );
            }

            // Connection never established — safe to try again
            lastError = error;
        } finally {
            clearTimeout(timer);
        }
    }

    throw lastError;
}

// Quick save function
async function quickSaveLink(url, title, tab) {
    try {
        const localData = await chrome.storage.local.get(['apiKey']);
        const syncData = await chrome.storage.sync.get(['settings']);

        const apiKey = localData.apiKey;
        // The endpoint is not user-configurable; always use the default
        const mergedSettings = { ...DEFAULT_SETTINGS, ...syncData.settings, apiEndpoint: DEFAULT_SETTINGS.apiEndpoint };

        if (!apiKey) {
            await sendNotification(
                chrome.i18n.getMessage('notificationConnect'),
                'error',
            );
            chrome.action.openPopup();
            return;
        }

        try {
            await postLink(mergedSettings.apiEndpoint, apiKey, {
                url: url,
                title: title || 'Quick Save',
            });
        } catch (error) {
            // A confirmed authentication failure is the only reason to drop the
            // token — anything else keeps the session intact.
            if (error.status === 401) {
                await chrome.storage.local.remove([
                    'apiKey',
                    'cachedUser',
                    'cachedFolders',
                    'cachedTags',
                ]);
            }
            throw error;
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

    try {
        await chrome.contextMenus.update('saveToLinkPocket', { enabled });
        await chrome.contextMenus.update('quickSaveToLinkPocket', { enabled });
    } catch {
        // Menus were dropped (worker restart, fresh profile) — recreate them
        setupContextMenus();
    }
}

// Listen for storage changes to update context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.apiKey) {
        updateContextMenu();
    }
});
