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

/**
 * Ligatures available in the bundled Material Symbols subset font
 * (fonts/FONT_SUBSET.md). The full CDN font is no longer loaded, so any
 * ligature outside this set would render as raw text — resolveFolderIcon
 * routes unknown names through the keyword fallback instead.
 */
const BUNDLED_MATERIAL_ICONS = new Set([
	"add", "add_circle", "arrow_back", "auto_awesome", "auto_fix_high",
	"bookmark", "bookmark_add", "check", "check_circle", "chevron_right",
	"close", "cloud", "cloud_off", "code", "contrast", "create_new_folder",
	"delete_sweep", "error", "expand_more", "folder", "folder_off",
	"folder_open", "folder_shared", "folder_special", "headphones", "history",
	"home", "image", "keyboard", "language", "library_books", "link_off",
	"lock", "login", "logout", "mail", "manage_accounts", "menu_book",
	"movie", "music_note", "open_in_new", "photo_library", "public", "search",
	"sell", "shopping_cart", "sports_esports", "swap_vert", "sync", "tune",
	"work",
]);

/** Default production API — overridable from the settings screen (EXT-32). */
const DEFAULT_API_ENDPOINT = "https://linkpocket.app/api";

/** Rows per home section: 0 hides it, 10 is the most the popup will render. */
const MAX_HOME_SECTION_SIZE = 10;
const DEFAULT_HOME_SECTION_SIZE = 5;

/** One page of links is enough to group a library by folder. */
const LIBRARY_PAGE_SIZE = 100;

/** The "Recent" view is a flat timeline — beyond this it stops meaning "recent". */
const RECENT_LINKS_LIMIT = 30;

/**
 * How long a link parked by the context menu stays claimable. `openPopup()`
 * can be refused (no user gesture on the popup's window), and a stale target
 * must not hijack the next manual open days later.
 */
const PENDING_LINK_TTL = 60000;

/** Group key for links that belong to no folder — never a real folder id. */
const UNFILED_ID = "__unfiled__";

/**
 * Single source of truth so a reset restores exactly what a fresh install has.
 * `language: null` means "follow the browser" — the value only becomes explicit
 * once the user picks one in the settings screen.
 */
const DEFAULT_SETTINGS = {
	apiEndpoint: DEFAULT_API_ENDPOINT,
	autoGetSelection: true,
	language: null,
	theme: "dark",
	openInNewTab: true,
	recentCount: DEFAULT_HOME_SECTION_SIZE,
	favoritesCount: DEFAULT_HOME_SECTION_SIZE,
	contextMenuEnabled: true,
	quickSavePortfolioId: null,
	quickSaveFolderId: null,
};

/** Select values are strings; numeric ids go back to the API as numbers. */
function asId(value) {
	if (value === "" || value === null || value === undefined) return null;
	return /^\d+$/.test(String(value)) ? Number(value) : value;
}

