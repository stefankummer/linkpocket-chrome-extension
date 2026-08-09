# LinkPocket Chrome Extension

Extension MV3 qui enregistre la page courante dans LinkPocket et donne accès à la
bibliothèque de liens.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `manifest.json` | Manifest V3 : permissions, menu contextuel, raccourci `Alt+Shift+S` |
| `background.js` | Service worker : menus contextuels, sauvegarde rapide, notifications |
| `popup.html` / `popup.css` / `popup.js` | Interface du popup (400×600) |
| `content.js` | Retour visuel injecté dans la page après une sauvegarde rapide |
| `locales.js` | Traductions de l'interface du popup (en / fr / de) |
| `_locales/` | Chaînes lues par Chrome (nom, description, menus) |

Aucune étape de build : le dossier est chargé tel quel.

## Session et connexion

Le jeton Sanctum est stocké dans `chrome.storage.local` (`apiKey`), avec un cache
de la dernière session connue (`cachedUser`, `cachedFolders`, `cachedTags`).

Règles :

- Le popup s'affiche immédiatement à partir du cache, puis se resynchronise.
- **Seul un `401` efface le jeton.** Réseau injoignable, timeout, `403` (plan sans
  accès API), `429` (throttle) et `5xx` affichent le bandeau de connexion et
  conservent la session.
- Chaque requête a un timeout de 12 s et jusqu'à 2 nouvelles tentatives avec
  backoff exponentiel sur les erreurs transitoires (réseau, `429`, `5xx`).

Cause connue restante : `Api/ExtensionAuthController::login()` supprime les jetons
`chrome-extension` existants, donc une connexion depuis un autre navigateur
déconnecte les autres installations.

## Recherche

La barre de recherche du haut est globale : elle prend le focus à l'ouverture du
popup et à chaque passage sur l'onglet Bibliothèque, et bascule automatiquement
sur cet onglet dès qu'on tape.

## Icônes de dossier

`category.icon` renvoyé par l'API dépend du thème d'icônes choisi dans l'app :
ligature Material Symbols, emoji, classe `ph-` / `ri-` / `ti-` / `bi-`, ou
`__image__` pour une icône téléversée. Le popup n'embarque que Material Symbols ;
`resolveFolderIcon()` (`popup.js`) traduit les autres formats via
`FOLDER_ICON_ALIASES` puis une correspondance par mot-clé, avec `folder` en
dernier recours. Ajouter un thème dans `resources/js/folderThemes.js` implique
d'étendre cette table.
