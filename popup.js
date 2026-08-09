// LinkPocket Chrome Extension — Popup Script (v2 Mobile App Style)

/**
 * Folders store their icon as a plain string whose meaning depends on the icon
 * theme picked in the web app: a Material Symbols ligature (classic), an emoji,
 * a CSS class from another icon font (`ph-`, `ri-`, `ti-`, `bi-`), or the
 * `__image__` marker used for uploaded icons. The popup only ships Material
 * Symbols, so anything else is translated to its closest Material equivalent
 * instead of being printed as raw text.
 */
const FOLDER_ICON_ALIASES = {
	// Phosphor
	"ph-folder": "folder",
	"ph-image": "photo_library",
	"ph-film-strip": "movie",
	"ph-music-notes": "music_note",
	"ph-headphones": "headphones",
	"ph-code": "code",
	"ph-book-open": "menu_book",
	"ph-game-controller": "sports_esports",
	"ph-briefcase": "work",
	"ph-cloud": "cloud",
	"ph-share-network": "folder_shared",
	"ph-star": "folder_special",
	// Remix
	"ri-folder-fill": "folder",
	"ri-image-fill": "photo_library",
	"ri-film-fill": "movie",
	"ri-music-fill": "music_note",
	"ri-headphone-fill": "headphones",
	"ri-code-s-slash-fill": "code",
	"ri-book-open-fill": "menu_book",
	"ri-gamepad-fill": "sports_esports",
	"ri-briefcase-fill": "work",
	"ri-cloud-fill": "cloud",
	"ri-share-fill": "folder_shared",
	"ri-star-fill": "folder_special",
	// Tabler
	"ti-folder": "folder",
	"ti-photo": "photo_library",
	"ti-movie": "movie",
	"ti-music": "music_note",
	"ti-headphones": "headphones",
	"ti-code": "code",
	"ti-book": "menu_book",
	"ti-device-gamepad-2": "sports_esports",
	"ti-briefcase": "work",
	"ti-cloud": "cloud",
	"ti-share": "folder_shared",
	"ti-star": "folder_special",
	// Bootstrap
	"bi-folder-fill": "folder",
	"bi-image-fill": "photo_library",
	"bi-camera-reels-fill": "movie",
	"bi-music-note-beamed": "music_note",
	"bi-headphones": "headphones",
	"bi-code-slash": "code",
	"bi-book-fill": "menu_book",
	"bi-controller": "sports_esports",
	"bi-briefcase-fill": "work",
	"bi-cloud-fill": "cloud",
	"bi-share-fill": "folder_shared",
	"bi-star-fill": "folder_special",
};

/** Fallback keyword matching for icons outside the default theme slots. */
const FOLDER_ICON_KEYWORDS = [
	[/folder|directory/, "folder"],
	[/image|photo|picture|camera/, "photo_library"],
	[/film|movie|video|clapper/, "movie"],
	[/music|note|playlist|disc/, "music_note"],
	[/headphone|podcast|microphone|mic/, "headphones"],
	[/code|terminal|command|brackets|git/, "code"],
	[/book|read|article|note(pad|book)/, "menu_book"],
	[/game|gamepad|controller|puzzle/, "sports_esports"],
	[/brief|work|office|suitcase|building/, "work"],
	[/cloud|server|database/, "cloud"],
	[/share|link|network|users?|people/, "folder_shared"],
	[/star|heart|bookmark|favorite/, "folder_special"],
	[/cart|shop|store|bag|money|coin/, "shopping_cart"],
	[/mail|envelope|chat|message/, "mail"],
	[/map|globe|world|compass|pin/, "public"],
];

/** Default production API — overridable from the settings screen (EXT-32). */
const DEFAULT_API_ENDPOINT = "https://linkpocket.app/api";

class LinkPocketApp {
	constructor() {
		this.apiKey = null;
		this.user = null;
		this.settings = { apiEndpoint: DEFAULT_API_ENDPOINT, autoGetSelection: true, language: "en", theme: "dark" };
		this.tags = [];
		this.folders = [];
		this.portfolios = [];
		this.selectedPortfolioId = null;
		this.selectedTags = [];
		this.selectedFolder = null;
		this.currentLang = "en";
		this.aiPlan = null; // { plan, canUseAI, aiQuota } — AI buttons stay hidden until known
		this.aiPlanError = null; // HTTP status of the last failed /plan call (404 = outdated API)

		// Library state
		this.links = [];
		this.linksFilter = "recent";
		this.linksSearchQuery = "";
		this.linksLoaded = false;

		// Active tab
		this.activeTab = "save";

		// Connection state: 'online' | 'offline' | 'unknown'
		this.connection = "unknown";
		this.pickersReady = false;

		this.init();
	}

	// ─── Init ─────────────────────────────────────────────────────────────────

	async init() {
		await this.loadSettings();
		this.applyTheme();
		this.applyLanguage();
		await this.loadSession();
		this.setupEventListeners();
		this.checkAuthStatus();
	}

	// ─── Localisation ─────────────────────────────────────────────────────────

	t(key) {
		return (typeof LOCALES !== "undefined" && LOCALES[this.currentLang]?.[key]) || (typeof LOCALES !== "undefined" && LOCALES.en?.[key]) || key;
	}

