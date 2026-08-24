// LinkPocket Chrome Extension - Localization

const LOCALES = {
    en: {
        // AI features (Pro+)
        aiGenerate: 'Generate',
        aiSuggest: 'Suggest',
        aiGenerateDescriptionTitle: 'Generate a description with AI (1 credit)',
        aiSuggestTagsTitle: 'Suggest tags with AI (1 credit)',
        aiCreditsRemaining: ':count AI credits remaining',
        aiCreditsExhausted: 'AI credits exhausted — buy a pack from the Plan page',
        aiUnavailable: 'AI is currently unavailable, please try again later',
        aiApiOutdated: 'AI features are not available on this API endpoint yet',

        // Header
        appName: 'LinkPocket',
        settings: 'Settings',

        // Login
        connectTitle: 'Connect to LinkPocket',
        connectDescription:
            'Enter your email and password to start saving links from any website.',
        email: 'Email',
        emailPlaceholder: 'Enter your email...',
        password: 'Password',
        passwordPlaceholder: 'Enter your password...',
        connect: 'Connect',
        findApiKey: 'Find your API key in your',
        accountSettings: 'profile settings',

        // Main view
        logout: 'Logout',
        save: 'Save',
        library: 'Library',
        addLink: 'Add Link',
        quickSave: 'Quick Save',
        recent: 'Recent',
        favorites: 'Favorites',
        filterAll: 'All',
        sortBy: 'Sort by',
        sortNewest: 'Newest',
        sortAZ: 'A-Z',
        sortZA: 'Z-A',
        sortMostVisited: 'Most visited',

        // Home screen
        home: 'Home',
        addCurrentSite: 'Add current site',
        currentSiteUnavailable: 'This page cannot be saved',
        currentSiteUnavailableHint: 'Open a web page to save it',
        seeAll: 'See all',
        uncategorized: 'No folder',

        // Command palette
        paletteHint: 'navigate',
        paletteHintOpen: 'open',
        paletteSearching: 'Searching…',
        paletteNoResults: 'No link matches',
        noAccount: 'No account?',
        openFullApp: 'Open full app',
        profileSettings: 'Profile settings',
        // Form
        url: 'URL',
        urlPlaceholder: 'https://example.com',
        title: 'Title',
        titlePlaceholder: 'Enter link title',
        description: 'Description',
        descriptionPlaceholder: 'Brief description (optional)',
        folder: 'Folder',
        portfolio: 'Library',
        searchFolder: 'Search or create folder...',
        noFolder: 'No folder',
        createFolder: 'Create folder',
        tags: 'Tags',
        searchTags: 'Search or add tags...',
        saveLink: 'Save Link',
        fetchingMeta: 'Fetching page info...',

        // Quick save tab
        quickSaveTitle: 'Quick Save',
        quickSaveDescription:
            'Click the extension icon on any webpage or use the keyboard shortcut to quickly save the current page.',
        keyboardShortcut: 'Or use the keyboard shortcut:',
        rightClickSave: 'You can also right-click on any page to save it.',

        // Settings
        settingsTitle: 'Settings',
        language: 'Language',
        theme: 'Theme',
        themeSystem: 'System',
        themeLight: 'Light',
        themeDark: 'Dark',
        autoFill: 'Auto-fill with current page info',
        openInNewTab: 'Open links in a new tab',
        homeScreen: 'Home screen',
        homeCountHint: 'Number of rows per section. Set both to 0 to open straight on the library.',
        shortcutTitle: 'Keyboard Shortcut',
        changeShortcut: 'Change',
        saveSettings: 'Save Settings',
        dangerZone: 'Danger Zone',
        clearAllData: 'Clear All Data',
        clearDataConfirm:
            'Are you sure you want to clear all data? This will log you out and reset all settings.',
        clearDataHint:
            'This only removes local data and disconnects the extension. Your LinkPocket account is not affected.',

        // Context menu
        contextMenuSection: 'Context menu',
        showInContextMenu: 'Show LinkPocket in the right-click menu',
        contextMenuSave: 'Save to LinkPocket',
        contextMenuQuickSave: 'Quick save to LinkPocket',

        // Quick save destination
        quickSaveDestination: 'Quick save destination',
        quickSaveDestinationHint:
            'Where the quick save files links, both from the context menu and from the keyboard shortcut.',

        // Shortcuts
        shortcutsManagedByBrowser:
            'Shortcuts are managed in your browser settings. :open currently opens LinkPocket and :quick runs the quick save.',
        shortcutNotSet: 'not set',
        openBrowserShortcuts: 'Browser shortcuts',

        // Notifications (service worker)
        notificationSaved: 'Link saved successfully!',
        notificationFailed: 'Failed to save the link',
        notificationConnect: 'Please connect to LinkPocket first',
        notificationOpenPopup: 'Open LinkPocket to finish saving this link',

        // Multi-select
        create: 'Create',
        noItemsFound: 'No items found',

        // Search tab
        searchLinks: 'Search',
        searchLinksPlaceholder: 'Search your links...',
        noLinksFound: 'No links found',
        searchHint: 'Search by title, URL or description',
        openLink: 'Open',
        back: 'Back',

        // Connection
        offline: 'Cannot reach LinkPocket',
        offlineHint: 'Showing your last synced data.',
        reconnecting: 'Reconnecting…',
        reconnected: 'Connection restored',
        retry: 'Retry',
        planRequired: 'Your plan does not include API access.',
        tooManyRequests: 'Too many requests, please wait a moment.',
        serverError: 'LinkPocket is unavailable, please try again.',

        // Messages
        connectedSuccess: 'Connected successfully!',
        loggedOut: 'Logged out',
        settingsSaved: 'Settings saved',
        dataCleaned: 'All data cleared',
        linkSaved: 'Link saved successfully!',
        enterCredentials: 'Please enter your email and password',
        invalidCredentials: 'Invalid credentials',
        sessionExpired: 'Session expired. Please reconnect.',
        failedToLoad: 'Failed to load data',
        urlRequired: 'URL is required',
        titleRequired: 'Title is required',
        failedToSave: 'Failed to save link',
        remove: 'Remove',
        privacyPolicy: 'Privacy Policy',
    },

    fr: {
        // AI features (Pro+)
        aiGenerate: 'Générer',
        aiSuggest: 'Suggérer',
        aiGenerateDescriptionTitle: "Générer une description avec l'IA (1 crédit)",
        aiSuggestTagsTitle: "Suggérer des tags avec l'IA (1 crédit)",
        aiCreditsRemaining: ':count crédits IA restants',
        aiCreditsExhausted: 'Crédits IA épuisés — achetez un pack depuis la page Plan',
        aiUnavailable: "L'IA est indisponible pour le moment, réessayez plus tard",
        aiApiOutdated: "Les fonctions IA ne sont pas encore disponibles sur ce point d'accès API",

        // Header
        appName: 'LinkPocket',
        settings: 'Paramètres',

        // Login
        connectTitle: 'Connexion à LinkPocket',
        connectDescription:
            "Entrez vos identifiants pour commencer à enregistrer des liens depuis n'importe quel site.",
        email: 'E-mail',
        emailPlaceholder: 'Entrez votre e-mail...',
        password: 'Mot de passe',
        passwordPlaceholder: 'Entrez votre mot de passe...',
        connect: 'Connexion',
        findApiKey: 'Trouvez votre clé API dans vos',
        accountSettings: 'paramètres de profil',

        // Main view
        logout: 'Déconnexion',
        save: 'Sauvegarder',
        library: 'Bibliothèque',
        addLink: 'Ajouter un lien',
        quickSave: 'Sauvegarde rapide',
        recent: 'Récents',
        favorites: 'Favoris',
        filterAll: 'Tous',
        sortBy: 'Trier par',
        sortNewest: 'Plus récents',
        sortAZ: 'A-Z',
        sortZA: 'Z-A',
        sortMostVisited: 'Plus consultés',

        // Home screen
        home: 'Accueil',
        addCurrentSite: 'Ajouter le site actuel',
        currentSiteUnavailable: 'Cette page ne peut pas être enregistrée',
        currentSiteUnavailableHint: 'Ouvrez une page web pour l’enregistrer',
        seeAll: 'Voir tout',
        uncategorized: 'Sans dossier',

        // Command palette
        paletteHint: 'naviguer',
        paletteHintOpen: 'ouvrir',
        paletteSearching: 'Recherche…',
        paletteNoResults: 'Aucun lien ne correspond',
        noAccount: 'Pas de compte ?',
        openFullApp: 'Ouvrir l\'app',
        profileSettings: 'Paramètres du profil',
        // Form
        url: 'URL',
        urlPlaceholder: 'https://exemple.com',
        title: 'Titre',
        titlePlaceholder: 'Entrez le titre du lien',
        description: 'Description',
        descriptionPlaceholder: 'Brève description (optionnel)',
        folder: 'Dossier',
        portfolio: 'Bibliothèque',
        searchFolder: 'Rechercher ou créer un dossier...',
        noFolder: 'Aucun dossier',
        createFolder: 'Créer le dossier',
        tags: 'Tags',
        searchTags: 'Rechercher ou ajouter des tags...',
        saveLink: 'Enregistrer le lien',
        fetchingMeta: 'Récupération des infos...',

        // Quick save tab
        quickSaveTitle: 'Sauvegarde rapide',
        quickSaveDescription:
            "Cliquez sur l'icône de l'extension sur n'importe quelle page ou utilisez le raccourci clavier pour sauvegarder rapidement la page actuelle.",
        keyboardShortcut: 'Ou utilisez le raccourci clavier :',
        rightClickSave: 'Vous pouvez aussi faire un clic droit sur une page pour la sauvegarder.',

        // Settings
        settingsTitle: 'Paramètres',
        language: 'Langue',
        theme: 'Thème',
        themeSystem: 'Système',
        themeLight: 'Clair',
        themeDark: 'Sombre',
        autoFill: 'Remplir automatiquement avec les infos de la page',
        openInNewTab: 'Ouvrir les liens dans un nouvel onglet',
        homeScreen: 'Écran d’accueil',
        homeCountHint: 'Nombre de lignes par section. Mettez les deux à 0 pour ouvrir directement sur la bibliothèque.',
        shortcutTitle: 'Raccourci clavier',
        changeShortcut: 'Modifier',
        saveSettings: 'Enregistrer',
        dangerZone: 'Zone de danger',
        clearAllData: 'Effacer toutes les données',
        clearDataConfirm:
            'Êtes-vous sûr de vouloir effacer toutes les données ? Cela vous déconnectera et réinitialisera tous les paramètres.',
        clearDataHint:
            "Cela supprime uniquement les données locales et déconnecte l'extension. Votre compte LinkPocket n'est pas affecté.",

        // Context menu
        contextMenuSection: 'Menu contextuel',
        showInContextMenu: 'Afficher LinkPocket dans le menu clic droit',
        contextMenuSave: 'Sauvegarder dans LinkPocket',
        contextMenuQuickSave: 'Sauvegarde rapide dans LinkPocket',

        // Quick save destination
        quickSaveDestination: 'Destination de la sauvegarde rapide',
        quickSaveDestinationHint:
            'Où la sauvegarde rapide classe les liens, depuis le menu contextuel comme depuis le raccourci clavier.',

        // Shortcuts
        shortcutsManagedByBrowser:
            'Les raccourcis sont gérés dans les paramètres du navigateur. Actuellement :open pour ouvrir LinkPocket et :quick pour la sauvegarde rapide sont utilisés.',
        shortcutNotSet: 'non défini',
        openBrowserShortcuts: 'Raccourcis du navigateur',

        // Notifications (service worker)
        notificationSaved: 'Lien enregistré avec succès !',
        notificationFailed: "Échec de l'enregistrement du lien",
        notificationConnect: "Veuillez d'abord vous connecter à LinkPocket",
        notificationOpenPopup: "Ouvrez LinkPocket pour terminer l'enregistrement de ce lien",

        // Multi-select
        create: 'Créer',
        noItemsFound: 'Aucun élément trouvé',

        // Search tab
        searchLinks: 'Rechercher',
        searchLinksPlaceholder: 'Rechercher vos liens...',
        noLinksFound: 'Aucun lien trouvé',
        searchHint: 'Rechercher par titre, URL ou description',
        openLink: 'Ouvrir',
        back: 'Retour',

        // Connection
        offline: 'LinkPocket est injoignable',
        offlineHint: 'Affichage des dernières données synchronisées.',
        reconnecting: 'Reconnexion…',
        reconnected: 'Connexion rétablie',
        retry: 'Réessayer',
        planRequired: "Votre offre n'inclut pas l'accès API.",
        tooManyRequests: 'Trop de requêtes, patientez un instant.',
        serverError: 'LinkPocket est indisponible, réessayez.',

        // Messages
        connectedSuccess: 'Connecté avec succès !',
        loggedOut: 'Déconnecté',
        settingsSaved: 'Paramètres enregistrés',
        dataCleaned: 'Toutes les données effacées',
        linkSaved: 'Lien enregistré avec succès !',
        enterCredentials: 'Veuillez entrer votre e-mail et mot de passe',
        invalidCredentials: 'Identifiants invalides',
        sessionExpired: 'Session expirée. Veuillez vous reconnecter.',
        failedToLoad: 'Échec du chargement des données',
        urlRequired: "L'URL est requise",
        titleRequired: 'Le titre est requis',
        failedToSave: "Échec de l'enregistrement du lien",
        remove: 'Supprimer',
        privacyPolicy: 'Politique de confidentialité',
    },

    de: {
        // AI features (Pro+)
        aiGenerate: 'Generieren',
        aiSuggest: 'Vorschlagen',
        aiGenerateDescriptionTitle: 'Beschreibung mit KI generieren (1 Guthaben)',
        aiSuggestTagsTitle: 'Tags mit KI vorschlagen (1 Guthaben)',
        aiCreditsRemaining: ':count KI-Guthaben übrig',
        aiCreditsExhausted: 'KI-Guthaben aufgebraucht — Paket auf der Plan-Seite kaufen',
        aiUnavailable: 'KI ist derzeit nicht verfügbar, bitte später erneut versuchen',
        aiApiOutdated: 'KI-Funktionen sind auf diesem API-Endpunkt noch nicht verfügbar',

        // Header
        appName: 'LinkPocket',
        settings: 'Einstellungen',

        // Login
        connectTitle: 'Mit LinkPocket verbinden',
        connectDescription:
            'Geben Sie Ihre Anmeldedaten ein, um Links von jeder Website zu speichern.',
        email: 'E-Mail',
        emailPlaceholder: 'E-Mail eingeben...',
        password: 'Passwort',
        passwordPlaceholder: 'Passwort eingeben...',
        connect: 'Verbinden',
        findApiKey: 'Finden Sie Ihren API-Schlüssel in Ihren',
        accountSettings: 'Profileinstellungen',

        // Main view
        logout: 'Abmelden',
        save: 'Speichern',
        library: 'Bibliothek',
        addLink: 'Link hinzufügen',
        quickSave: 'Schnellspeichern',
        recent: 'Letzte',
        favorites: 'Favoriten',
        filterAll: 'Alle',
        sortBy: 'Sortieren nach',
        sortNewest: 'Neueste',
        sortAZ: 'A-Z',
        sortZA: 'Z-A',
        sortMostVisited: 'Meist besucht',

        // Home screen
        home: 'Start',
        addCurrentSite: 'Aktuelle Seite hinzufügen',
        currentSiteUnavailable: 'Diese Seite kann nicht gespeichert werden',
        currentSiteUnavailableHint: 'Öffnen Sie eine Webseite, um sie zu speichern',
        seeAll: 'Alle anzeigen',
        uncategorized: 'Kein Ordner',

        // Command palette
        paletteHint: 'navigieren',
        paletteHintOpen: 'öffnen',
        paletteSearching: 'Suche…',
        paletteNoResults: 'Kein Link gefunden',
        noAccount: 'Kein Konto?',
        openFullApp: 'App öffnen',
        profileSettings: 'Profileinstellungen',
        // Form
        url: 'URL',
        urlPlaceholder: 'https://beispiel.de',
        title: 'Titel',
        titlePlaceholder: 'Linktitel eingeben',
        description: 'Beschreibung',
        descriptionPlaceholder: 'Kurze Beschreibung (optional)',
        folder: 'Ordner',
        portfolio: 'Bibliothek',
        searchFolder: 'Ordner suchen oder erstellen...',
        noFolder: 'Kein Ordner',
        createFolder: 'Ordner erstellen',
        tags: 'Tags',
        searchTags: 'Tags suchen oder hinzufügen...',
        saveLink: 'Link speichern',
        fetchingMeta: 'Seiteninfo wird geladen...',

        // Quick save tab
        quickSaveTitle: 'Schnellspeichern',
        quickSaveDescription:
            'Klicken Sie auf einer beliebigen Webseite auf das Erweiterungssymbol oder verwenden Sie die Tastenkombination, um die aktuelle Seite schnell zu speichern.',
        keyboardShortcut: 'Oder verwenden Sie die Tastenkombination:',
        rightClickSave: 'Sie können auch mit der rechten Maustaste auf eine Seite klicken, um sie zu speichern.',

        // Settings
        settingsTitle: 'Einstellungen',
        language: 'Sprache',
        theme: 'Design',
        themeSystem: 'System',
        themeLight: 'Hell',
        themeDark: 'Dunkel',
        autoFill: 'Automatisch mit Seiteninfo ausfüllen',
        openInNewTab: 'Links in neuem Tab öffnen',
        homeScreen: 'Startbildschirm',
        homeCountHint: 'Anzahl Zeilen pro Bereich. Beide auf 0 setzen, um direkt zur Bibliothek zu öffnen.',
        shortcutTitle: 'Tastenkombination',
        changeShortcut: 'Ändern',
        saveSettings: 'Speichern',
        dangerZone: 'Gefahrenzone',
        clearAllData: 'Alle Daten löschen',
        clearDataConfirm:
            'Sind Sie sicher, dass Sie alle Daten löschen möchten? Dies meldet Sie ab und setzt alle Einstellungen zurück.',
        clearDataHint:
            'Dies entfernt nur lokale Daten und trennt die Erweiterung. Ihr LinkPocket-Konto ist nicht betroffen.',

        // Context menu
        contextMenuSection: 'Kontextmenü',
        showInContextMenu: 'LinkPocket im Rechtsklick-Menü anzeigen',
        contextMenuSave: 'In LinkPocket speichern',
        contextMenuQuickSave: 'Schnell in LinkPocket speichern',

        // Quick save destination
        quickSaveDestination: 'Ziel des Schnellspeicherns',
        quickSaveDestinationHint:
            'Wohin das Schnellspeichern Links ablegt — aus dem Kontextmenü wie über die Tastenkombination.',

        // Shortcuts
        shortcutsManagedByBrowser:
            'Tastenkombinationen werden in den Browser-Einstellungen verwaltet. Derzeit öffnet :open LinkPocket und :quick startet das Schnellspeichern.',
        shortcutNotSet: 'nicht festgelegt',
        openBrowserShortcuts: 'Browser-Tastenkombinationen',

        // Notifications (service worker)
        notificationSaved: 'Link erfolgreich gespeichert!',
        notificationFailed: 'Speichern des Links fehlgeschlagen',
        notificationConnect: 'Bitte zuerst mit LinkPocket verbinden',
        notificationOpenPopup: 'Öffnen Sie LinkPocket, um diesen Link zu speichern',

        // Multi-select
        create: 'Erstellen',
        noItemsFound: 'Keine Elemente gefunden',

        // Search tab
        searchLinks: 'Suchen',
        searchLinksPlaceholder: 'Ihre Links durchsuchen...',
        noLinksFound: 'Keine Links gefunden',
        searchHint: 'Suche nach Titel, URL oder Beschreibung',
        openLink: 'Öffnen',
        back: 'Zurück',

        // Connection
        offline: 'LinkPocket ist nicht erreichbar',
        offlineHint: 'Es werden die zuletzt synchronisierten Daten angezeigt.',
        reconnecting: 'Neuverbindung…',
        reconnected: 'Verbindung wiederhergestellt',
        retry: 'Erneut versuchen',
        planRequired: 'Ihr Tarif enthält keinen API-Zugriff.',
        tooManyRequests: 'Zu viele Anfragen, bitte kurz warten.',
        serverError: 'LinkPocket ist nicht verfügbar, bitte erneut versuchen.',

        // Messages
        connectedSuccess: 'Erfolgreich verbunden!',
        loggedOut: 'Abgemeldet',
        settingsSaved: 'Einstellungen gespeichert',
        dataCleaned: 'Alle Daten gelöscht',
        linkSaved: 'Link erfolgreich gespeichert!',
        enterCredentials: 'Bitte geben Sie Ihre E-Mail und Ihr Passwort ein',
        invalidCredentials: 'Ungültige Anmeldedaten',
        sessionExpired: 'Sitzung abgelaufen. Bitte erneut verbinden.',
        failedToLoad: 'Laden der Daten fehlgeschlagen',
        urlRequired: 'URL ist erforderlich',
        titleRequired: 'Titel ist erforderlich',
        failedToSave: 'Speichern des Links fehlgeschlagen',
        remove: 'Entfernen',
        privacyPolicy: 'Datenschutzrichtlinie',
    },
};

// Detect the browser language, used as the default until the user picks one.
// chrome.i18n.getUILanguage() is the browser's own UI language and is available
// in the service worker too, where `navigator.language` is the only fallback.
function detectLanguage() {
    let uiLang = '';
    try {
        uiLang = chrome?.i18n?.getUILanguage?.() || '';
    } catch {
        uiLang = '';
    }
    if (!uiLang && typeof navigator !== 'undefined') uiLang = navigator.language || '';

    const browserLang = uiLang.toLowerCase().split('-')[0];
    return LOCALES[browserLang] ? browserLang : 'en';
}

// Get translation
function t(key, lang = null) {
    const locale = lang || detectLanguage();
    return LOCALES[locale]?.[key] || LOCALES.en[key] || key;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOCALES, detectLanguage, t };
}
