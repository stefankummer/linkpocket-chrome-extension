// LinkPocket Chrome Extension — Popup Script (v2 Mobile App Style)

class LinkPocketApp {
    constructor() {
        this.apiKey = null;
        this.user = null;
        this.settings = {
            apiEndpoint: 'https://linkpocket.app/api',
            autoGetSelection: true,
            language: 'en',
            theme: 'dark',
        };
        this.tags = [];
        this.folders = [];
        this.selectedTags = [];
        this.selectedFolder = null;
        this.currentLang = 'en';

        // Library state
        this.links = [];
        this.linksFilter = 'recent';
        this.linksSearchQuery = '';
        this.linksLoaded = false;

        // Active tab
        this.activeTab = 'save';

        this.init();
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    async init() {
        await this.loadSettings();
        this.applyTheme();
        this.applyLanguage();
        await this.loadApiKey();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    // ─── Localisation ─────────────────────────────────────────────────────────

    t(key) {
        return (typeof LOCALES !== 'undefined' && LOCALES[this.currentLang]?.[key])
            || (typeof LOCALES !== 'undefined' && LOCALES.en?.[key])
            || key;
    }

    applyLanguage() {
        this.currentLang = this.settings.language || 'en';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });
    }

    // ─── Theme ────────────────────────────────────────────────────────────────

