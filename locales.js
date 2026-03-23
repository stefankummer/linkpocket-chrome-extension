// LinkPocket Chrome Extension - Localization

const LOCALES = {
    en: {
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
        apiEndpoint: 'API Endpoint',
        language: 'Language',
        theme: 'Theme',
        themeSystem: 'System',
        themeLight: 'Light',
        themeDark: 'Dark',
        autoFill: 'Auto-fill with current page info',
        shortcutTitle: 'Keyboard Shortcut',
        changeShortcut: 'Change',
        saveSettings: 'Save Settings',
        dangerZone: 'Danger Zone',
        clearAllData: 'Clear All Data',
        clearDataConfirm:
            'Are you sure you want to clear all data? This will log you out and reset all settings.',
        clearDataHint:
            'This only removes local data and disconnects the extension. Your LinkPocket account is not affected.',

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
        apiEndpoint: "Point d'accès API",
        language: 'Langue',
        theme: 'Thème',
        themeSystem: 'Système',
        themeLight: 'Clair',
        themeDark: 'Sombre',
        autoFill: 'Remplir automatiquement avec les infos de la page',
        shortcutTitle: 'Raccourci clavier',
        changeShortcut: 'Modifier',
        saveSettings: 'Enregistrer',
        dangerZone: 'Zone de danger',
        clearAllData: 'Effacer toutes les données',
        clearDataConfirm:
            'Êtes-vous sûr de vouloir effacer toutes les données ? Cela vous déconnectera et réinitialisera tous les paramètres.',
        clearDataHint:
            "Cela supprime uniquement les données locales et déconnecte l'extension. Votre compte LinkPocket n'est pas affecté.",

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
        apiEndpoint: 'API-Endpunkt',
        language: 'Sprache',
        theme: 'Design',
        themeSystem: 'System',
        themeLight: 'Hell',
        themeDark: 'Dunkel',
        autoFill: 'Automatisch mit Seiteninfo ausfüllen',
        shortcutTitle: 'Tastenkombination',
        changeShortcut: 'Ändern',
        saveSettings: 'Speichern',
        dangerZone: 'Gefahrenzone',
        clearAllData: 'Alle Daten löschen',
        clearDataConfirm:
            'Sind Sie sicher, dass Sie alle Daten löschen möchten? Dies meldet Sie ab und setzt alle Einstellungen zurück.',
        clearDataHint:
            'Dies entfernt nur lokale Daten und trennt die Erweiterung. Ihr LinkPocket-Konto ist nicht betroffen.',

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

// Detect browser language
function detectLanguage() {
    const browserLang = navigator.language.split('-')[0];
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