/** Per-browser location of the extension shortcuts page (Chromium forks differ). */
function browserShortcutsUrl() {
	const ua = navigator.userAgent || "";
	if (/\bEdg[A-Z]?\//.test(ua)) return "edge://extensions/shortcuts";
	if (/\bOPR\//.test(ua)) return "opera://extensions/shortcuts";
	if (/\bVivaldi\//.test(ua)) return "vivaldi://extensions/shortcuts";
	return "chrome://extensions/shortcuts";
}

class LinkPocketApp {
	constructor() {
		this.apiKey = null;
		this.user = null;
		this.settings = { ...DEFAULT_SETTINGS };
		this.tags = [];
		this.folders = [];
		this.portfolios = [];
		this.selectedPortfolioId = null;
		// Folders of the quick save library, which is not always the active one
		this.quickSaveFolders = [];
		// Destination being edited in the settings screen, committed on Save
		this.quickSaveDraft = { portfolioId: null, folderId: null };
		// Only a list that actually arrived can prove a stored folder is gone
		this.quickSaveFoldersLoaded = false;
		this.selectedTags = [];
		this.selectedFolder = null;
		this.currentLang = typeof detectLanguage === "function" ? detectLanguage() : "en";
		this.aiPlan = null; // { plan, canUseAI, aiQuota } — AI buttons stay hidden until known
		this.aiPlanError = null; // HTTP status of the last failed /plan call (404 = outdated API)

		// Library state. The filter picks *which* links are listed (all /
		// recently saved / favorites); the sort picks their order — the two are
		// independent, and both survive popup reopens via chrome.storage.local.
		this.links = [];
		this.linksFilter = "all";
		this.linksSort = "recent";
		this.linksLoaded = false;
		this.collapsedFolders = new Set();

		// Home state
		this.homeRecent = [];
		this.homeFavorites = [];
		this.homeLoaded = false;
		this.homeLoading = null;
		this.homeAvailable = true;

		// Active browser tab, or null when it cannot be saved
		this.currentTab = null;

		// Link handed over by the "Save to LinkPocket" context menu entry
		this.pendingLink = null;

		// Command palette state
		this.paletteOpen = false;
		this.paletteResults = [];
		this.paletteIndex = -1;
		this.paletteQuery = "";
		this.paletteRequestId = 0;

		// Active tab
		this.activeTab = "home";

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
		// Read before the first render: it decides which tab the popup opens on
		this.pendingLink = await this.consumePendingLink();
		this.setupEventListeners();
		this.checkAuthStatus();
	}

	/**
	 * The "Save to LinkPocket" context menu entry parks its target in local
	 * storage and opens the popup; claiming it here is what turns that click
	 * into a prefilled save form instead of a plain home screen.
	 */
	async consumePendingLink() {
		return new Promise((resolve) => {
			chrome.storage.local.get(["pendingUrl", "pendingTitle", "pendingAt"], (data) => {
				chrome.storage.local.remove(["pendingUrl", "pendingTitle", "pendingAt"]);

				if (!data.pendingUrl) return resolve(null);
				if (data.pendingAt && Date.now() - data.pendingAt > PENDING_LINK_TTL) return resolve(null);

				resolve({ url: data.pendingUrl, title: data.pendingTitle || "" });
			});
		});
	}

	// ─── Localisation ─────────────────────────────────────────────────────────

	t(key) {
		return (typeof LOCALES !== "undefined" && LOCALES[this.currentLang]?.[key]) || (typeof LOCALES !== "undefined" && LOCALES.en?.[key]) || key;
	}

	applyLanguage() {
		this.currentLang = this.settings.language || (typeof detectLanguage === "function" ? detectLanguage() : "en");
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

				// v1.1 stored a separate on/off switch per section; a count of 0
				// now carries that meaning. Fold the old flag in before dropping it.
				if (data.settings?.showRecent === false) this.settings.recentCount = 0;
				if (data.settings?.showFavorites === false) this.settings.favoritesCount = 0;
				delete this.settings.showRecent;
				delete this.settings.showFavorites;

				// Stored counts may come from an older build or a hand-edited
				// profile: clamp them so the home screen cannot request an absurd page.
				this.settings.recentCount = this.normalizeSectionSize(this.settings.recentCount);
				this.settings.favoritesCount = this.normalizeSectionSize(this.settings.favoritesCount);
				resolve();
			});
		});
	}

	normalizeSectionSize(value) {
		const size = parseInt(value, 10);
		if (!Number.isFinite(size)) return DEFAULT_HOME_SECTION_SIZE;
		return Math.min(Math.max(size, 0), MAX_HOME_SECTION_SIZE);
	}

	async saveSettings() {
		return new Promise((resolve) => {
			chrome.storage.sync.set({ settings: this.settings }, resolve);
		});
	}

	// ─── Settings screen ─────────────────────────────────────────────────────

	/** Fill every control from the live settings, then show the screen. */
	async openSettings() {
		document.getElementById("userDropdown").classList.add("hidden");
		document.getElementById("languageSelect").value = this.settings.language || this.currentLang;
		document.getElementById("themeSelect").value = this.settings.theme || "dark";
		document.getElementById("autoGetSelection").checked = this.settings.autoGetSelection !== false;
		document.getElementById("openInNewTabSetting").checked = this.settings.openInNewTab !== false;
		document.getElementById("contextMenuSetting").checked = this.settings.contextMenuEnabled !== false;
		document.getElementById("recentCountSelect").value = String(this.settings.recentCount);
		document.getElementById("favoritesCountSelect").value = String(this.settings.favoritesCount);
		this.closePalette();
		this.showScreen("settingsScreen");
		this.renderShortcutHint();

		// The destination is only committed on Save, so the screen edits a draft
		// rather than the live settings.
		this.quickSaveDraft = {
			portfolioId: this.resolvedQuickSavePortfolioId(),
			folderId: this.settings.quickSaveFolderId ?? null,
		};

		// Draw from what is already known, then refine it once the folders of
		// the target library are in — the screen must not wait on the network.
		this.renderQuickSaveDestination();
		await this.loadQuickSaveFolders(this.quickSaveDraft.portfolioId);
		this.renderQuickSaveDestination();
	}

	/** The stored library, or the active one while nothing has been chosen. */
	resolvedQuickSavePortfolioId() {
		const stored = this.settings.quickSavePortfolioId;
		if (stored && this.portfolios.some((p) => p.id == stored)) return stored;
		return this.selectedPortfolioId;
	}

	/**
	 * The quick save destination can point at a library other than the active
	 * one, whose folders `this.folders` does not hold — fetch those separately.
	 */
	async loadQuickSaveFolders(portfolioId) {
		this.quickSaveFoldersLoaded = false;

		if (portfolioId && portfolioId == this.selectedPortfolioId) {
			this.quickSaveFolders = this.folders;
			this.quickSaveFoldersLoaded = true;
			return;
		}
		if (!this.apiKey) {
			this.quickSaveFolders = [];
			return;
		}

		try {
			const query = portfolioId ? `?portfolio_id=${encodeURIComponent(portfolioId)}` : "";
			const res = await this.apiRequest(`/categories${query}`);
			this.quickSaveFolders = res?.data || res || [];
			this.quickSaveFoldersLoaded = true;
		} catch {
			// Unknown, not empty: leave the flag down so nothing gets cleared
			this.quickSaveFolders = [];
		}
	}

	/**
	 * The quick save never opens the popup, so its destination is picked here
	 * once: a library and, inside it, an optional folder.
	 */
	renderQuickSaveDestination() {
		const portfolioRow = document.getElementById("quickSavePortfolioRow");
		const portfolioSelect = document.getElementById("quickSavePortfolioSelect");
		const folderSelect = document.getElementById("quickSaveFolderSelect");
		if (!portfolioRow || !portfolioSelect || !folderSelect) return;

		// Older deployments expose no portfolios: an empty picker helps nobody.
		portfolioRow.classList.toggle("hidden", !this.portfolios.length);

		portfolioSelect.innerHTML = this.portfolios.map((p) => `<option value="${this.escapeHtml(String(p.id))}">${this.escapeHtml(p.name)}</option>`).join("");
		if (this.quickSaveDraft.portfolioId) portfolioSelect.value = String(this.quickSaveDraft.portfolioId);
		// A library that no longer exists leaves the select on its first option:
		// read the effective choice back so the draft cannot drift from it.
		if (this.portfolios.length) this.quickSaveDraft.portfolioId = asId(portfolioSelect.value);

		const folders = this.quickSaveFolders || [];
		folderSelect.innerHTML = [`<option value="">${this.escapeHtml(this.t("noFolder"))}</option>`]
			.concat(folders.map((f) => `<option value="${this.escapeHtml(String(f.id))}">${this.escapeHtml(f.name)}</option>`))
			.join("");

		// A folder deleted since the last visit — or one belonging to another
		// library — must not stay selected in a list that no longer holds it.
		// Only a list that actually loaded proves that: a fetch still in flight
		// (or failed) must never silently clear the stored choice.
		const draftFolder = this.quickSaveDraft.folderId;
		const known = folders.some((f) => f.id == draftFolder);
		folderSelect.value = draftFolder && known ? String(draftFolder) : "";
		if (this.quickSaveFoldersLoaded && !known) this.quickSaveDraft.folderId = null;
	}

	/**
	 * Shortcuts belong to the browser: state what is bound right now and link
	 * out to the page that changes it — the extension never rebinds anything.
	 */
	renderShortcutHint() {
		const hint = document.getElementById("shortcutHint");
		if (!hint) return;

		const write = (commands) => {
			const shortcutFor = (name) => (commands || []).find((c) => c.name === name)?.shortcut || "";
			const notSet = this.t("shortcutNotSet");
			const bindings = {
				":open": shortcutFor("_execute_action") || notSet,
				":quick": shortcutFor("quick-save") || notSet,
			};

			// Each placeholder becomes a <kbd> so the binding stands out.
			const nodes = this.t("shortcutsManagedByBrowser")
				.split(/(:open|:quick)/)
				.filter(Boolean)
				.map((part) => {
					if (!(part in bindings)) return document.createTextNode(part);
					const kbd = document.createElement("kbd");
					kbd.textContent = bindings[part];
					return kbd;
				});

			hint.replaceChildren(...nodes);
		};

		try {
			chrome.commands?.getAll?.(write);
		} catch {
			write([]);
		}
	}

	/**
	 * Load the token plus the last known user / folders / tags so the popup can
	 * render instantly — and stay usable when the API is unreachable.
	 */
	async loadSession() {
		return new Promise((resolve) => {
			const keys = ["apiKey", "cachedUser", "cachedFolders", "cachedTags", "cachedPortfolios", "selectedPortfolioId", "cachedHomeRecent", "cachedHomeFavorites", "collapsedFolders", "libraryFilter", "librarySort"];
			chrome.storage.local.get(keys, (data) => {
				this.apiKey = data.apiKey || null;
				this.user = data.cachedUser || null;
				this.folders = data.cachedFolders || [];
				this.tags = data.cachedTags || [];
				this.portfolios = data.cachedPortfolios || [];
				this.selectedPortfolioId = data.selectedPortfolioId || null;
				// The home screen paints from cache before the network answers.
				this.homeRecent = data.cachedHomeRecent || [];
				this.homeFavorites = data.cachedHomeFavorites || [];
				// Folders are expanded by default: only the closed ones are stored,
				// so a folder created later shows up open rather than hidden.
				this.collapsedFolders = new Set(data.collapsedFolders || []);
				// Restore the library view exactly as the user left it.
				if (["all", "recent", "favorites"].includes(data.libraryFilter)) this.linksFilter = data.libraryFilter;
				if (["recent", "alpha", "alphaDesc", "clicks"].includes(data.librarySort)) this.linksSort = data.librarySort;
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
			chrome.storage.local.remove(["apiKey", "cachedUser", "cachedFolders", "cachedTags", "cachedPortfolios", "selectedPortfolioId", "cachedHomeRecent", "cachedHomeFavorites", "collapsedFolders", "libraryFilter", "librarySort"], resolve);
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
					this.linksFilter = "all";
					this.linksSort = "recent";
					this.linksLoaded = false;
					this.homeRecent = [];
					this.homeFavorites = [];
					this.homeLoaded = false;
					this.collapsedFolders = new Set();
					this.settings = { ...DEFAULT_SETTINGS };
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

	/**
	 * Stable per-install identifier, so the API scopes the token to this
	 * browser: logging in elsewhere no longer revokes this session.
	 */
	async getDeviceId() {
		const { deviceId } = await chrome.storage.local.get(["deviceId"]);
		if (deviceId) return deviceId;
		const fresh = crypto.randomUUID();
		await chrome.storage.local.set({ deviceId: fresh });
		return fresh;
	}

	async login(email, password) {
		const deviceId = await this.getDeviceId();
		return this.httpRequest("/extension/login", { method: "POST", body: { email, password, device_id: deviceId }, auth: false }, 15000);
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
		this.renderPortfolioBar();
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

		// Material Symbols ligature (classic theme) — only bundled icons can
		// render; anything else goes through the keyword fallback.
		if (/^[a-z][a-z0-9_]*$/.test(name)) {
			return { type: "material", value: BUNDLED_MATERIAL_ICONS.has(name) ? name : this.materialEquivalent(name) };
		}

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
		this.renderLibraryControls();
		this.switchTab(this.pendingLink ? "save" : "home");
		this.setupPickers();
		if (!hasCache) this.showLoading();
		if (this.pendingLink) this.applyPendingLink();
		else this.focusSearch();

		// Always needed: the home card offers to save the current page even
		// when the save form is not auto-filled.
		this.loadCurrentTab();

		await this.syncSession({ silent: hasCache });
		this.hideLoading();

		// Refresh once the session is known to be valid: only now are the
		// portfolios and folders known, which both views are scoped by.
		await this.loadHome({ force: true });
		if (this.activeTab === "library") {
			this.linksLoaded = false;
			await this.loadLibrary();
		}
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

		// The whole save form is inert on a page that cannot be saved, and
		// fetchAiPlan() resolves after loadCurrentTab() — without this the AI
		// buttons would come back enabled inside a greyed-out form.
		const canUse = this.aiPlan.canUseAI && !!this.currentTab;
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
		if (ok && this.activeTab === "home") {
			await this.loadHome({ force: true });
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

		this.renderAvatar();
	}

	/**
	 * Same avatar as the web app: `avatar_url` is a full gravatar URL, a path
	 * relative to the app for an uploaded picture, or null when the user picked
	 * initials — which is what the popup already draws.
	 */
	renderAvatar() {
		const url = this.absoluteAppUrl(this.user?.avatar_url);

		for (const [imgId, initialId] of [
			["userAvatarImg", "userInitial"],
			["dropdownAvatarImg", "dropdownInitial"],
		]) {
			const img = document.getElementById(imgId);
			const initial = document.getElementById(initialId);
			if (!img || !initial) continue;

			img.classList.toggle("hidden", !url);
			initial.classList.toggle("hidden", !!url);
			if (url && img.src !== url) {
				// A dead avatar URL must not leave an empty circle
				img.onerror = () => {
					img.classList.add("hidden");
					initial.classList.remove("hidden");
				};
				img.src = url;
			}
		}
	}

	/** Resolve an app-relative path against the API host. */
	absoluteAppUrl(value) {
		if (!value) return null;
		if (/^https?:\/\//i.test(value)) return value;
		try {
			return new URL(value, new URL(this.settings.apiEndpoint).origin).href;
		} catch {
			return null;
		}
	}

	/**
	 * Honour the "open in a new tab" preference. The popup cannot simply let the
	 * anchor navigate: with target="_self" the page would load inside the popup
	 * itself, so the current tab is driven through the tabs API either way.
	 */
	openLink(url) {
		const href = this.safeHref(url);
		if (!href) return;

		if (this.settings.openInNewTab === false) chrome.tabs.update({ url: href });
		else chrome.tabs.create({ url: href });

		window.close();
	}

	/** Internal browser pages carry no savable URL. */
	isSavableTab(tab) {
		return !!tab?.url && /^https?:\/\//i.test(tab.url);
	}

	faviconUrlFor(url) {
		return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`;
	}

	/**
	 * Resolve the active tab once, then feed both consumers: the home screen's
	 * "add current site" card (always) and the save form (only when auto-fill
	 * is on). Querying once keeps the two views from ever disagreeing.
	 */
	async loadCurrentTab() {
		try {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			this.currentTab = this.isSavableTab(tab) ? tab : null;
		} catch {
			this.currentTab = null;
		}

		this.renderCurrentSiteCard();
		// The context menu target wins over the active tab — they differ as soon
		// as the user right-clicked a link rather than the page itself.
		if (this.settings.autoGetSelection && !this.pendingLink) this.autoFillCurrentTab();
	}

	/**
	 * The button that jumps to the save tab, already filled in. It exists twice
	 * — on the home screen, and in the library for when the home tab is off —
	 * and both copies always show the same page.
	 */
	renderCurrentSiteCard() {
		const cards = [
			{ btn: "addCurrentBtn", url: "addCurrentUrl", img: "addCurrentFavicon" },
			{ btn: "libraryAddCurrentBtn", url: "libraryAddCurrentUrl", img: "libraryAddCurrentFavicon" },
		];

		for (const ids of cards) {
			const btn = document.getElementById(ids.btn);
			const urlEl = document.getElementById(ids.url);
			const img = document.getElementById(ids.img);
			if (!btn || !urlEl || !img) continue;

			if (!this.currentTab) {
				btn.disabled = true;
				urlEl.textContent = this.t("currentSiteUnavailable");
				img.style.display = "none";
				img.nextElementSibling.style.display = "flex";
				continue;
			}

			btn.disabled = false;
			urlEl.textContent = this.currentTab.title || this.currentTab.url;
			img.src = this.faviconUrlFor(this.currentTab.url);
			img.style.display = "";
			img.nextElementSibling.style.display = "none";
		}

		this.renderSaveFormAvailability();
	}

	/**
	 * The save tab exists to capture the page the user is on. On an internal
	 * page there is nothing to capture, so the form is greyed out and the
	 * preview card carries the same message as the home button — rather than
	 * letting the user fill in a form that ends on "URL required".
	 */
	renderSaveFormAvailability() {
		const savable = !!this.currentTab || !!this.pendingLink;
		const card = document.getElementById("currentPageCard");
		const title = document.getElementById("currentPageTitle");
		const url = document.getElementById("currentPageUrl");
		const form = document.getElementById("linkForm");
		if (!card || !form) return;

		card.classList.toggle("is-unavailable", !savable);
		form.classList.toggle("form-disabled", !savable);

		// Native controls stop responding; the custom pickers are divs, so the
		// class above is what makes them inert.
		form.querySelectorAll("input, textarea, select, button").forEach((el) => {
			el.disabled = !savable;
		});

		if (!savable) {
			title.textContent = this.t("currentSiteUnavailable");
			url.textContent = this.t("currentSiteUnavailableHint");
			const favicon = document.getElementById("currentFavicon");
			favicon.style.display = "none";
			favicon.nextElementSibling.style.display = "flex";
			return;
		}

		// Re-enabling must not resurrect AI buttons the plan or quota forbids
		this.updateAiUI();
	}

	/**
	 * Prefill the save form with the link the context menu targeted. It is not
	 * necessarily the active tab: right-clicking a link saves that link.
	 */
	applyPendingLink() {
		const pending = this.pendingLink;
		if (!pending) return;

		document.getElementById("linkUrl").value = pending.url;
		document.getElementById("linkTitle").value = pending.title || "";

		document.getElementById("currentPageTitle").textContent = pending.title || pending.url;
		document.getElementById("currentPageUrl").textContent = pending.url;

		const favicon = document.getElementById("currentFavicon");
		favicon.src = this.faviconUrlFor(pending.url);
		favicon.style.display = "";
		favicon.nextElementSibling.style.display = "none";

		this.renderSaveFormAvailability();
		this.completeMetaFromApi(pending.url);
		this.focusElement("linkTitle");
	}

	autoFillCurrentTab() {
		const tab = this.currentTab;
		if (!tab) return;

		document.getElementById("linkUrl").value = tab.url;
		document.getElementById("linkTitle").value = tab.title || "";

		// Update page preview card
		document.getElementById("currentPageTitle").textContent = tab.title || tab.url;
		document.getElementById("currentPageUrl").textContent = tab.url;

		// Try to load favicon
		const faviconImg = document.getElementById("currentFavicon");
		faviconImg.src = this.faviconUrlFor(tab.url);
		faviconImg.style.display = "";

		// EXT-33: complete title/description from the page's real meta
		// tags, without ever blocking the instant tab.title prefill.
		this.completeMetaFromApi(tab.url);
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
		// The home tab disappears when it has nothing to show
		if (tab === "home" && !this.homeAvailable) tab = "library";
		this.activeTab = tab;

		// Update nav buttons
		document.querySelectorAll(".nav-item").forEach((btn) => {
			btn.classList.toggle("active", btn.dataset.tab === tab);
		});

		// Show/hide panels
		const panels = { home: "homePanel", save: "savePanel", library: "libraryPanel" };
		Object.entries(panels).forEach(([name, id]) => {
			const panel = document.getElementById(id);
			panel.classList.toggle("hidden", name !== tab);
			panel.classList.toggle("active", name === tab);
		});

		// The save tab has its own library picker in the form
		this.renderPortfolioBar();

		if (tab === "home") {
			this.renderHome();
			if (!this.homeLoaded) this.loadHome();
		}

		if (tab === "library") {
			// Re-render even when loaded: the filter may have changed elsewhere
			// (home "see all") since the list was last drawn.
			if (!this.linksLoaded) this.loadLibrary();
			else this.renderLinks(this.links);
		}
	}

	// ─── Home ────────────────────────────────────────────────────────────────

	/**
	 * Fetch whatever the enabled sections need, in parallel. A disabled section
	 * costs no request. Failures are swallowed: the cached lists stay on screen
	 * and the connection banner already tells the user what happened.
	 */
	async loadHome({ force = false } = {}) {
		// Opening the popup renders the home tab and validates the session at
		// almost the same moment; joining the in-flight call keeps that from
		// firing the same two requests twice.
		if (this.homeLoading) return this.homeLoading;
		if (this.homeLoaded && !force) return;
		if (!this.apiKey) return;

		this.homeLoading = this.fetchHome().finally(() => {
			this.homeLoading = null;
		});
		return this.homeLoading;
	}

	async fetchHome() {
		const { recentCount, favoritesCount } = this.settings;
		if (!recentCount && !favoritesCount) {
			this.homeLoaded = true;
			this.renderHome();
			return;
		}

		const [recent, favorites] = await Promise.all([
			recentCount ? this.fetchLinks(this.scoped({ per_page: recentCount })).catch(() => null) : null,
			favoritesCount ? this.fetchLinks(this.scoped({ per_page: favoritesCount, favorite: 1 })).catch(() => null) : null,
		]);

		// `per_page` is honoured by recent API versions only — slice defensively
		// so an older deployment cannot flood the popup with 24 rows.
		this.homeRecent = recentCount && recent ? (recent.data || recent || []).slice(0, recentCount) : [];
		this.homeFavorites = favoritesCount && favorites ? (favorites.data || favorites || []).slice(0, favoritesCount) : [];

		this.cacheSession({ cachedHomeRecent: this.homeRecent, cachedHomeFavorites: this.homeFavorites });
		this.homeLoaded = true;
		this.renderHome();
	}

	renderHome() {
		const { recentCount, favoritesCount } = this.settings;

		const recentShown = this.renderHomeSection("homeRecentSection", "homeRecentList", this.homeRecent.slice(0, recentCount));
		const favoritesShown = this.renderHomeSection("homeFavoritesSection", "homeFavoritesList", this.homeFavorites.slice(0, favoritesCount));

		// Both counts at 0 is a settings decision — answerable straight away.
		// Anything else has to wait for the first fetch, otherwise a cold start
		// would read as "empty" and drop the home tab before it loaded.
		const bothOff = !recentCount && !favoritesCount;
		if (bothOff || this.homeLoaded) {
			this.applyHomeAvailability(!bothOff && (recentShown || favoritesShown));
		}
	}

	/**
	 * An empty home tab is worse than no home tab: when both sections are set to
	 * 0 or come back empty, hide the tab entirely, fall back to the library and
	 * move the "add current site" button there so it stays one click away.
	 */
	applyHomeAvailability(hasContent) {
		this.homeAvailable = hasContent;

		document.getElementById("navHome").classList.toggle("hidden", !hasContent);
		document.getElementById("libraryAddCurrentBtn").classList.toggle("hidden", hasContent);

		if (!hasContent && this.activeTab === "home") this.switchTab("library");
	}

	/** Returns whether the section ended up visible. */
	renderHomeSection(sectionId, listId, links) {
		const section = document.getElementById(sectionId);
		const visible = links.length > 0;
		section.classList.toggle("hidden", !visible);

		// Always rewrite the list, even when hidden: leaving stale cards behind
		// would show yesterday's links the next time the section reappears.
		document.getElementById(listId).replaceChildren(...links.map((link) => this.createLinkCard(link)));

		return visible;
	}

	// ─── Library scoping ─────────────────────────────────────────────────────

	/**
	 * Add the selected library to a query — but only when the account actually
	 * has several. With a single library the filter is noise, and it would hide
	 * links saved before portfolios existed.
	 */
	scoped(params = {}) {
		if (this.portfolios.length > 1 && this.selectedPortfolioId) {
			return { ...params, portfolio_id: this.selectedPortfolioId };
		}
		return params;
	}

	/** The switcher only earns its space when there is something to switch to. */
	renderPortfolioBar() {
		const bar = document.getElementById("portfolioBar");
		const select = document.getElementById("globalPortfolioSelect");
		const multiple = this.portfolios.length > 1;

		bar.classList.toggle("hidden", !multiple || this.activeTab === "save");
		if (!multiple) return;

		select.innerHTML = this.portfolios.map((p) => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join("");
		if (this.selectedPortfolioId) select.value = String(this.selectedPortfolioId);
	}

	/** Switching library invalidates everything scoped to the previous one. */
	async selectPortfolio(id) {
		if (!id || id === this.selectedPortfolioId) return;

		this.selectedPortfolioId = id;
		this.cacheSession({ selectedPortfolioId: id });

		// A folder lives in exactly one library
		if (this.selectedFolder && this.selectedFolder.portfolio_id !== id) {
			this.selectedFolder = null;
			this.renderSelectedFolder();
		}

		this.renderPortfolioSelect();
		this.renderPortfolioBar();

		await this.fetchFolders();
		this.renderFolderList(document.getElementById("folderSearch")?.value || "");

		this.homeLoaded = false;
		this.linksLoaded = false;

		await this.loadHome({ force: true });
		if (this.activeTab === "library") await this.loadLibrary();
	}

	// ─── Library ─────────────────────────────────────────────────────────────

	async loadLibrary() {
		this.showLinksSkeleton(true);
		try {
			// Grouping by folder needs the whole library, not the first 24 rows.
			// "all" and "recent" share the same dataset — they differ only in
			// how render time presents it. Only "favorites" narrows the query,
			// so favorites older than the newest page are still found.
			const params = this.scoped({ per_page: LIBRARY_PAGE_SIZE });
			if (this.linksFilter === "favorites") params.favorite = 1;

			// The tab can be opened before syncSession has fetched the folder
			// tree; without it every link would land under "no folder".
			const [res] = await Promise.all([this.fetchLinks(params), this.folders.length ? Promise.resolve() : this.fetchFolders()]);
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

	/**
	 * The library is grouped by folder, nested to match the folder tree. Every
	 * group is collapsible; collapsed ones are remembered across popup opens so
	 * a folder the user closed does not reappear expanded.
	 */
	renderLinks(links) {
		const list = document.getElementById("linksList");
		const empty = document.getElementById("linksEmpty");
		const footer = document.getElementById("libraryFooter");

		list.querySelectorAll(".folder-group, .link-card").forEach((el) => el.remove());

		if (!links || links.length === 0) {
			empty.style.display = "";
			footer.style.display = "none";
			list.style.opacity = "1";
			return;
		}

		empty.style.display = "none";
		footer.style.display = "";

		// "Recent" is a flat timeline: folder groups would hide what arrived
		// last. The cut keeps the N newest, then the sort picker orders them.
		if (this.linksFilter === "recent") {
			const newest = this.sortNewestFirst(links).slice(0, RECENT_LINKS_LIMIT);
			const nodes = this.sortLinks(newest).map((link) => this.createLinkCard(link));
			nodes.forEach((node) => list.insertBefore(node, empty));
			list.style.opacity = "1";
			return;
		}

		const { byFolder, orphans } = this.groupLinksByFolder(this.sortLinks(links));
		const childrenOf = this.buildFolderTree();

		const nodes = [];
		for (const folder of childrenOf.get(null) || []) {
			const group = this.createFolderGroup(folder, childrenOf, byFolder, 0);
			if (group) nodes.push(group);
		}

		// Links that belong to no folder — or to one this library does not know
		if (orphans.length) {
			nodes.push(this.createGroup(UNFILED_ID, this.t("uncategorized"), "folder_off", orphans, [], 0));
		}

		nodes.forEach((node) => list.insertBefore(node, empty));
		list.style.opacity = "1";
	}

	/** Newest-first regardless of the sort picker — used to define "recent". */
	sortNewestFirst(links) {
		const savedAt = (link) => new Date(link.created_at || 0).getTime();
		return [...links].sort((a, b) => savedAt(b) - savedAt(a));
	}

	/**
	 * Order the links according to the sort picker. Sorting is purely
	 * client-side: the library fetch already holds every row, so changing the
	 * order never costs a request.
	 */
	sortLinks(links) {
		const collator = new Intl.Collator(this.currentLang, { sensitivity: "base", numeric: true });
		const byTitle = (a, b) => collator.compare(a.title || a.url || "", b.title || b.url || "");
		const savedAt = (link) => new Date(link.created_at || 0).getTime();

		const sorted = [...links];
		switch (this.linksSort) {
			case "alpha":
				sorted.sort(byTitle);
				break;
			case "alphaDesc":
				sorted.sort((a, b) => byTitle(b, a));
				break;
			case "clicks":
				// Ties (never-opened links) stay newest-first
				sorted.sort((a, b) => (b.click_count || 0) - (a.click_count || 0) || savedAt(b) - savedAt(a));
				break;
			default:
				sorted.sort((a, b) => savedAt(b) - savedAt(a));
		}
		return sorted;
	}

	/**
	 * A link can sit in several folders, so it is listed under each of them.
	 * Links whose folders are unknown here fall back to the unfiled group,
	 * which guarantees every link is reachable.
	 */
	groupLinksByFolder(links) {
		const known = new Set(this.folders.map((f) => f.id));
		const byFolder = new Map();
		const orphans = [];

		for (const link of links) {
			const folders = (link.categories || []).filter((c) => known.has(c.id));
			if (!folders.length) {
				orphans.push(link);
				continue;
			}
			for (const folder of folders) {
				if (!byFolder.has(folder.id)) byFolder.set(folder.id, []);
				byFolder.get(folder.id).push(link);
			}
		}

		return { byFolder, orphans };
	}

	/** parent_id → children, with roots under `null`. */
	buildFolderTree() {
		const known = new Set(this.folders.map((f) => f.id));
		const childrenOf = new Map();

		for (const folder of this.folders) {
			// A parent outside this library would strand the whole subtree
			const parent = folder.parent_id && known.has(folder.parent_id) ? folder.parent_id : null;
			if (!childrenOf.has(parent)) childrenOf.set(parent, []);
			childrenOf.get(parent).push(folder);
		}

		return childrenOf;
	}

	/** Builds one folder and its subtree, or null when the whole subtree is empty. */
	createFolderGroup(folder, childrenOf, byFolder, depth) {
		const children = (childrenOf.get(folder.id) || [])
			.map((child) => this.createFolderGroup(child, childrenOf, byFolder, depth + 1))
			.filter(Boolean);

		const links = byFolder.get(folder.id) || [];
		if (!links.length && !children.length) return null;

		return this.createGroup(folder.id, folder.name, null, links, children, depth, folder);
	}

	createGroup(id, name, icon, links, children, depth, folder = null) {
		const key = String(id);
		const collapsed = this.collapsedFolders.has(key);

		const group = document.createElement("div");
		group.className = "folder-group";
		group.dataset.folderKey = key;

		const head = document.createElement("button");
		head.type = "button";
		head.className = `folder-head${collapsed ? " collapsed" : ""}`;
		head.style.paddingLeft = `${12 + depth * 14}px`;
		head.setAttribute("aria-expanded", String(!collapsed));

		// Count the subtree, so a collapsed parent still says how much it holds
		const total = links.length + children.reduce((sum, child) => sum + Number(child.dataset.total || 0), 0);

		head.innerHTML = `
                <span class="material-symbols-outlined folder-caret">chevron_right</span>
                ${icon ? `<span class="material-symbols-outlined picker-icon">${icon}</span>` : this.folderIconHtml(folder)}
                <span class="folder-name">${this.escapeHtml(name)}</span>
                <span class="folder-count">${total}</span>
            `;

		const body = document.createElement("div");
		body.className = `folder-body${collapsed ? " hidden" : ""}`;
		body.append(...links.map((link) => this.createLinkCard(link)), ...children);

		group.dataset.total = String(total);
		group.append(head, body);
		return group;
	}

	toggleFolderGroup(head) {
		const group = head.closest(".folder-group");
		const body = group.querySelector(".folder-body");
		const key = group.dataset.folderKey;
		const collapsed = !head.classList.contains("collapsed");

		head.classList.toggle("collapsed", collapsed);
		body.classList.toggle("hidden", collapsed);
		head.setAttribute("aria-expanded", String(!collapsed));

		if (collapsed) this.collapsedFolders.add(key);
		else this.collapsedFolders.delete(key);

		this.cacheSession({ collapsedFolders: [...this.collapsedFolders] });
	}

	/** Hostname for display; a malformed URL must not break the whole list. */
	linkDomain(link) {
		if (link.domain) return link.domain;
		try {
			return new URL(link.url).hostname;
		} catch {
			return link.url || "";
		}
	}

	/**
	 * Only http(s) links are ever navigable — the API validates this on write,
	 * but the popup renders cached rows that may predate that validation.
	 */
	safeHref(url) {
		return /^https?:\/\//i.test(url || "") ? url : null;
	}

	/** One row, shared by the library list and both home sections. */
	createLinkCard(link) {
		const href = this.safeHref(link.url);
		const card = document.createElement("a");
		card.href = href || "#";
		if (href) {
			card.target = "_blank";
			card.rel = "noopener noreferrer";
		}
		card.className = "link-card";
		card.dataset.linkId = link.id;

		const faviconUrl = link.favicon_path || link.favicon;
		const faviconHtml = faviconUrl
			? `<img src="${this.escapeHtml(faviconUrl)}" alt="" /><span class="link-favicon-fallback" style="display:none">🌐</span>`
			: `<span class="link-favicon-fallback">🌐</span>`;

		const favIcon = link.is_favorite
			? `<span class="material-symbols-outlined link-fav-icon" style="font-variation-settings:'FILL' 1">bookmark</span>`
			: "";

		card.innerHTML = `
                <div class="link-favicon-wrap">${faviconHtml}</div>
                <div class="link-info">
                    <div class="link-title">${this.escapeHtml(link.title || link.url)}</div>
                    <div class="link-meta">
                        <span class="link-domain">${this.escapeHtml(this.linkDomain(link))}</span>
                        ${favIcon}
                    </div>
                </div>
                <span class="material-symbols-outlined link-card-open">open_in_new</span>
            `;

		return card;
	}

	// ─── Command palette ─────────────────────────────────────────────────────

	openPalette() {
		this.paletteOpen = true;
		document.getElementById("commandPalette").classList.remove("hidden");
		document.getElementById("globalSearchInput").setAttribute("aria-expanded", "true");
	}

	closePalette() {
		this.paletteOpen = false;
		this.paletteResults = [];
		this.paletteIndex = -1;
		document.getElementById("commandPalette").classList.add("hidden");
		document.getElementById("globalSearchInput").setAttribute("aria-expanded", "false");
	}

	/**
	 * Search on every keystroke. Responses can land out of order, so a request
	 * counter drops anything that is no longer the current query.
	 */
	async runPaletteSearch(query) {
		if (!query) {
			this.closePalette();
			return;
		}

		this.paletteQuery = query;
		this.openPalette();

		const requestId = ++this.paletteRequestId;
		if (!this.paletteResults.length) this.renderPaletteState(this.t("paletteSearching"));

		let links = [];
		try {
			const res = await this.fetchLinks({ search: query, per_page: 8 });
			links = (res?.data || res || []).slice(0, 8);
		} catch (err) {
			if (requestId !== this.paletteRequestId) return;
			this.renderPaletteState(err.message);
			return;
		}

		if (requestId !== this.paletteRequestId) return;

		this.paletteResults = links;
		this.paletteIndex = links.length ? 0 : -1;
		this.renderPalette();
	}

	renderPaletteState(message) {
		document.getElementById("paletteResults").innerHTML = `<div class="palette-state">${this.escapeHtml(message)}</div>`;
	}

	renderPalette() {
		const container = document.getElementById("paletteResults");

		if (!this.paletteResults.length) {
			this.renderPaletteState(this.t("paletteNoResults"));
			return;
		}

		container.replaceChildren(
			...this.paletteResults.map((link, index) => {
				const item = document.createElement("div");
				item.className = `palette-item${index === this.paletteIndex ? " active" : ""}`;
				item.setAttribute("role", "option");
				item.setAttribute("aria-selected", String(index === this.paletteIndex));
				item.dataset.index = index;

				const faviconUrl = link.favicon_path || link.favicon;
				const faviconHtml = faviconUrl
					? `<img src="${this.escapeHtml(faviconUrl)}" alt="" /><span class="link-favicon-fallback" style="display:none">🌐</span>`
					: `<span class="link-favicon-fallback">🌐</span>`;

				item.innerHTML = `
                    <div class="link-favicon-wrap">${faviconHtml}</div>
                    <div class="palette-item-info">
                        <div class="palette-item-title">${this.highlight(link.title || link.url, this.paletteQuery)}</div>
                        <div class="palette-item-domain">${this.escapeHtml(this.linkDomain(link))}</div>
                    </div>
                `;
				return item;
			}),
		);
	}

	/** Escape first, then wrap the matched run — never the other way round. */
	highlight(text, query) {
		const safe = this.escapeHtml(text || "");
		const needle = this.escapeHtml(query || "");
		if (!needle) return safe;

		const at = safe.toLowerCase().indexOf(needle.toLowerCase());
		if (at === -1) return safe;

		return `${safe.slice(0, at)}<mark>${safe.slice(at, at + needle.length)}</mark>${safe.slice(at + needle.length)}`;
	}

	movePaletteSelection(delta) {
		if (!this.paletteResults.length) return;

		const count = this.paletteResults.length;
		this.paletteIndex = (this.paletteIndex + delta + count) % count;
		this.renderPalette();

		document.querySelector(".palette-item.active")?.scrollIntoView({ block: "nearest" });
	}

	openPaletteSelection() {
		this.openLink(this.paletteResults[this.paletteIndex]?.url);
	}

	// ─── Save form ────────────────────────────────────────────────────────────

	resetSaveForm() {
		document.getElementById("linkForm").reset();
		this.selectedTags = [];
		this.selectedFolder = null;
		// The context menu target has been dealt with: follow the tab again
		this.pendingLink = null;
		this.renderPortfolioSelect(); // form.reset() blanks the native select
		this.renderSelectedFolder();
		this.renderSelectedTags();
		// Dropping the pending link can turn the form back into "nothing to save"
		this.renderSaveFormAvailability();
		if (this.settings.autoGetSelection) {
			this.autoFillCurrentTab();
		}
	}

	// ─── Portfolio picker ────────────────────────────────────────────────────

	setupPortfolioPicker() {
		const select = document.getElementById("portfolioSelect");
		if (!select) return;

		// Same handler as the global switcher, so the form and the rest of the
		// popup can never end up pointing at different libraries.
		select.addEventListener("change", () => this.selectPortfolio(parseInt(select.value, 10)));

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
				this.renderLibraryControls();
				this.switchTab(this.pendingLink ? "save" : "home");
				if (this.pendingLink) this.applyPendingLink();
				else this.focusSearch();
				await this.loadCurrentTab();
				await this.loadHome({ force: true });
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

		// ── Save the page the user is on (home, and library when home is off) ──
		const addCurrent = () => {
			if (!this.currentTab) return;
			// Fill the form even when auto-fill is off: the intent is explicit here.
			this.autoFillCurrentTab();
			this.switchTab("save");
			this.focusElement("linkTitle");
		};
		document.getElementById("addCurrentBtn").addEventListener("click", addCurrent);
		document.getElementById("libraryAddCurrentBtn").addEventListener("click", addCurrent);

		// ── Library switcher ──
		document.getElementById("globalPortfolioSelect").addEventListener("change", (e) => {
			this.selectPortfolio(parseInt(e.target.value, 10));
		});

		// ── Library: collapse / expand a folder ──
		document.getElementById("linksList").addEventListener("click", (e) => {
			const head = e.target.closest(".folder-head");
			if (head) this.toggleFolderGroup(head);
		});

		// ── Opening a link goes through the preference, wherever it was clicked.
		// Modified clicks (middle, ctrl/cmd, shift) keep the browser's own
		// behaviour, which the anchor href already provides.
		document.addEventListener("click", (e) => {
			const card = e.target.closest(".link-card");
			if (!card || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
			e.preventDefault();
			this.openLink(card.href);
		});

		// ── Home: "see all" jumps to the matching library filter ──
		document.getElementById("homePanel").addEventListener("click", (e) => {
			const more = e.target.closest("[data-goto-filter]");
			if (!more) return;

			const filter = more.dataset.gotoFilter;
			if (filter !== this.linksFilter) {
				if (!this.datasetShared(this.linksFilter, filter)) this.linksLoaded = false;
				this.linksFilter = filter;
				this.cacheSession({ libraryFilter: this.linksFilter });
				this.renderLibraryControls();
			}
			this.switchTab("library");
		});

		// ── Settings from dropdown ──
		document.getElementById("settingsMenuBtn").addEventListener("click", () => {
			this.openSettings();
		});

		// Switching the quick save library changes which folders it can target —
		// and a folder from the previous one cannot survive the move.
		document.getElementById("quickSavePortfolioSelect").addEventListener("change", async (e) => {
			this.quickSaveDraft.portfolioId = asId(e.target.value);
			this.quickSaveDraft.folderId = null;
			this.quickSaveFolders = [];
			this.renderQuickSaveDestination();
			await this.loadQuickSaveFolders(this.quickSaveDraft.portfolioId);
			this.renderQuickSaveDestination();
		});

		document.getElementById("quickSaveFolderSelect").addEventListener("change", (e) => {
			this.quickSaveDraft.folderId = asId(e.target.value);
		});

		document.getElementById("settingsBackBtn").addEventListener("click", () => {
			this.showScreen("appScreen");
		});

		document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
			this.settings.language = document.getElementById("languageSelect").value;
			this.settings.theme = document.getElementById("themeSelect").value;
			this.settings.autoGetSelection = document.getElementById("autoGetSelection").checked;
			this.settings.openInNewTab = document.getElementById("openInNewTabSetting").checked;
			this.settings.contextMenuEnabled = document.getElementById("contextMenuSetting").checked;
			this.settings.recentCount = this.normalizeSectionSize(document.getElementById("recentCountSelect").value);
			this.settings.favoritesCount = this.normalizeSectionSize(document.getElementById("favoritesCountSelect").value);

			// The draft is the truth — the render keeps it honest. The lookup only
			// serves to pin the folder's own library, so the pair cannot disagree.
			const quickFolder = (this.quickSaveFolders || []).find((f) => f.id == this.quickSaveDraft.folderId) || null;
			this.settings.quickSaveFolderId = this.quickSaveDraft.folderId ?? null;
			this.settings.quickSavePortfolioId = quickFolder?.portfolio_id ?? this.quickSaveDraft.portfolioId ?? null;

			await this.saveSettings();
			this.applyTheme();
			this.applyLanguage();
			this.renderShortcutHint();
			// Re-render the current-site card: applyLanguage() only touches
			// static [data-i18n] nodes, not text written from JS.
			this.renderCurrentSiteCard();

			// A bigger section may need rows the last fetch did not bring back
			this.homeLoaded = false;
			await this.loadHome();

			this.showToast(this.t("settingsSaved") || "Settings saved");
		});

		const shortcutsBtn = document.getElementById("shortcutsBtn");
		if (shortcutsBtn) {
			shortcutsBtn.addEventListener("click", () => {
				chrome.tabs.create({ url: browserShortcutsUrl() });
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

				// The new link belongs at the top of both lists
				this.linksLoaded = false;
				this.homeLoaded = false;

				// Job done: close the popup once the toast has been seen
				setTimeout(() => window.close(), 900);
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

		// ── Global search — command palette ──
		const searchInput = document.getElementById("globalSearchInput");
		const clearBtn = document.getElementById("globalSearchClear");
		const palette = document.getElementById("commandPalette");
		let debounce;

		searchInput.addEventListener("input", () => {
			const val = searchInput.value.trim();
			clearBtn.classList.toggle("hidden", !val);
			clearTimeout(debounce);

			if (!val) {
				this.closePalette();
				return;
			}
			debounce = setTimeout(() => this.runPaletteSearch(val), 250);
		});

		searchInput.addEventListener("keydown", (e) => {
			// Arrows and Enter belong to the palette as soon as it is open;
			// otherwise Enter just runs the search immediately.
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				if (!this.paletteOpen) return;
				e.preventDefault();
				this.movePaletteSelection(e.key === "ArrowDown" ? 1 : -1);
				return;
			}

			if (e.key === "Enter") {
				e.preventDefault();
				clearTimeout(debounce);
				if (this.paletteOpen && this.paletteIndex >= 0) {
					this.openPaletteSelection();
				} else if (searchInput.value.trim()) {
					this.runPaletteSearch(searchInput.value.trim());
				}
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				if (this.paletteOpen) this.closePalette();
				else if (searchInput.value) clearBtn.click();
			}
		});

		palette.addEventListener("click", (e) => {
			const item = e.target.closest(".palette-item");
			if (!item) return;
			this.paletteIndex = parseInt(item.dataset.index, 10);
			this.openPaletteSelection();
		});

		// Hovering must move the keyboard cursor too, or Enter would open a
		// different row than the one under the pointer.
		palette.addEventListener("mousemove", (e) => {
			const item = e.target.closest(".palette-item");
			if (!item) return;
			const index = parseInt(item.dataset.index, 10);
			if (index === this.paletteIndex) return;
			this.paletteIndex = index;
			this.renderPalette();
		});

		document.addEventListener("click", (e) => {
			if (!e.target.closest(".search-toolbar")) this.closePalette();
		});

		clearBtn.addEventListener("click", () => {
			clearTimeout(debounce);
			searchInput.value = "";
			clearBtn.classList.add("hidden");
			this.closePalette();
			this.focusSearch();
		});

		// ── Connection banner ──
		document.getElementById("connectionRetryBtn").addEventListener("click", () => {
			this.retryConnection();
		});

		// ── Library: filter chips ──
		document.getElementById("filterChips").addEventListener("click", async (e) => {
			const chip = e.target.closest(".chip");
			if (!chip || chip.dataset.filter === this.linksFilter) return;

			const sameDataset = this.datasetShared(this.linksFilter, chip.dataset.filter);
			this.linksFilter = chip.dataset.filter;
			this.cacheSession({ libraryFilter: this.linksFilter });
			this.renderLibraryControls();

			// "all" and "recent" share the same rows: switching between them is
			// a pure re-render. Only entering/leaving "favorites" refetches.
			if (sameDataset && this.linksLoaded) {
				this.renderLinks(this.links);
				return;
			}
			this.linksLoaded = false;
			await this.loadLibrary();
		});

		// ── Library: sort order — client-side only, never refetches ──
		document.getElementById("sortSelect").addEventListener("change", (e) => {
			this.linksSort = e.target.value;
			this.cacheSession({ librarySort: this.linksSort });
			if (this.linksLoaded) this.renderLinks(this.links);
		});

		// ── CSP-safe favicon fallback ──
		// MV3 forbids inline `onerror` attributes; error events do not bubble,
		// so one capture-phase listener replaces every per-image handler.
		document.addEventListener(
			"error",
			(e) => {
				const img = e.target;
				if (!(img instanceof HTMLImageElement)) return;
				const fallback = img.nextElementSibling;
				if (fallback && (fallback.classList.contains("favicon-fallback") || fallback.classList.contains("link-favicon-fallback"))) {
					img.style.display = "none";
					fallback.style.display = "flex";
				}
			},
			true,
		);
	}

	/** Two filters share their dataset when neither narrows the query. */
	datasetShared(a, b) {
		return a !== "favorites" && b !== "favorites";
	}

	/** Reflect the stored filter + sort into the library toolbar controls. */
	renderLibraryControls() {
		document.querySelectorAll("#filterChips .chip").forEach((chip) => {
			chip.classList.toggle("active", chip.dataset.filter === this.linksFilter);
		});
		const sortSelect = document.getElementById("sortSelect");
		if (sortSelect) sortSelect.value = this.linksSort;
	}
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
	new LinkPocketApp();
});