    applyTheme() {
        const theme = this.settings.theme || 'dark';
        document.body.setAttribute('data-theme', theme);
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    async loadSettings() {
        return new Promise(resolve => {
            chrome.storage.sync.get(['settings'], data => {
                if (data.settings) this.settings = { ...this.settings, ...data.settings };
                resolve();
            });
        });
    }

    async saveSettings() {
        return new Promise(resolve => {
            chrome.storage.sync.set({ settings: this.settings }, resolve);
        });
    }

    async loadApiKey() {
        return new Promise(resolve => {
            chrome.storage.local.get(['apiKey'], data => {
                this.apiKey = data.apiKey || null;
                resolve();
            });
        });
    }

    async saveApiKey(key) {
        this.apiKey = key;
        return new Promise(resolve => {
            chrome.storage.local.set({ apiKey: key }, resolve);
        });
    }

    async clearAllData() {
        return new Promise(resolve => {
            chrome.storage.local.clear(() => {
                chrome.storage.sync.clear(() => {
                    this.apiKey = null;
                    this.user = null;
                    this.settings = {
                        apiEndpoint: 'https://linkpocket.app/api',
                        autoGetSelection: true,
                        language: 'en',
                        theme: 'dark',
                    };
                    resolve();
                });
            });
        });
    }

    // ─── API ──────────────────────────────────────────────────────────────────

    async apiRequest(endpoint, options = {}) {
        const url = `${this.settings.apiEndpoint}${endpoint}`;
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Error ${response.status}`);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    async login(email, password) {
        const url = `${this.settings.apiEndpoint}/extension/login`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Login failed (${response.status})`);
        }
        return response.json();
    }

    async fetchUser() {
        return this.apiRequest('/user');
    }

    async fetchTags() {
        try {
            const res = await this.apiRequest('/tags');
            this.tags = res.data || res || [];
        } catch { this.tags = []; }
    }

    async fetchFolders() {
        try {
            const res = await this.apiRequest('/categories');
            this.folders = res.data || res || [];
        } catch { this.folders = []; }
    }

    async fetchLinks(params = {}) {
        const query = new URLSearchParams({ per_page: 30, ...params });
        return this.apiRequest(`/links?${query}`);
    }

    async createLink(data) {
        return this.apiRequest('/links', { method: 'POST', body: data });
    }

    async createFolder(name) {
        return this.apiRequest('/categories', { method: 'POST', body: { name } });
    }

    async createTag(name) {
        return this.apiRequest('/tags', { method: 'POST', body: { name } });
    }

    async toggleFavorite(linkId) {
        return this.apiRequest(`/links/${linkId}/favorite`, { method: 'POST' });
    }

    // ─── UI helpers ──────────────────────────────────────────────────────────

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    showLoading() { document.getElementById('loadingOverlay').classList.remove('hidden'); }
    hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const msg   = document.getElementById('toastMessage');
        const icon  = document.getElementById('toastIcon');

        msg.textContent = message;
        icon.textContent = type === 'success' ? 'check_circle' : 'error';
        toast.className = `toast ${type} show`;

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.className = 'toast hidden', 300);
        }, 3000);
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ─── Auth ─────────────────────────────────────────────────────────────────

    async checkAuthStatus() {
        if (this.apiKey) {
            try {
                this.showLoading();
                this.user = await this.fetchUser();
                this.updateUserUI();
                this.showScreen('appScreen');
                this.switchTab('save');
                await Promise.all([this.fetchTags(), this.fetchFolders()]);
                this.setupFolderPicker();
                this.setupTagsPicker();
                if (this.settings.autoGetSelection) await this.autoFillCurrentTab();
            } catch {
                this.apiKey = null;
                this.showScreen('loginScreen');
            } finally {
                this.hideLoading();
            }
        } else {
            this.showScreen('loginScreen');
        }
    }

    updateUserUI() {
        if (!this.user) return;
        const name    = this.user.name || 'User';
        const email   = this.user.email || '—';
        const initial = name.charAt(0).toUpperCase();

        document.getElementById('userInitial').textContent  = initial;
        document.getElementById('dropdownInitial').textContent = initial;
        document.getElementById('dropdownName').textContent  = name;
        document.getElementById('dropdownEmail').textContent = email;
    }

    async autoFillCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                document.getElementById('linkUrl').value   = tab.url;
                document.getElementById('linkTitle').value = tab.title || '';

                // Update page preview card
                document.getElementById('currentPageTitle').textContent = tab.title || tab.url;
                document.getElementById('currentPageUrl').textContent   = tab.url;

                // Try to load favicon
                const faviconImg = document.getElementById('currentFavicon');
                const iconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(tab.url)}`;
                faviconImg.src = iconUrl;
                faviconImg.style.display = '';
            }
        } catch { /* ignore */ }
    }

    // ─── Navigation ──────────────────────────────────────────────────────────

    switchTab(tab) {
        this.activeTab = tab;

        // Update nav buttons
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Show/hide panels
        document.getElementById('savePanel').classList.toggle('hidden',    tab !== 'save');
        document.getElementById('libraryPanel').classList.toggle('hidden', tab !== 'library');

        document.getElementById('savePanel').classList.toggle('active',    tab === 'save');
        document.getElementById('libraryPanel').classList.toggle('active', tab === 'library');

        if (tab === 'library' && !this.linksLoaded) {
            this.loadLibrary();
        }
    }

    // ─── Library ─────────────────────────────────────────────────────────────

    async loadLibrary() {
        this.showLinksSkeleton(true);
        try {
            const params = {};
            if (this.linksFilter === 'favorites') params.favorite = 1;
            if (this.linksSearchQuery) params.search = this.linksSearchQuery;

            const res = await this.fetchLinks(params);
            this.links = res.data || res || [];
            this.renderLinks(this.links);
            this.linksLoaded = true;
        } catch (err) {
            this.showToast(err.message, 'error');
            this.renderLinks([]);
        } finally {
            this.showLinksSkeleton(false);
        }
    }

    async reloadLibrary() {
        this.linksLoaded = false;
        await this.loadLibrary();
    }

    showLinksSkeleton(show) {
        document.getElementById('linksSkeleton').style.display = show ? '' : 'none';
        document.getElementById('linksList').style.opacity = show ? '0' : '1';
    }

    renderLinks(links) {
        const list  = document.getElementById('linksList');
        const empty = document.getElementById('linksEmpty');
        const footer = document.getElementById('libraryFooter');

        // Remove all existing link cards
        list.querySelectorAll('.link-card').forEach(el => el.remove());

        if (!links || links.length === 0) {
            empty.style.display = '';
            footer.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        footer.style.display = '';

        links.forEach(link => {
            const card = document.createElement('a');
            card.href = link.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.className = 'link-card';
            card.dataset.linkId = link.id;

            const faviconUrl = link.favicon_path || link.favicon;
            const faviconHtml = faviconUrl
                ? `<img src="${this.escapeHtml(faviconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="link-favicon-fallback" style="display:none">🌐</span>`
                : `<span class="link-favicon-fallback">🌐</span>`;

            const favIcon = link.is_favorite
                ? `<span class="material-symbols-outlined link-fav-icon" style="font-variation-settings:'FILL' 1">bookmark</span>`
                : '';

            card.innerHTML = `
                <div class="link-favicon-wrap">${faviconHtml}</div>
                <div class="link-info">
                    <div class="link-title">${this.escapeHtml(link.title || link.url)}</div>
                    <div class="link-meta">
                        <span class="link-domain">${this.escapeHtml(link.domain || new URL(link.url).hostname)}</span>
                        ${favIcon}
                    </div>
                </div>
                <span class="material-symbols-outlined link-card-open">open_in_new</span>
            `;

            list.insertBefore(card, empty);
        });

        list.style.opacity = '1';
    }

    // ─── Save form ────────────────────────────────────────────────────────────

    resetSaveForm() {
        document.getElementById('linkForm').reset();
        this.selectedTags = [];
        this.selectedFolder = null;
        this.renderSelectedFolder();
        this.renderSelectedTags();
        if (this.settings.autoGetSelection) {
            this.autoFillCurrentTab();
        }
    }

    // ─── Folder picker ───────────────────────────────────────────────────────

    setupFolderPicker() {
        const display   = document.getElementById('folderDisplay');
        const dropdown  = document.getElementById('folderDropdown');
        const arrow     = display.querySelector('.picker-arrow');
        const searchIn  = document.getElementById('folderSearch');
        const list      = document.getElementById('folderList');

        const open = () => {
            dropdown.classList.remove('hidden');
            display.classList.add('open');
            arrow.classList.add('rotated');
            this.renderFolderList('');
            searchIn.focus();
        };

        const close = () => {
            dropdown.classList.add('hidden');
            display.classList.remove('open');
            arrow.classList.remove('rotated');
            searchIn.value = '';
        };

        display.addEventListener('click', e => {
            if (e.target.closest('.folder-chip-remove')) return;
            dropdown.classList.contains('hidden') ? open() : close();
        });

        searchIn.addEventListener('input', () => this.renderFolderList(searchIn.value));

        list.addEventListener('click', async e => {
            const item = e.target.closest('.picker-item');
            if (!item) return;

            const createName = item.dataset.createFolder;
            if (createName) {
                try {
                    const res = await this.createFolder(createName);
                    const newFolder = res.data || res;
                    this.folders.push(newFolder);
                    this.selectedFolder = newFolder;
                } catch (err) {
                    this.showToast(err.message, 'error');
                    return;
                }
            } else {
                const id = item.dataset.folderId;
                this.selectedFolder = id ? (this.folders.find(f => f.id == id) || null) : null;
            }
            this.renderSelectedFolder();
            close();
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#folderSelect')) close();
        });

        this.renderSelectedFolder();
    }

    renderFolderList(filter = '') {
        const list  = document.getElementById('folderList');
        const lower = filter.toLowerCase();

        let html = `<div class="picker-item" data-folder-id="">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted)">folder_off</span>
            ${this.escapeHtml(this.t('noFolder') || 'No folder')}
        </div>`;

        this.folders
            .filter(f => f.name.toLowerCase().includes(lower))
            .forEach(f => {
                const selected = this.selectedFolder?.id === f.id ? ' selected' : '';
                const colorDot = f.color ? `<span class="folder-dot" style="background:${this.escapeHtml(f.color)}"></span>` : '';
                const icon = f.icon
                    ? `<span class="material-symbols-outlined" style="font-size:16px">${this.escapeHtml(f.icon)}</span>`
                    : `<span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted)">folder</span>`;

                html += `<div class="picker-item${selected}" data-folder-id="${f.id}">
                    ${icon}${colorDot}
                    ${this.escapeHtml(f.name)}
                </div>`;
            });

        if (filter && !this.folders.some(f => f.name.toLowerCase() === lower)) {
            html += `<div class="picker-item create-new" data-create-folder="${this.escapeHtml(filter)}">
                <span class="material-symbols-outlined" style="font-size:16px">create_new_folder</span>
                ${this.t('createFolder') || 'Create'}: "${this.escapeHtml(filter)}"
            </div>`;
        }

        if (!this.folders.length && !filter) {
            html += `<div class="picker-empty">${this.t('noItemsFound') || 'No folders yet'}</div>`;
        }

        list.innerHTML = html;
    }

    renderSelectedFolder() {
        const display = document.getElementById('selectedFolderDisplay');
        if (this.selectedFolder) {
            const f = this.selectedFolder;
            const colorDot = f.color ? `<span class="folder-dot" style="background:${this.escapeHtml(f.color)};margin-right:2px"></span>` : '';
            const icon = f.icon
                ? `<span class="material-symbols-outlined" style="font-size:15px">${this.escapeHtml(f.icon)}</span>`
                : `<span class="material-symbols-outlined" style="font-size:15px">folder</span>`;

            display.innerHTML = `<span class="folder-chip">
                ${icon}${colorDot}${this.escapeHtml(f.name)}
                <button class="folder-chip-remove" id="removeFolderBtn" type="button">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </span>`;

            document.getElementById('removeFolderBtn').addEventListener('click', e => {
                e.stopPropagation();
                this.selectedFolder = null;
                this.renderSelectedFolder();
            });
        } else {
            display.innerHTML = `<span class="picker-placeholder">${this.t('noFolder') || 'No folder'}</span>`;
        }
    }

    // ─── Tags picker ─────────────────────────────────────────────────────────

    setupTagsPicker() {
        const area     = document.getElementById('tagsInputArea');
        const input    = document.getElementById('tagsSearch');
        const dropdown = document.getElementById('tagsDropdown');
        const list     = document.getElementById('tagsList');

        input.addEventListener('focus', () => {
            this.renderTagsList(input.value);
            dropdown.classList.remove('hidden');
        });

        input.addEventListener('input', () => {
            this.renderTagsList(input.value);
        });

        input.addEventListener('keydown', async e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (!val) return;
                const existing = this.tags.find(t => t.name.toLowerCase() === val.toLowerCase());
                if (existing && !this.selectedTags.some(t => t.id === existing.id)) {
                    this.selectedTags.push(existing);
                    input.value = '';
                    this.renderSelectedTags();
                    this.renderTagsList('');
                } else if (!existing) {
                    try {
                        const res = await this.createTag(val);
                        const newTag = res.data || res;
                        this.tags.push(newTag);
                        this.selectedTags.push(newTag);
                        input.value = '';
                        this.renderSelectedTags();
                        this.renderTagsList('');
                    } catch (err) { this.showToast(err.message, 'error'); }
                }
            } else if (e.key === 'Backspace' && !input.value && this.selectedTags.length > 0) {
                this.selectedTags.pop();
                this.renderSelectedTags();
            }
        });

        list.addEventListener('click', async e => {
            const item = e.target.closest('.picker-item');
            if (!item) return;

            const createName = item.dataset.createTag;
            if (createName) {
                try {
                    const res = await this.createTag(createName);
                    const newTag = res.data || res;
                    this.tags.push(newTag);
                    this.selectedTags.push(newTag);
                } catch (err) { this.showToast(err.message, 'error'); return; }
            } else {
                const id = parseInt(item.dataset.tagId);
                const tag = this.tags.find(t => t.id === id);
                if (tag && !this.selectedTags.some(t => t.id === id)) {
                    this.selectedTags.push(tag);
                }
            }
            input.value = '';
            dropdown.classList.add('hidden');
            this.renderSelectedTags();
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#tagsSelect')) {
                dropdown.classList.add('hidden');
            }
        });

        this.renderSelectedTags();
    }

    renderTagsList(filter = '') {
        const list = document.getElementById('tagsList');
        const lower = filter.toLowerCase();
        const selectedIds = this.selectedTags.map(t => t.id);

        const filtered = this.tags.filter(t =>
            t.name.toLowerCase().includes(lower) && !selectedIds.includes(t.id)
        );

        let html = '';
        filtered.forEach(t => {
            html += `<div class="picker-item" data-tag-id="${t.id}">
                <span class="material-symbols-outlined" style="font-size:15px;color:var(--volt)">sell</span>
                ${this.escapeHtml(t.name)}
            </div>`;
        });

        if (filter && !this.tags.some(t => t.name.toLowerCase() === lower)) {
            html += `<div class="picker-item create-new" data-create-tag="${this.escapeHtml(filter)}">
                <span class="material-symbols-outlined" style="font-size:15px">add</span>
                ${this.t('create') || 'Create'}: "${this.escapeHtml(filter)}"
            </div>`;
        }

        if (!html) {
            html = `<div class="picker-empty">${this.t('noItemsFound') || 'No tags found'}</div>`;
        }

        list.innerHTML = html;
    }

    renderSelectedTags() {
        const container = document.getElementById('selectedTagsList');
        container.innerHTML = this.selectedTags.map(t =>
            `<span class="tag-chip">
                ${this.escapeHtml(t.name)}
                <button type="button" class="tag-chip-remove" data-remove-tag="${t.id}">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </span>`
        ).join('');

        container.querySelectorAll('[data-remove-tag]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.removeTag);
                this.selectedTags = this.selectedTags.filter(t => t.id !== id);
                this.renderSelectedTags();
            });
        });
    }

    // ─── Event Listeners ─────────────────────────────────────────────────────

    setupEventListeners() {
        // ── Login ──
        document.getElementById('connectBtn').addEventListener('click', async () => {
            const email    = document.getElementById('emailInput').value.trim();
            const password = document.getElementById('passwordInput').value.trim();
            if (!email || !password) {
                this.showToast(this.t('enterCredentials') || 'Enter email and password', 'error');
                return;
            }
            this.showLoading();
            try {
                const data = await this.login(email, password);
                this.apiKey  = data.token;
                this.user    = data.user;
                await this.saveApiKey(data.token);
                this.updateUserUI();
                this.showScreen('appScreen');
                await Promise.all([this.fetchTags(), this.fetchFolders()]);
                this.setupFolderPicker();
                this.setupTagsPicker();
                this.switchTab('save');
                if (this.settings.autoGetSelection) await this.autoFillCurrentTab();
                this.showToast(this.t('connectedSuccess') || 'Connected!');
            } catch (err) {
                this.showToast(err.message || this.t('invalidCredentials') || 'Invalid credentials', 'error');
            } finally {
                this.hideLoading();
            }
        });

        document.getElementById('passwordInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('connectBtn').click();
        });

        // ── User dropdown ──
        document.getElementById('userMenuBtn').addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('userDropdown').classList.toggle('hidden');
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#userMenuBtn') && !e.target.closest('#userDropdown')) {
                document.getElementById('userDropdown').classList.add('hidden');
            }
        });

        document.getElementById('openDashboardBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://linkpocket.app' });
        });

        // ── Logout ──
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await this.clearAllData();
            this.showScreen('loginScreen');
            this.showToast(this.t('loggedOut') || 'Logged out');
        });

        // ── Bottom nav ──
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
                document.getElementById('userDropdown').classList.add('hidden');
            });
        });

        // ── Settings from dropdown ──
        document.getElementById('settingsMenuBtn').addEventListener('click', () => {
            document.getElementById('userDropdown').classList.add('hidden');
            document.getElementById('languageSelect').value = this.settings.language || 'en';
            document.getElementById('themeSelect').value    = this.settings.theme || 'dark';
            document.getElementById('autoGetSelection').checked = this.settings.autoGetSelection !== false;
            this.showScreen('settingsScreen');
        });

        document.getElementById('settingsBackBtn').addEventListener('click', () => {
            this.showScreen('appScreen');
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            this.settings.language        = document.getElementById('languageSelect').value;
            this.settings.theme           = document.getElementById('themeSelect').value;
            this.settings.autoGetSelection = document.getElementById('autoGetSelection').checked;
            await this.saveSettings();
            this.applyTheme();
            this.applyLanguage();
            this.showToast(this.t('settingsSaved') || 'Settings saved');
        });

        const shortcutsBtn = document.getElementById('shortcutsBtn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            });
        }

        document.getElementById('clearDataBtn').addEventListener('click', async () => {
            if (confirm(this.t('clearDataConfirm') || 'Disconnect from LinkPocket?')) {
                await this.clearAllData();
                this.applyTheme();
                this.applyLanguage();
                this.showScreen('loginScreen');
                this.showToast(this.t('dataCleaned') || 'Data cleared');
            }
        });

        // ── Shortcut display ──
        chrome.commands?.getAll?.((commands) => {
            const qs = commands?.find(c => c.name === 'quick-save');
            if (qs?.shortcut) {
                const el = document.getElementById('currentShortcut');
                if (el) el.textContent = qs.shortcut;
            }
        });

        // ── Save form ──
        document.getElementById('linkForm').addEventListener('submit', async e => {
            e.preventDefault();

            const url   = document.getElementById('linkUrl').value.trim();
            const title = document.getElementById('linkTitle').value.trim();
            const desc  = document.getElementById('linkDescription').value.trim();

            if (!url)   { this.showToast(this.t('urlRequired')   || 'URL required', 'error'); return; }
            if (!title) { this.showToast(this.t('titleRequired') || 'Title required', 'error'); return; }

            const btn = document.getElementById('saveBtn');
            btn.disabled = true;

            this.showLoading();
            try {
                const body = { url, title };
                if (desc) body.description = desc;
                if (this.selectedFolder) body.categories = [this.selectedFolder.id];
                if (this.selectedTags.length) body.tags = this.selectedTags.map(t => t.id);

                await this.createLink(body);
                this.showToast(this.t('linkSaved') || 'Link saved!');
                this.resetSaveForm();

                // Reload library next time
                this.linksLoaded = false;
            } catch (err) {
                this.showToast(err.message || this.t('failedToSave') || 'Failed to save', 'error');
            } finally {
                this.hideLoading();
                btn.disabled = false;
            }
        });

        // ── Library: search ──
        const libraryInput = document.getElementById('librarySearchInput');
        const clearBtn     = document.getElementById('librarySearchClear');
        let debounce;

        libraryInput.addEventListener('input', () => {
            const val = libraryInput.value.trim();
            clearBtn.classList.toggle('hidden', !val);
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                this.linksSearchQuery = val;
                this.linksLoaded = false;
                await this.loadLibrary();
            }, 350);
        });

        clearBtn.addEventListener('click', () => {
            libraryInput.value = '';
            clearBtn.classList.add('hidden');
            this.linksSearchQuery = '';
            this.linksLoaded = false;
            this.loadLibrary();
        });

        // ── Library: filter chips ──
        document.getElementById('filterChips').addEventListener('click', async e => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            this.linksFilter = chip.dataset.filter;
            this.linksLoaded = false;
            await this.loadLibrary();
        });
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    new LinkPocketApp();
});
