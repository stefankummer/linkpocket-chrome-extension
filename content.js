// Content script for LinkPocket
let notificationContainer = null;

function getNotificationContainer() {
    if (notificationContainer) return notificationContainer;

    const container = document.createElement('div');
    container.id = 'linkpocket-notification-root';

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        .notification-wrapper {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            pointer-events: none;
        }

        .toast {
            background: #1E1E1E;
            color: #f9fafb;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
        }

        .toast.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .toast.success {
            border-left: 4px solid #FF6E40;
        }

        .toast.error {
            border-left: 4px solid #ef4444;
        }

        .icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'notification-wrapper';

    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    document.body.appendChild(container);

    notificationContainer = { shadow, wrapper };
    return notificationContainer;
}

function showNotification(message, type = 'success') {
    const { wrapper } = getNotificationContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const successIcon = `<svg class="icon" fill="none" stroke="#FF6E40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    const errorIcon = `<svg class="icon" fill="none" stroke="#ef4444" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

    const iconContainer = document.createElement('span');
    iconContainer.innerHTML = type === 'success' ? successIcon : errorIcon;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.appendChild(iconContainer.firstElementChild);
    toast.appendChild(textSpan);

    wrapper.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            if (wrapper.contains(toast)) {
                wrapper.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'LINK_SAVED') {
        if (request.success) {
            showNotification(
                chrome.i18n.getMessage('notificationSaved'),
                'success',
            );
        } else {
            showNotification(
                request.error || chrome.i18n.getMessage('notificationFailed'),
                'error',
            );
        }
    }
});
