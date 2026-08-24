# LinkPocket Chrome Extension

Extension MV3 qui enregistre la page courante dans LinkPocket et donne accès à la
bibliothèque de liens.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `manifest.json` | Manifest V3 : permissions, menu contextuel, raccourcis suggérés |
| `background.js` | Service worker : menus contextuels, sauvegarde rapide, notifications |
| `popup.html` / `popup.css` / `popup.js` | Interface du popup (400×600) |
| `content.js` | Retour visuel injecté dans la page après une sauvegarde rapide |
| `locales.js` | Traductions du popup **et** du service worker (en / fr / de) |
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

Le login envoie un `device_id` stable (`crypto.randomUUID`, stocké dans
`chrome.storage.local`, il survit au logout). L'API nomme le jeton
`chrome-extension:<device_id>` et ne remplace que le jeton du même appareil :
une connexion depuis un autre navigateur ne déconnecte plus les autres
installations. Les jetons Sanctum n'expirent pas côté serveur.

## Langue

`detectLanguage()` (dans `locales.js`) lit `chrome.i18n.getUILanguage()`, avec
`navigator.language` en secours, et retombe sur `en` pour toute langue non
traduite. C'est la valeur par défaut : `settings.language` vaut `null` tant que
l'utilisateur n'a pas choisi explicitement dans les réglages. Le service worker
importe le même fichier (`importScripts('locales.js')`), donc les entrées du menu
contextuel et les notifications suivent la langue choisie — et non plus
uniquement celle de l'interface du navigateur. `_locales/` ne sert plus qu'au
`manifest.json` (nom, description, libellé de la commande).

## Onglets

Trois onglets dans la barre du bas : **Accueil**, **Sauvegarder**, **Bibliothèque**.
Le popup ouvre sur Accueil — sauf quand celui-ci n'a rien à montrer (voir plus bas)
ou quand un lien est en attente (voir Menu contextuel).

## Écran d'accueil

En haut, le bouton **Ajouter le site actuel** remplit le formulaire avec l'onglet
courant et bascule sur Sauvegarder. Il est désactivé sur les pages non
enregistrables (`chrome://`, `about:`, tout ce qui n'est pas `http(s)`).

En dessous, deux sections alimentées par `/api/links` : **Récents** (derniers liens
enregistrés) et **Favoris**. Chacune se dimensionne dans les réglages par un
dropdown de 0 à 10 ; **0 masque la section** et n'émet aucune requête. Les deux
listes sont mises en cache (`cachedHomeRecent`, `cachedHomeFavorites`) pour
s'afficher avant la réponse du réseau. « Voir tout » ouvre la Bibliothèque sur le
filtre correspondant.

Quand les deux compteurs valent 0, ou que les deux sections reviennent vides,
l'onglet Accueil est **retiré de la barre** et le popup ouvre sur Bibliothèque, où
le bouton « Ajouter le site actuel » réapparaît. La décision n'est prise qu'une
fois les données chargées : un démarrage à froid ne doit pas être lu comme un
accueil vide.

## Bibliothèques multiples

Un sélecteur apparaît sous la recherche **dès qu'il y a plus d'une bibliothèque**,
partagé par l'Accueil et la Bibliothèque (l'onglet Sauvegarder garde le sien dans
le formulaire ; les deux passent par `selectPortfolio()`, donc ils ne peuvent pas
diverger). La bibliothèque courante est persistée dans `chrome.storage.local`
(`selectedPortfolioId`) et rouverte au lancement suivant. Avec une seule
bibliothèque, aucun `portfolio_id` n'est envoyé — ce qui laisse remonter les liens
enregistrés avant l'existence des bibliothèques.

## Avatar

Le popup affiche le même avatar que le site : `GET /api/user` renvoie
`avatar_url`, qui vaut une URL gravatar absolue, un chemin relatif
(`/storage/…`) pour une image téléversée, ou `null` quand le compte est réglé
sur les initiales. Le chemin relatif est résolu contre l'hôte de l'API, et une
image injoignable retombe sur l'initiale plutôt que de laisser un rond vide.

## Filtres de la bibliothèque