	applyLanguage() {
		this.currentLang = this.settings.language || "en";
		document.querySelectorAll("[data-i18n]").forEach((el) => {
			el.textContent = this.t(el.getAttribute("data-i18n"));
		});
		document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
			el.placeholder = this.t(el.getAttribute("data-i18n-placeholder"));
		});
		document.querySelectorAll("[data-i18n-title]").forEach((el) => {
			el.title = this.t(el.getAttribute("data-i18n-title"));
		});
	}

	// ─── Theme ────────────────────────────────────────────────────────────────

	applyTheme() {
		const theme = this.settings.theme || "dark";
		document.body.setAttribute("data-theme", theme);
	}

	// ─── Storage ──────────────────────────────────────────────────────────────

	async loadSettings() {
		return new Promise((resolve) => {
			chrome.storage.sync.get(["settings"], (data) => {
				if (data.settings) this.settings = { ...this.settings, ...data.settings };
				// The endpoint is no longer user-configurable; ignore any stored override
				this.settings.apiEndpoint = DEFAULT_API_ENDPOINT;
				resolve();
			});
		});
	}

	async saveSettings() {
		return new Promise((resolve) => {
			chrome.storage.sync.set({ settings: this.settings }, resolve);
		});
	}

	/**
	 * Load the token plus the last known user / folders / tags so the popup can
	 * render instantly — and stay usable when the API is unreachable.
	 */
	async loadSession() {
		return new Promise((resolve) => {
			chrome.storage.local.get(["apiKey", "cachedUser", "cachedFolders", "cachedTags", "cachedPortfolios", "selectedPortfolioId"], (data) => {
				this.apiKey = data.apiKey || null;
				this.user = data.cachedUser || null;
				this.folders = data.cachedFolders || [];
				this.tags = data.cachedTags || [];
				this.portfolios = data.cachedPortfolios || [];
				this.selectedPortfolioId = data.selectedPortfolioId || null;
				resolve();
			});
		});
	}

	async saveApiKey(key) {
		this.apiKey = key;
		return new Promise((resolve) => {
			chrome.storage.local.set({ apiKey: key }, resolve);
		});
	}

	cacheSession(patch) {
		chrome.storage.local.set(patch);
	}

	/** Drop the token — only for a confirmed authentication failure. */
	async forgetSession() {
		this.apiKey = null;
		this.user = null;
		return new Promise((resolve) => {
			chrome.storage.local.remove(["apiKey", "cachedUser", "cachedFolders", "cachedTags", "cachedPortfolios", "selectedPortfolioId"], resolve);
		});
	}

	async clearAllData() {
		return new Promise((resolve) => {
			chrome.storage.local.clear(() => {
				chrome.storage.sync.clear(() => {
					this.apiKey = null;
					this.user = null;
					this.tags = [];
					this.folders = [];
					this.portfolios = [];
					this.selectedPortfolioId = null;
					this.selectedTags = [];
					this.selectedFolder = null;
					this.links = [];
					this.linksLoaded = false;
					this.linksSearchQuery = "";
					this.settings = { apiEndpoint: DEFAULT_API_ENDPOINT, autoGetSelection: true, language: "en", theme: "dark" };
					resolve();
				});
			});
		});
	}

	// ─── API ──────────────────────────────────────────────────────────────────

	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Single HTTP round trip. Never hangs (abort after `timeout`) and always
	 * throws an error carrying `status` / `isNetwork` / `retryable` so callers
	 * can tell "the token is dead" from "the network blinked".
	 */
	async httpRequest(endpoint, options = {}, timeout = 12000) {
		const url = `${this.settings.apiEndpoint}${endpoint}`;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);

		let response;
		try {
			const headers = { "Content-Type": "application/json", Accept: "application/json" };
			if (options.auth !== false && this.apiKey) {
				headers.Authorization = `Bearer ${this.apiKey}`;
			}

			response = await fetch(url, {
				method: options.method || "GET",
				headers,
				body: options.body ? JSON.stringify(options.body) : undefined,
				signal: controller.signal,
				cache: "no-store",
			});
		} catch {
			const err = new Error(this.t("offline"));
			err.isNetwork = true;
			err.retryable = true;
			throw err;
		} finally {
			clearTimeout(timer);
		}

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			const err = new Error(data.message || this.httpErrorMessage(response.status));
			err.status = response.status;
			err.retryable = response.status === 429 || response.status >= 500;
			throw err;
		}

		if (response.status === 204) return null;
		return response.json().catch(() => null);
	}

	httpErrorMessage(status) {
		if (status === 401) return this.t("sessionExpired");
		if (status === 403) return this.t("planRequired");
		if (status === 429) return this.t("tooManyRequests");
		if (status >= 500) return this.t("serverError");
		return `Error ${status}`;
	}

	/**
	 * Same as httpRequest, with exponential backoff on transient failures.
	 * Writes are never replayed: the API does not de-duplicate, so a retry
	 * after an ambiguous failure would create a second link.
	 */
	async apiRequest(endpoint, options = {}) {
		const isWrite = options.method && options.method !== "GET";
		const attempts = options.retries ?? (isWrite ? 0 : 2);
		let lastError;

		for (let attempt = 0; attempt <= attempts; attempt++) {
			if (attempt > 0) await this.delay(400 * 2 ** (attempt - 1));
			try {
				const result = await this.httpRequest(endpoint, options);
				this.setConnection("online");
				return result;
			} catch (err) {
				lastError = err;
				if (!err.retryable) break;
			}
		}

		if (lastError.isNetwork) this.setConnection("offline", lastError.message);
		throw lastError;
	}

	async login(email, password) {
		return this.httpRequest("/extension/login", { method: "POST", body: { email, password }, auth: false }, 15000);
	}

	async fetchUser() {
		return this.apiRequest("/user");
	}

	/** Refresh tags; keeps the cached list if the call fails. */
	async fetchTags() {
		try {
			const res = await this.apiRequest("/tags");
			this.tags = res?.data || res || [];
			this.cacheSession({ cachedTags: this.tags });
		} catch {
			/* keep cached tags */
		}
	}

	/** Refresh folders for the selected portfolio; keeps the cached list if the call fails. */
	async fetchFolders() {
		try {
			const query = this.selectedPortfolioId ? `?portfolio_id=${this.selectedPortfolioId}` : "";
			const res = await this.apiRequest(`/categories${query}`);
			this.folders = res?.data || res || [];
			this.cacheSession({ cachedFolders: this.folders });
		} catch {
			/* keep cached folders */
		}
	}

	/**
	 * Refresh portfolios; keeps the cached list if the call fails (a 404 means
	 * the API does not expose portfolios yet — the picker then stays hidden).
	 */
	async fetchPortfolios() {
		try {
			const res = await this.apiRequest("/portfolios");
			this.portfolios = res?.data || res || [];
			this.cacheSession({ cachedPortfolios: this.portfolios });
		} catch {
			/* keep cached portfolios */
		}
		this.reconcileSelectedPortfolio();
		this.renderPortfolioSelect();
	}

	/** Keep the persisted selection valid: fall back to the default portfolio. */
	reconcileSelectedPortfolio() {
		if (!this.portfolios.length) {
			this.selectedPortfolioId = null;
			return;
		}
		if (this.portfolios.some((p) => p.id == this.selectedPortfolioId)) return;

		const fallback = this.portfolios.find((p) => p.is_default) || this.portfolios[0];
		this.selectedPortfolioId = fallback.id;
		this.cacheSession({ selectedPortfolioId: this.selectedPortfolioId });
	}

	async fetchLinks(params = {}) {
		const query = new URLSearchParams({ per_page: 30, ...params });
		return this.apiRequest(`/links?${query}`);
	}

	async createLink(data) {
		return this.apiRequest("/links", { method: "POST", body: data });
	}

	async createFolder(name) {
		const body = { name };
		if (this.selectedPortfolioId) body.portfolio_id = this.selectedPortfolioId;
		return this.apiRequest("/categories", { method: "POST", body });
	}

	async createTag(name) {
		return this.apiRequest("/tags", { method: "POST", body: { name } });
	}

	async toggleFavorite(linkId) {
		return this.apiRequest(`/links/${linkId}/favorite`, { method: "POST" });
	}

	// ─── UI helpers ──────────────────────────────────────────────────────────

	showScreen(id) {
		document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
		document.getElementById(id).classList.remove("hidden");
	}

	showLoading() {
		document.getElementById("loadingOverlay").classList.remove("hidden");
	}
	hideLoading() {
		document.getElementById("loadingOverlay").classList.add("hidden");
	}

	showToast(message, type = "success") {
		const toast = document.getElementById("toast");
		const msg = document.getElementById("toastMessage");
		const icon = document.getElementById("toastIcon");

		msg.textContent = message;
		icon.textContent = type === "success" ? "check_circle" : "error";
		toast.className = `toast ${type} show`;

		clearTimeout(this._toastTimer);
		this._toastTimer = setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => (toast.className = "toast hidden"), 300);
		}, 3000);
	}

	escapeHtml(str) {
		const d = document.createElement("div");
		d.textContent = str;
		return d.innerHTML;
	}

	/** Only hex colours coming from the API are allowed in inline styles. */
	safeColor(value) {
		return /^#[0-9a-f]{3,8}$/i.test(value || "") ? value : null;
	}

	// ─── Folder icons ─────────────────────────────────────────────────────────

	/** Map any stored folder icon onto something the popup can actually draw. */
	resolveFolderIcon(raw) {
		const name = (raw || "").trim();

		if (!name) return { type: "material", value: "folder" };
		if (name === "__image__") return { type: "material", value: "image" };

		// Anything with non-ASCII characters is an emoji icon
		if (!/^[\x20-\x7E]+$/.test(name)) return { type: "emoji", value: name };

		// Material Symbols ligature (classic theme)
		if (/^[a-z][a-z0-9_]*$/.test(name)) return { type: "material", value: name };

		// Icon-font class from another theme → closest Material equivalent
		return { type: "material", value: this.materialEquivalent(name) };
	}

	materialEquivalent(name) {
		const alias = FOLDER_ICON_ALIASES[name];
		if (alias) return alias;

		const base = name
			.toLowerCase()
			.replace(/^(ph|ri|ti|bi)-/, "")
			.replace(/-(fill|filled|line|outline|duotone|thin|bold|light|regular|\d+)$/, "");

		const match = FOLDER_ICON_KEYWORDS.find(([pattern]) => pattern.test(base));
		return match ? match[1] : "folder";
	}

	folderIconHtml(folder) {
		const icon = this.resolveFolderIcon(folder?.icon);
		const color = this.safeColor(folder?.color);
		const style = color ? ` style="color:${color}"` : "";

		if (icon.type === "emoji") {
			return `<span class="picker-icon is-emoji">${this.escapeHtml(icon.value)}</span>`;
		}

		return `<span class="material-symbols-outlined picker-icon"${style}>${this.escapeHtml(icon.value)}</span>`;
	}

	// ─── Auth ─────────────────────────────────────────────────────────────────

	async checkAuthStatus() {
		if (!this.apiKey) {
			this.showScreen("loginScreen");
			this.focusElement("emailInput");
			return;
		}

		// Render immediately from the cached session — the popup must never look
		// logged out just because the network is slow.
		const hasCache = !!this.user;
		this.updateUserUI();
		this.showScreen("appScreen");
		this.switchTab("save");
		this.setupPickers();
		if (!hasCache) this.showLoading();
		this.focusSearch();

		if (this.settings.autoGetSelection) this.autoFillCurrentTab();

		await this.syncSession({ silent: hasCache });
		this.hideLoading();
	}

	/**
	 * Validate the token and refresh reference data.
	 * Only a confirmed 401 logs the user out — everything else keeps the session.
	 */
	async syncSession({ silent = false } = {}) {
		try {
			this.user = await this.fetchUser();
			this.cacheSession({ cachedUser: this.user });
			this.updateUserUI();
			this.setConnection("online");
		} catch (err) {
			if (err.status === 401) {
				await this.forgetSession();
				this.showScreen("loginScreen");
				this.focusElement("emailInput");
				this.showToast(this.t("sessionExpired"), "error");
				return false;
			}

			this.setConnection("offline", err.message);
			if (!silent) this.showToast(err.message, "error");
			return false;
		}

		// Portfolios first: the folder list is scoped to the selected portfolio
		await this.fetchPortfolios();
		await Promise.all([this.fetchTags(), this.fetchFolders(), this.fetchAiPlan()]);
		this.renderFolderList(document.getElementById("folderSearch")?.value || "");
		this.renderSelectedFolder();
		return true;
	}

	// ─── AI features (Pro+) ───────────────────────────────────────────────────

	/** Refresh AI availability + credit balance; hides the AI UI on failure. */
	async fetchAiPlan() {
		try {
			this.aiPlan = await this.apiRequest("/plan");
			this.aiPlanError = null;
		} catch (err) {
			this.aiPlan = null;
			this.aiPlanError = err.status || null;
		}
		this.updateAiUI();
	}

	/**
	 * AI buttons only exist for plans that include AI (Pro+). When the credit
	 * balance is exhausted they stay visible but disabled, with a clear hint.
	 */
	updateAiUI() {
		const descBtn = document.getElementById("aiDescriptionBtn");
		const tagsBtn = document.getElementById("aiTagsBtn");
		const hint = document.getElementById("aiCreditsHint");
		const hintText = document.getElementById("aiCreditsHintText");
		if (!descBtn || !tagsBtn || !hint) return;

		// A 404 on /plan means the configured endpoint runs an older API without
		// the AI routes — very different from a plan that has no AI (EXT-32).
		if (this.aiPlanError === 404) {
			descBtn.classList.add("hidden");
			tagsBtn.classList.add("hidden");
			hint.classList.remove("hidden");
			hint.classList.add("exhausted");
			hintText.textContent = this.t("aiApiOutdated");
			return;
		}

		const quota = this.aiPlan?.aiQuota;
		const hasAiPlan = !!quota && (quota.total > 0 || quota.isUnlimited);

		descBtn.classList.toggle("hidden", !hasAiPlan);
		tagsBtn.classList.toggle("hidden", !hasAiPlan);
		hint.classList.toggle("hidden", !hasAiPlan);
		if (!hasAiPlan) return;

		const canUse = this.aiPlan.canUseAI;
		descBtn.disabled = !canUse;
		tagsBtn.disabled = !canUse;

		if (quota.isUnlimited) {
			hintText.textContent = this.t("aiCreditsRemaining").replace(":count", "∞");
			hint.classList.remove("exhausted");
		} else if (canUse) {
			hintText.textContent = this.t("aiCreditsRemaining").replace(":count", quota.remaining.toLocaleString());
			hint.classList.remove("exhausted");
		} else {
			hintText.textContent = this.t("aiCreditsExhausted");
			hint.classList.add("exhausted");
		}
	}

	setAiButtonLoading(btn, loading) {
		btn.classList.toggle("loading", loading);
		btn.disabled = loading;
		const icon = btn.querySelector(".material-symbols-outlined");
		if (icon) icon.textContent = loading ? "sync" : "auto_awesome";
	}

	async aiGenerateDescription() {
		const btn = document.getElementById("aiDescriptionBtn");
		const title = document.getElementById("linkTitle").value.trim();
		const url = document.getElementById("linkUrl").value.trim();
		if (!title) return;

		this.setAiButtonLoading(btn, true);
		try {
			const data = await this.apiRequest("/ai/generate-description", {
				method: "POST",
				body: {
					title,
					url: /^https?:\/\//i.test(url) ? url : null,
					current_description: document.getElementById("linkDescription").value || "",
				},
			});
			if (data?.description) {
				document.getElementById("linkDescription").value = data.description;
			}
			this.fetchAiPlan(); // refresh credit balance
		} catch (err) {
			this.showToast(err.status ? err.message : this.t("aiUnavailable"), "error");
			if (err.status === 429) this.fetchAiPlan();
		} finally {
			this.setAiButtonLoading(btn, false);
			this.updateAiUI();
		}
	}

	async aiSuggestTags() {
		const btn = document.getElementById("aiTagsBtn");
		const title = document.getElementById("linkTitle").value.trim();
		const url = document.getElementById("linkUrl").value.trim();
		if (!title) return;

		this.setAiButtonLoading(btn, true);
		try {
			const data = await this.apiRequest("/ai/suggest-tags", {
				method: "POST",
				body: {
					title,
					description: (document.getElementById("linkDescription").value || "").substring(0, 2000) || null,
					url: /^https?:\/\//i.test(url) ? url : null,
				},
			});

			// Existing tags: select them; unknown/new ones: create then select
			const names = [...(data?.existing || []), ...(data?.new || [])];
			for (const name of names) {
				const existing = this.tags.find((t) => t.name.toLowerCase() === String(name).toLowerCase());
				if (existing) {
					if (!this.selectedTags.some((t) => t.id === existing.id)) this.selectedTags.push(existing);
					continue;
				}
				try {
					const res = await this.createTag(String(name));
					const newTag = res?.data || res;
					if (newTag?.id) {
						this.tags.push(newTag);
						this.selectedTags.push(newTag);
					}
				} catch {
					/* skip tags that fail to create */
				}
			}
			this.renderSelectedTags();
			this.fetchAiPlan(); // refresh credit balance
		} catch (err) {
			this.showToast(err.status ? err.message : this.t("aiUnavailable"), "error");
			if (err.status === 429) this.fetchAiPlan();
		} finally {
			this.setAiButtonLoading(btn, false);
			this.updateAiUI();
		}
	}

	// ─── Connection state ─────────────────────────────────────────────────────

	setConnection(state, message = "") {
		if (this.connection === state) return;
		const wasOffline = this.connection === "offline";
		this.connection = state;

		const banner = document.getElementById("connectionBanner");
		if (!banner) return;

		if (state === "offline") {
			document.getElementById("connectionBannerTitle").textContent = message || this.t("offline");
			banner.classList.remove("hidden");
		} else {
			banner.classList.add("hidden");
			if (wasOffline) this.showToast(this.t("reconnected"), "success");
		}
	}

	async retryConnection() {
		const btn = document.getElementById("connectionRetryBtn");
		btn.disabled = true;
		btn.textContent = this.t("reconnecting");

		const ok = await this.syncSession({ silent: true });
		if (ok && this.activeTab === "library") {
			this.linksLoaded = false;
			await this.loadLibrary();
		}

		btn.disabled = false;
		btn.textContent = this.t("retry");
	}

	// ─── Focus helpers ────────────────────────────────────────────────────────

	focusElement(id) {
		const el = document.getElementById(id);
		if (!el) return;

		el.focus({ preventScroll: true });

		// The popup can still be painting when it opens: retry once, but never
		// steal the focus back if the user already clicked somewhere else.
		setTimeout(() => {
			const idle = !document.activeElement || document.activeElement === document.body;
			if (idle) el.focus({ preventScroll: true });
		}, 80);
	}

	focusSearch() {
		const el = document.getElementById("globalSearchInput");
		if (el && document.activeElement !== el) this.focusElement("globalSearchInput");
	}

	/** Bind the portfolio / folder / tags pickers once per popup lifetime. */
	setupPickers() {
		if (this.pickersReady) {
			this.renderPortfolioSelect();
			this.renderSelectedFolder();
			this.renderSelectedTags();
			return;
		}
		this.setupPortfolioPicker();
		this.setupFolderPicker();
		this.setupTagsPicker();
		this.pickersReady = true;
	}

	updateUserUI() {
		if (!this.user) return;
		const name = this.user.name || "User";
		const email = this.user.email || "—";
		const initial = name.charAt(0).toUpperCase();

		document.getElementById("userInitial").textContent = initial;
		document.getElementById("dropdownInitial").textContent = initial;
		document.getElementById("dropdownName").textContent = name;
		document.getElementById("dropdownEmail").textContent = email;
	}

	async autoFillCurrentTab() {
		try {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (tab && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
				document.getElementById("linkUrl").value = tab.url;
				document.getElementById("linkTitle").value = tab.title || "";

				// Update page preview card
				document.getElementById("currentPageTitle").textContent = tab.title || tab.url;
				document.getElementById("currentPageUrl").textContent = tab.url;

				// Try to load favicon
				const faviconImg = document.getElementById("currentFavicon");
				const iconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(tab.url)}`;
				faviconImg.src = iconUrl;
				faviconImg.style.display = "";

				// EXT-33: complete title/description from the page's real meta
				// tags, without ever blocking the instant tab.title prefill.
				this.completeMetaFromApi(tab.url);
			}
		} catch {
			/* ignore */
		}
	}

	/**
	 * Ask the API for the page's og:/meta title and description and fill
	 * whatever the user has not provided yet. Fully silent on failure —
	 * older APIs (404), plan limits (403) or a flaky network must never
	 * disturb the save flow.
	 */
	async completeMetaFromApi(url) {
		if (!this.apiKey) return;
		try {
			const meta = await this.httpRequest("/links/fetch-meta", { method: "POST", body: { url } });
			if (!meta) return;

			const urlInput = document.getElementById("linkUrl");
			if (urlInput.value.trim() !== url) return; // the form moved on

			const titleInput = document.getElementById("linkTitle");
			const descInput = document.getElementById("linkDescription");

			if (meta.description && !descInput.value.trim()) {
				descInput.value = meta.description;
			}

			// Only replace a title that carries no information (empty or raw URL)
			const currentTitle = titleInput.value.trim();
			if (meta.title && (!currentTitle || currentTitle === url || currentTitle === new URL(url).hostname)) {
				titleInput.value = meta.title;
			}
		} catch {
			/* silent — the instant prefill already did the job */
		}
	}

	// ─── Navigation ──────────────────────────────────────────────────────────

	switchTab(tab) {
		this.activeTab = tab;

		// Update nav buttons
		document.querySelectorAll(".nav-item").forEach((btn) => {
			btn.classList.toggle("active", btn.dataset.tab === tab);
		});

		// Show/hide panels
		document.getElementById("savePanel").classList.toggle("hidden", tab !== "save");
		document.getElementById("libraryPanel").classList.toggle("hidden", tab !== "library");

		document.getElementById("savePanel").classList.toggle("active", tab === "save");
		document.getElementById("libraryPanel").classList.toggle("active", tab === "library");

		if (tab === "library") {
			this.focusSearch();
			if (!this.linksLoaded) this.loadLibrary();
		}
	}

	// ─── Library ─────────────────────────────────────────────────────────────

	async loadLibrary() {
		this.showLinksSkeleton(true);
		try {
			const params = {};
			if (this.linksFilter === "favorites") params.favorite = 1;
			if (this.linksSearchQuery) params.search = this.linksSearchQuery;

			const res = await this.fetchLinks(params);
			this.links = res?.data || res || [];
			this.renderLinks(this.links);
			this.linksLoaded = true;
		} catch (err) {
			if (err.status === 401) {
				await this.forgetSession();
				this.showScreen("loginScreen");
				this.showToast(this.t("sessionExpired"), "error");
				return;
			}
			this.showToast(err.message, "error");
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
		document.getElementById("linksSkeleton").style.display = show ? "" : "none";
		document.getElementById("linksList").style.opacity = show ? "0" : "1";
	}

	renderLinks(links) {
		const list = document.getElementById("linksList");
		const empty = document.getElementById("linksEmpty");
		const footer = document.getElementById("libraryFooter");

		// Remove all existing link cards
		list.querySelectorAll(".link-card").forEach((el) => el.remove());

		if (!links || links.length === 0) {
			empty.style.display = "";
			footer.style.display = "none";
			return;
		}

		empty.style.display = "none";
		footer.style.display = "";

		links.forEach((link) => {
			const card = document.createElement("a");
			card.href = link.url;
			card.target = "_blank";
			card.rel = "noopener noreferrer";
			card.className = "link-card";
			card.dataset.linkId = link.id;

			const faviconUrl = link.favicon_path || link.favicon;
			const faviconHtml = faviconUrl
				? `<img src="${this.escapeHtml(faviconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="link-favicon-fallback" style="display:none">🌐</span>`
				: `<span class="link-favicon-fallback">🌐</span>`;

			const favIcon = link.is_favorite
				? `<span class="material-symbols-outlined link-fav-icon" style="font-variation-settings:'FILL' 1">bookmark</span>`
				: "";

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

		list.style.opacity = "1";
	}

	// ─── Save form ────────────────────────────────────────────────────────────

	resetSaveForm() {
		document.getElementById("linkForm").reset();
		this.selectedTags = [];
		this.selectedFolder = null;
		this.renderPortfolioSelect(); // form.reset() blanks the native select
		this.renderSelectedFolder();
		this.renderSelectedTags();
		if (this.settings.autoGetSelection) {
			this.autoFillCurrentTab();
		}
	}

	// ─── Portfolio picker ────────────────────────────────────────────────────

	setupPortfolioPicker() {
		const select = document.getElementById("portfolioSelect");
		if (!select) return;

		select.addEventListener("change", async () => {
			const id = parseInt(select.value, 10);
			if (!id || id === this.selectedPortfolioId) return;

			this.selectedPortfolioId = id;
			this.cacheSession({ selectedPortfolioId: id });

			// A folder lives in exactly one portfolio: drop a selection that
			// falls out of scope when the user switches portfolios.
			if (this.selectedFolder && this.selectedFolder.portfolio_id !== id) {
				this.selectedFolder = null;
				this.renderSelectedFolder();
			}

			await this.fetchFolders();
			this.renderFolderList(document.getElementById("folderSearch")?.value || "");
		});

		this.renderPortfolioSelect();
	}

	/** The picker stays hidden while the API exposes no portfolios (older deployments). */
	renderPortfolioSelect() {
		const group = document.getElementById("portfolioGroup");
		const select = document.getElementById("portfolioSelect");
		if (!group || !select) return;

		if (!this.portfolios.length) {
			group.classList.add("hidden");
			return;
		}

		group.classList.remove("hidden");
		select.innerHTML = this.portfolios
			.map((p) => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`)
			.join("");
		if (this.selectedPortfolioId) select.value = String(this.selectedPortfolioId);
	}

	// ─── Folder picker ───────────────────────────────────────────────────────

	setupFolderPicker() {
		const display = document.getElementById("folderDisplay");
		const dropdown = document.getElementById("folderDropdown");
		const arrow = display.querySelector(".picker-arrow");
		const searchIn = document.getElementById("folderSearch");
		const list = document.getElementById("folderList");

		const open = () => {
			dropdown.classList.remove("hidden");
			display.classList.add("open");
			arrow.classList.add("rotated");
			this.renderFolderList("");
			searchIn.focus();
		};

		const close = () => {
			dropdown.classList.add("hidden");
			display.classList.remove("open");
			arrow.classList.remove("rotated");
			searchIn.value = "";
		};

		display.addEventListener("click", (e) => {
			if (e.target.closest(".folder-chip-remove")) return;
			dropdown.classList.contains("hidden") ? open() : close();
		});

		searchIn.addEventListener("input", () => this.renderFolderList(searchIn.value));

		list.addEventListener("click", async (e) => {
			const item = e.target.closest(".picker-item");
			if (!item) return;

			const createName = item.dataset.createFolder;
			if (createName) {
				try {
					const res = await this.createFolder(createName);
					const newFolder = res.data || res;
					this.folders.push(newFolder);
					this.selectedFolder = newFolder;
				} catch (err) {
					this.showToast(err.message, "error");
					return;
				}
			} else {
				const id = item.dataset.folderId;
				this.selectedFolder = id ? this.folders.find((f) => f.id == id) || null : null;
			}
			this.renderSelectedFolder();
			close();
		});

		document.addEventListener("click", (e) => {
			if (!e.target.closest("#folderSelect")) close();
		});

		this.renderSelectedFolder();
	}

	renderFolderList(filter = "") {
		const list = document.getElementById("folderList");
		const lower = filter.toLowerCase();

		let html = `<div class="picker-item" data-folder-id="">
            <span class="material-symbols-outlined picker-icon">folder_off</span>
            ${this.escapeHtml(this.t("noFolder") || "No folder")}
        </div>`;

		this.folders
			.filter((f) => (f.name || "").toLowerCase().includes(lower))
			.forEach((f) => {
				const selected = this.selectedFolder?.id === f.id ? " selected" : "";

				html += `<div class="picker-item${selected}" data-folder-id="${f.id}">
                    ${this.folderIconHtml(f)}
                    ${this.escapeHtml(f.name)}
                </div>`;
			});

		if (filter && !this.folders.some((f) => (f.name || "").toLowerCase() === lower)) {
			html += `<div class="picker-item create-new" data-create-folder="${this.escapeHtml(filter)}">
                <span class="material-symbols-outlined picker-icon">create_new_folder</span>
                ${this.t("createFolder") || "Create"}: "${this.escapeHtml(filter)}"
            </div>`;
		}

		if (!this.folders.length && !filter) {
			html += `<div class="picker-empty">${this.t("noItemsFound") || "No folders yet"}</div>`;
		}

		list.innerHTML = html;
	}

	renderSelectedFolder() {
		const display = document.getElementById("selectedFolderDisplay");
		if (this.selectedFolder) {
			const f = this.selectedFolder;

			display.innerHTML = `<span class="folder-chip">
                ${this.folderIconHtml(f)}${this.escapeHtml(f.name)}
                <button class="folder-chip-remove" id="removeFolderBtn" type="button">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </span>`;

			document.getElementById("removeFolderBtn").addEventListener("click", (e) => {
				e.stopPropagation();
				this.selectedFolder = null;
				this.renderSelectedFolder();
			});
		} else {
			display.innerHTML = `<span class="picker-placeholder">${this.t("noFolder") || "No folder"}</span>`;
		}
	}

	// ─── Tags picker ─────────────────────────────────────────────────────────

	setupTagsPicker() {
		const area = document.getElementById("tagsInputArea");
		const input = document.getElementById("tagsSearch");
		const dropdown = document.getElementById("tagsDropdown");
		const list = document.getElementById("tagsList");

		input.addEventListener("focus", () => {
			this.renderTagsList(input.value);
			dropdown.classList.remove("hidden");
		});

		input.addEventListener("input", () => {
			this.renderTagsList(input.value);
		});

		input.addEventListener("keydown", async (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const val = input.value.trim();
				if (!val) return;
				const existing = this.tags.find((t) => t.name.toLowerCase() === val.toLowerCase());
				if (existing && !this.selectedTags.some((t) => t.id === existing.id)) {
					this.selectedTags.push(existing);
					input.value = "";
					this.renderSelectedTags();
					this.renderTagsList("");
				} else if (!existing) {
					try {
						const res = await this.createTag(val);
						const newTag = res.data || res;
						this.tags.push(newTag);
						this.selectedTags.push(newTag);
						input.value = "";
						this.renderSelectedTags();
						this.renderTagsList("");
					} catch (err) {
						this.showToast(err.message, "error");
					}
				}
			} else if (e.key === "Backspace" && !input.value && this.selectedTags.length > 0) {
				this.selectedTags.pop();
				this.renderSelectedTags();
			}
		});

		list.addEventListener("click", async (e) => {
			const item = e.target.closest(".picker-item");
			if (!item) return;

			const createName = item.dataset.createTag;
			if (createName) {
				try {
					const res = await this.createTag(createName);
					const newTag = res.data || res;
					this.tags.push(newTag);
					this.selectedTags.push(newTag);
				} catch (err) {
					this.showToast(err.message, "error");
					return;
				}
			} else {
				const id = parseInt(item.dataset.tagId);
				const tag = this.tags.find((t) => t.id === id);
				if (tag && !this.selectedTags.some((t) => t.id === id)) {
					this.selectedTags.push(tag);
				}
			}
			input.value = "";
			dropdown.classList.add("hidden");
			this.renderSelectedTags();
		});

		document.addEventListener("click", (e) => {
			if (!e.target.closest("#tagsSelect")) {
				dropdown.classList.add("hidden");
			}
		});

		this.renderSelectedTags();
	}

	renderTagsList(filter = "") {
		const list = document.getElementById("tagsList");
		const lower = filter.toLowerCase();
		const selectedIds = this.selectedTags.map((t) => t.id);

		const filtered = this.tags.filter((t) => t.name.toLowerCase().includes(lower) && !selectedIds.includes(t.id));

		let html = "";
		filtered.forEach((t) => {
			html += `<div class="picker-item" data-tag-id="${t.id}">
                <span class="material-symbols-outlined picker-icon" style="color:var(--volt)">sell</span>
                ${this.escapeHtml(t.name)}
            </div>`;
		});

		if (filter && !this.tags.some((t) => t.name.toLowerCase() === lower)) {
			html += `<div class="picker-item create-new" data-create-tag="${this.escapeHtml(filter)}">
                <span class="material-symbols-outlined picker-icon">add</span>
                ${this.t("create") || "Create"}: "${this.escapeHtml(filter)}"
            </div>`;
		}

		if (!html) {
			html = `<div class="picker-empty">${this.t("noItemsFound") || "No tags found"}</div>`;
		}

		list.innerHTML = html;
	}

	renderSelectedTags() {
		const container = document.getElementById("selectedTagsList");
		container.innerHTML = this.selectedTags
			.map(
				(t) =>
					`<span class="tag-chip">
                ${this.escapeHtml(t.name)}
                <button type="button" class="tag-chip-remove" data-remove-tag="${t.id}">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </span>`,
			)
			.join("");

		container.querySelectorAll("[data-remove-tag]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const id = parseInt(btn.dataset.removeTag);
				this.selectedTags = this.selectedTags.filter((t) => t.id !== id);
				this.renderSelectedTags();
			});
		});
	}

	// ─── Event Listeners ─────────────────────────────────────────────────────

	setupEventListeners() {
		// ── Login ──
		document.getElementById("connectBtn").addEventListener("click", async () => {
			const email = document.getElementById("emailInput").value.trim();
			const password = document.getElementById("passwordInput").value.trim();
			if (!email || !password) {
				this.showToast(this.t("enterCredentials") || "Enter email and password", "error");
				return;
			}
			this.showLoading();
			try {
				const data = await this.login(email, password);
				this.apiKey = data.token;
				this.user = data.user;
				await this.saveApiKey(data.token);
				this.cacheSession({ cachedUser: this.user });
				this.setConnection("online");
				this.updateUserUI();
				this.showScreen("appScreen");
				document.getElementById("passwordInput").value = "";
				await this.fetchPortfolios();
				await Promise.all([this.fetchTags(), this.fetchFolders(), this.fetchAiPlan()]);
				this.setupPickers();
				this.switchTab("save");
				this.focusSearch();
				if (this.settings.autoGetSelection) await this.autoFillCurrentTab();
				this.showToast(this.t("connectedSuccess") || "Connected!");
			} catch (err) {
				this.showToast(err.message || this.t("invalidCredentials") || "Invalid credentials", "error");
			} finally {
				this.hideLoading();
			}
		});

		document.getElementById("passwordInput").addEventListener("keydown", (e) => {
			if (e.key === "Enter") document.getElementById("connectBtn").click();
		});

		// ── User dropdown ──
		document.getElementById("userMenuBtn").addEventListener("click", (e) => {
			e.stopPropagation();
			document.getElementById("userDropdown").classList.toggle("hidden");
		});

		document.addEventListener("click", (e) => {
			if (!e.target.closest("#userMenuBtn") && !e.target.closest("#userDropdown")) {
				document.getElementById("userDropdown").classList.add("hidden");
			}
		});

		document.getElementById("openDashboardBtn").addEventListener("click", () => {
			chrome.tabs.create({ url: "https://linkpocket.app/dashboard" });
		});

		// ── Logout ──
		document.getElementById("logoutBtn").addEventListener("click", async () => {
			await this.clearAllData();
			document.getElementById("userDropdown").classList.add("hidden");
			this.showScreen("loginScreen");
			this.focusElement("emailInput");
			this.showToast(this.t("loggedOut") || "Logged out");
		});

		// ── Bottom nav ──
		document.querySelectorAll(".nav-item").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.switchTab(btn.dataset.tab);
				document.getElementById("userDropdown").classList.add("hidden");
			});
		});

		// ── Settings from dropdown ──
		document.getElementById("settingsMenuBtn").addEventListener("click", () => {
			document.getElementById("userDropdown").classList.add("hidden");
			document.getElementById("languageSelect").value = this.settings.language || "en";
			document.getElementById("themeSelect").value = this.settings.theme || "dark";
			document.getElementById("autoGetSelection").checked = this.settings.autoGetSelection !== false;
			this.showScreen("settingsScreen");
		});

		document.getElementById("settingsBackBtn").addEventListener("click", () => {
			this.showScreen("appScreen");
		});

		document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
			this.settings.language = document.getElementById("languageSelect").value;
			this.settings.theme = document.getElementById("themeSelect").value;
			this.settings.autoGetSelection = document.getElementById("autoGetSelection").checked;
			await this.saveSettings();
			this.applyTheme();
			this.applyLanguage();
			this.showToast(this.t("settingsSaved") || "Settings saved");
		});

		const shortcutsBtn = document.getElementById("shortcutsBtn");
		if (shortcutsBtn) {
			shortcutsBtn.addEventListener("click", () => {
				chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
			});
		}

		document.getElementById("clearDataBtn").addEventListener("click", async () => {
			if (confirm(this.t("clearDataConfirm") || "Disconnect from LinkPocket?")) {
				await this.clearAllData();
				this.applyTheme();
				this.applyLanguage();
				this.showScreen("loginScreen");
				this.showToast(this.t("dataCleaned") || "Data cleared");
			}
		});

		// ── Shortcut display ──
		chrome.commands?.getAll?.((commands) => {
			const qs = commands?.find((c) => c.name === "quick-save");
			if (qs?.shortcut) {
				const el = document.getElementById("currentShortcut");
				if (el) el.textContent = qs.shortcut;
			}
		});

		// ── Save form ──
		// AI buttons (Pro+ — visibility handled by updateAiUI)
		document.getElementById("aiDescriptionBtn").addEventListener("click", () => this.aiGenerateDescription());
		document.getElementById("aiTagsBtn").addEventListener("click", () => this.aiSuggestTags());

		document.getElementById("linkForm").addEventListener("submit", async (e) => {
			e.preventDefault();

			const url = document.getElementById("linkUrl").value.trim();
			const title = document.getElementById("linkTitle").value.trim();
			const desc = document.getElementById("linkDescription").value.trim();

			if (!url) {
				this.showToast(this.t("urlRequired") || "URL required", "error");
				return;
			}
			if (!title) {
				this.showToast(this.t("titleRequired") || "Title required", "error");
				return;
			}

			const btn = document.getElementById("saveBtn");
			btn.disabled = true;

			this.showLoading();
			try {
				const body = { url, title };
				if (desc) body.description = desc;
				if (this.selectedFolder) body.categories = [this.selectedFolder.id];
				if (this.selectedTags.length) body.tags = this.selectedTags.map((t) => t.id);

				// EXT-31: the link lands in the chosen folder's portfolio,
				// or in the selected portfolio when saved without a folder.
				const portfolioId = this.selectedFolder?.portfolio_id || this.selectedPortfolioId;
				if (portfolioId) body.portfolio_id = portfolioId;

				await this.createLink(body);
				this.showToast(this.t("linkSaved") || "Link saved!");
				this.resetSaveForm();

				// Reload library next time
				this.linksLoaded = false;
			} catch (err) {
				if (err.status === 401) {
					await this.forgetSession();
					this.showScreen("loginScreen");
					this.focusElement("emailInput");
					this.showToast(this.t("sessionExpired"), "error");
					return;
				}
				this.showToast(err.message || this.t("failedToSave") || "Failed to save", "error");
			} finally {
				this.hideLoading();
				btn.disabled = false;
			}
		});

		// ── Global search (always visible, drives the library tab) ──
		const searchInput = document.getElementById("globalSearchInput");
		const clearBtn = document.getElementById("globalSearchClear");
		let debounce;

		const runSearch = async (query) => {
			this.linksSearchQuery = query;
			this.linksLoaded = false;
			if (this.activeTab !== "library") this.switchTab("library");
			else await this.loadLibrary();
		};

		searchInput.addEventListener("input", () => {
			const val = searchInput.value.trim();
			clearBtn.classList.toggle("hidden", !val);
			clearTimeout(debounce);
			debounce = setTimeout(() => runSearch(val), 350);
		});

		searchInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				clearTimeout(debounce);
				runSearch(searchInput.value.trim());
			} else if (e.key === "Escape" && searchInput.value) {
				e.preventDefault();
				clearBtn.click();
			}
		});

		clearBtn.addEventListener("click", () => {
			clearTimeout(debounce);
			searchInput.value = "";
			clearBtn.classList.add("hidden");
			this.linksSearchQuery = "";
			this.linksLoaded = false;
			this.focusSearch();
			if (this.activeTab === "library") this.loadLibrary();
		});

		// ── Connection banner ──
		document.getElementById("connectionRetryBtn").addEventListener("click", () => {
			this.retryConnection();
		});

		// ── Library: filter chips ──
		document.getElementById("filterChips").addEventListener("click", async (e) => {
			const chip = e.target.closest(".chip");
			if (!chip) return;
			document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
			chip.classList.add("active");
			this.linksFilter = chip.dataset.filter;
			this.linksLoaded = false;
			await this.loadLibrary();
		});
	}
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
	new LinkPocketApp();
});
