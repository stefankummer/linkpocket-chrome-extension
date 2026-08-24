// LinkPocket Chrome Extension - Background Service Worker

// The popup's own catalogue, so menu titles and notifications follow the
// language chosen in the settings rather than the browser UI language alone.
importScripts('locales.js');

const DEFAULT_SETTINGS = {
    apiEndpoint: 'https://linkpocket.app/api',
    autoGetSelection: true,
    contextMenuEnabled: true,
    quickSavePortfolioId: null,
    quickSaveFolderId: null,
};

/** Settings as the popup writes them, with the defaults filled in. */
async function loadSettings() {
    const { settings } = await chrome.storage.sync.get(['settings']);
    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        // The endpoint is not user-configurable; always use the default
        apiEndpoint: DEFAULT_SETTINGS.apiEndpoint,
        // No explicit choice means "follow the browser"
        language: settings?.language || detectLanguage(),
    };
}

// Create context menus on install and on every browser start — the service
// worker is torn down aggressively, so menus must be (re)declared idempotently.
// onInstalled and onStartup can fire back-to-back and the storage read below is
// async, so runs must be serialized or both end up creating duplicate ids.
let menuSetupQueue = Promise.resolve();
function setupContextMenus() {
    menuSetupQueue = menuSetupQueue.then(() => new Promise((resolve) => {
        chrome.contextMenus.removeAll(async () => {
            // Reading lastError keeps a lost race from surfacing as "Unchecked runtime.lastError"
            const swallowError = () => void chrome.runtime.lastError;

            const [{ apiKey }, settings] = await Promise.all([
                chrome.storage.local.get(['apiKey']),
                loadSettings(),
            ]);

            // Opting out removes the entries outright: a greyed-out entry would
            // still take up room in every right-click menu.
            if (settings.contextMenuEnabled === false) return resolve();

            const enabled = !!apiKey;

            chrome.contextMenus.create({
                id: 'saveToLinkPocket',
                title: t('contextMenuSave', settings.language),
                contexts: ['page', 'link'],
                enabled: enabled,
            }, swallowError);

            chrome.contextMenus.create({
                id: 'quickSaveToLinkPocket',
                title: t('contextMenuQuickSave', settings.language),
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
    const url = info.linkUrl || info.pageUrl || tab?.url;
    if (!url) return;

    // The tab title describes the page, not the link that was right-clicked —
    // the target page's own meta tags are the only honest source for that one.
    const title = info.linkUrl ? '' : tab?.title || '';

    if (info.menuItemId === 'saveToLinkPocket') {
        // Claimed by the popup on open (PENDING_LINK_TTL), which then opens on
        // the save form instead of the home screen.
        await chrome.storage.local.set({
            pendingUrl: url,
            pendingTitle: title,
            pendingAt: Date.now(),
        });

        try {
            await chrome.action.openPopup();
        } catch {
            // Some Chromium builds refuse openPopup() without a toolbar click:
            // say so rather than leaving the click with no visible outcome.
            const { language } = await loadSettings();
            await sendNotification(t('notificationOpenPopup', language));
        }
    } else if (info.menuItemId === 'quickSaveToLinkPocket') {
        await quickSaveLink(url, title, tab);
    }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Last-resort title for a link nothing could describe. */
function hostnameOf(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

/**
 * POST a link with a hard timeout, so a flaky network does not look like a lost
 * session. Only failures that provably never reached the API are replayed —
 * the API does not de-duplicate, so replaying an ambiguous request (timeout,
 * 5xx) would create a second link.
 */
async function postLink(endpoint, apiKey, body, language) {
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
                throw new Error(t('notificationFailed', language));
            }

            // Connection never established — safe to try again
            lastError = error;
        } finally {
            clearTimeout(timer);
        }
    }

    throw lastError;
}

/**
 * A right-clicked link carries no title of its own, and "Quick Save" is a poor
 * one. Ask the API for the target page's meta title; a failure (older API,
 * plan limit, flaky network) falls back to the host name, never to a stall.
 */
async function resolveTitle(endpoint, apiKey, url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(`${endpoint}/links/fetch-meta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ url }),
            signal: controller.signal,
        });
        if (!response.ok) return '';

        const meta = await response.json().catch(() => null);
        return meta?.title || '';
    } catch {
        return '';
    } finally {
        clearTimeout(timer);
    }
}

// Quick save function
async function quickSaveLink(url, title, tab) {
    const settings = await loadSettings();

    try {
        const { apiKey } = await chrome.storage.local.get(['apiKey']);

        if (!apiKey) {
            await sendNotification(
                t('notificationConnect', settings.language),
                'error',
            );
            chrome.action.openPopup();
            return;
        }

        const resolvedTitle = title || (await resolveTitle(settings.apiEndpoint, apiKey, url)) || hostnameOf(url);

        // The quick save never opens the popup, so its destination comes from
        // the settings: a library and, optionally, a folder inside it.
        const body = { url, title: resolvedTitle };
        if (settings.quickSaveFolderId) body.categories = [settings.quickSaveFolderId];
        if (settings.quickSavePortfolioId) body.portfolio_id = settings.quickSavePortfolioId;

        try {
            await postLink(settings.apiEndpoint, apiKey, body, settings.language);
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
            t('notificationSaved', settings.language),
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
            error.message || t('notificationFailed', settings.language),
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

// The token decides whether the entries are clickable; the settings decide
// whether they exist at all and in which language. A rebuild answers both, and
// is idempotent — worth more than an update() that cannot create what is gone.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if ((namespace === 'local' && changes.apiKey) || (namespace === 'sync' && changes.settings)) {
        setupContextMenus();
    }
});