Trois chips, un seul actif à la fois : **Récents** (ordre de l'API,
plus récent d'abord), **Favoris** (`?favorite=1`) et **A-Z**. Le tri A-Z
s'applique **à l'intérieur de chaque dossier** — l'ordre des dossiers vient de
l'API, qui les trie déjà par nom. Ni Récents ni A-Z n'émettent de requête
propre : ils réordonnent la même page côté client.

## Onglet Sauvegarder — page non enregistrable

Sur une page interne (`chrome://`, `about:`, tout ce qui n'est pas `http(s)`), il
n'y a rien à capturer : la carte d'aperçu affiche le même message que le bouton
d'accueil et **le formulaire est grisé et inerte**. `renderSaveFormAvailability()`
pose `disabled` sur les contrôles natifs et `.form-disabled` sur le formulaire —
cette classe coupe `pointer-events`, seul moyen de neutraliser les pickers de
dossier et de tags, qui sont des `div`. Les boutons IA suivent le même état :
`fetchAiPlan()` répond après `loadCurrentTab()` et les réactiverait sinon au
milieu d'un formulaire grisé.

Conséquence assumée : la saisie manuelle d'un lien est elle aussi bloquée sur ces
pages.

## Menu contextuel

Deux entrées, sur la page comme sur un lien, désactivées tant qu'aucun jeton
n'est stocké :

- **Sauvegarder dans LinkPocket** — dépose la cible dans `chrome.storage.local`
  (`pendingUrl`, `pendingTitle`, `pendingAt`) puis ouvre le popup. Celui-ci
  réclame ce lien au démarrage (`consumePendingLink()`) et **ouvre directement
  sur l'onglet Sauvegarder pré-rempli**, au lieu de l'accueil. Le lien en attente
  périme après `PENDING_LINK_TTL` (60 s) : `openPopup()` peut être refusé par le
  navigateur, et une cible oubliée ne doit pas détourner une ouverture manuelle
  ultérieure.
- **Sauvegarde rapide dans LinkPocket** — enregistre sans ouvrir le popup.

Un clic droit **sur un lien** n'a pas de titre propre (Chrome n'expose pas le
texte de l'ancre) : le titre est laissé vide et complété par les métadonnées de
la page cible (`/links/fetch-meta`), côté popup pour la sauvegarde normale,
côté service worker pour la sauvegarde rapide — le nom d'hôte en dernier
recours. Le titre de l'onglet ne décrit que la page, pas le lien.

Le réglage **Afficher LinkPocket dans le menu clic droit** retire les deux
entrées plutôt que de les griser : une entrée inerte occupe la même place. Toute
écriture de `settings` (`chrome.storage.sync`) déclenche une reconstruction
complète des menus — c'est aussi ce qui les retraduit après un changement de
langue.

## Sauvegarde rapide — destination

La sauvegarde rapide n'ouvre jamais le popup : sa destination se choisit une fois
dans les réglages (`quickSavePortfolioId`, `quickSaveFolderId`). Sans réglage,
l'API décide comme avant — aucun `portfolio_id` ni `categories` n'est envoyé.

Le sélecteur de dossier des réglages ne peut pas s'appuyer sur `this.folders`,
qui n'est peuplé que pour la bibliothèque active : `loadQuickSaveFolders()`
récupère à part les dossiers de la bibliothèque visée. Un dossier choisi épingle
sa propre bibliothèque (`portfolio_id`), donc les deux réglages ne peuvent pas se
contredire ; un dossier supprimé depuis retombe sur « Aucun dossier ».

## Raccourcis clavier

Ils appartiennent au navigateur : l'extension n'en réattribue aucun. Les réglages
affichent ce qui est réellement lié — `chrome.commands.getAll()`, chaque liaison
dans un `<kbd>`, « non défini » quand le navigateur a refusé la suggestion — et
un bouton ouvre la page de configuration du navigateur. Cette URL dépend du
navigateur (`browserShortcutsUrl()`) : `chrome://`, `edge://`, `opera://` ou
`vivaldi://extensions/shortcuts`.

## Ouverture des liens

La préférence **Ouvrir les liens dans un nouvel onglet** (activée par défaut)
vaut pour les listes comme pour la palette. Désactivée, le lien remplace
l'onglet courant. Dans les deux cas l'ouverture passe par l'API `tabs` et non
par la navigation de l'ancre : avec `target="_self"` la page se chargerait
*dans le popup*. Les clics modifiés (milieu, ctrl/cmd, maj) sont laissés au
navigateur.

## Bibliothèque — accordéon par dossier

Les liens sont groupés par dossier et imbriqués selon `parent_id`, chaque groupe
étant repliable. Détails qui comptent :

- un dossier vide, et dont aucun descendant ne contient de lien, n'est pas affiché ;
- le compteur d'un dossier inclut tout son sous-arbre, pour rester utile une fois replié ;
- un lien peut appartenir à plusieurs dossiers : il est listé sous chacun ;
- un lien sans dossier connu ici tombe dans **Sans dossier**, ce qui garantit
  qu'aucun lien n'est invisible ;
- les dossiers **repliés** sont mémorisés (`collapsedFolders`) — on ne stocke que
  les fermés, donc un dossier créé plus tard apparaît ouvert ;
- la vue charge une page de 100 liens (`per_page`), suffisant pour grouper.

## Recherche — palette de commande

La barre du haut prend le focus à l'ouverture du popup. Dès qu'on tape, une palette
s'ouvre en surcouche avec les 8 meilleurs résultats (`/api/links?search=`), le terme
recherché surligné :

- `↑` / `↓` déplacent la sélection (elle boucle) ;
- `↵` ouvre le lien sélectionné dans un nouvel onglet et ferme le popup ;
- `Échap` ferme la palette, une seconde fois vide le champ ;
- survoler une ligne déplace aussi la sélection clavier, pour que `↵` ouvre
  toujours ce qui est sous le curseur.

Les réponses hors délai sont ignorées via un compteur de requête, donc une réponse
lente ne peut pas écraser les résultats d'une frappe plus récente. La Bibliothèque
n'est plus pilotée par ce champ : elle garde ses propres filtres Récents / Favoris.

## Piège CSS

Une classe `hidden` ajoutée en JS n'a d'effet que si une règle la couvre. Le fichier
n'avait que des règles par composant (`.panel.hidden`, `.toast.hidden`…), si bien
qu'un élément sans la sienne restait visible. Une règle générique `.hidden` clôt
désormais `popup.css` — les règles par composant, plus spécifiques, continuent de
primer. **Elle doit rester en dernier.**

## Icônes de dossier

`category.icon` renvoyé par l'API dépend du thème d'icônes choisi dans l'app :
ligature Material Symbols, emoji, classe `ph-` / `ri-` / `ti-` / `bi-`, ou
`__image__` pour une icône téléversée. Le popup n'embarque que Material Symbols ;
`resolveFolderIcon()` (`popup.js`) traduit les autres formats via
`FOLDER_ICON_ALIASES` puis une correspondance par mot-clé, avec `folder` en
dernier recours. Ajouter un thème dans `resources/js/folderThemes.js` implique
d'étendre cette table.
