# DUTY FREE - Transport Tracker PWA

**DUTY FREE** est une Progressive Web App de tracking de transports en temps réel. Elle réunit sur une carte unique les positions des **avions**, **bus** et **trains** situés autour de l'utilisateur.

Conçue pour être performante et résiliente, l'application fonctionne hors ligne (mode déconnecté) avec les données chargées par l'utilisateur lors de son utilisation en ligne et gère de manière pragmatique les appels d'API pour éviter au maximum les blacklistages par celles-ci.

---

## Fonctionnalités

* **Géolocalisation :** Affichage des véhicules dans un rayon ajustable (10 à 200 km) autour de l'utilisateur.
* **Réunification de données :** Fusion de données API (Aérien, Ferroviaire, Bus).
* **Installation :** Installable sur mobile en PWA.
* **Mode hors ligne :** L'interface reste accessible et utilisable avec les données chargées en mode en ligne grâce au service-worker.
* **Gestion réfléchie du local storage :** Gestion des données avec des TTL pour limiter les appels API.
* **Cartographie avancée :** Affichage du réseau ferré (OpenRailwayMap) et rotation des icônes selon le bearing communiqué par les APIs.

---

## Architecture

Le projet repose sur une architecture **100% Front-end**, sans backend dédié, utilisant des APIs via un proxy open-source :
`https://cors-anywhere.herokuapp.com/`

> [!IMPORTANT]
>***Si le projet venait à être utilisé de manière réaliste, il devrait être mis en place avec un vrai proxy Node.js par exemple pour éviter les problèmes de CORS actuellement gérés avec cors-anywhere mais limité à 20 requests / minute depuis leur dernier changement. Il en est de même pour OpenSky qui, depuis le 1er janvier 2026, a mis à jour sa politique d'API, ce qui cause de nombreuses erreurs. Pour les éviter, le choix a été fait d'utiliser le endpoint global : `https://opensky-network.org/api/states/all`. Mais cela n'est pas très optimisé pour l'utilisateur, d'où le nombre d'appels réduit.***

---

### Structure du Projet

```
/
├── index.html              # Point d'entrée (Structure HTML + Bulma)
├── service-worker.js       # Script de gestion du cache "Offline First"
├── css/
│   ├── style.css           # Styles personnalisés et animations
│   └── bulma.min.css       # Framework CSS (Responsive)
├── js/
│   ├── script.js           # Cœur de l'application (Logique métier, Map, APIs)
│   └── pwa.js              # Gestion du cycle de vie PWA (Installation, Updates)
├── assets/                 # Ressources graphiques (SVG optimisés)
│   └── icons/              # Ressources graphiques pour la carte (PNG)
├── favicon/                # Ressources favicon pour la PWA (PNG)
│   └── site.webmanifest    # Configuration PWA (Icônes, noms, couleurs)
├── webfonts/               # Police de texte pour le hors-ligne
└── data/                   # Données d'API locales
    └── airports.json       # Coordonnées géographiques des aéroports français en local car format XLS en ligne

```

---

### Gestion requêtes API & API

| Type | Source | Stratégie Technique |
| --- | --- | --- |
| **Avions** | OpenSky Network | Filtrage géographique post-requête (Client-side filtering). |
| **Bus** | Bus-Tracker.fr | Requête par Zone géographique. |
| **Trains** | API Tchoo / Data.gouv | Utilisation d'un Proxy CORS pour l'accès navigateur. |
| **Rails** | OpenRailwayMap | Calque de tuiles (TileLayer) superposé. |
| **GPS** | Système | Récupération de la position précise de l'utilisateur. |
| **WAKE LOCK** | Système | Empêche la mise en veille de l'écran lors de l'utilisation. |

> [!WARNING]
> **IMPORTANT SUR LE CORS :** La PWA utilise `cors-anywhere.herokuapp.com` comme proxy pour contourner les restrictions de sécurité des navigateurs sur certaines APIs.
> **POUR PLUS DE PRÉCISIONS VOIR DANS LA SECTION ARCHITECTURE**


> [!CAUTION]
> **IMPORTANT SUR LE GPS :** La PWA met à jour la position à chaque mouvement mais gère l'espacement entre les requêtes API pour éviter le blacklistage.
> ```javascript
> const now = Date.now();
> if (now - lastRefreshTime > REFRESH_DELAY) {
>     console.log("Actualisation API, délai entre appels OK.");
>     refreshData();
>     lastRefreshTime = now;
> }
> 
> ```
> 
> 

---

## Gestion du local storage

### 1/ Mise en cache

Le fichier `service-worker.js` met en cache la liste suivante de fichiers et de ressources en ligne utilisés dans l'API :

```text
    ./,
    ./index.html,
    ./css/style.css,
    ./js/script.js,
    ./js/pwa.js,
    ./favicon/site.webmanifest,

    ./favicon/web-app-manifest-192x192.png,
    ./favicon/web-app-manifest-512x512.png,
    ./favicon/favicon.svg,
    ./favicon/favicon-96x96.png,
    ./favicon/apple-touch-icon.png,

    https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css

```

### 2/ LocalStorage

Le script principal `script.js` gère un cache pour les réponses d'API pour éviter un effet « usine à gaz » avec le nombre de données qui peut être important.

Pour cela, il prend en compte une chose :

* **Le TTL :** 60 secondes pour les positions, 30 secondes pour les infos supplémentaires.

> [!TIP]
> Le TTL est mesuré suivant l'instant T où l'utilisateur fait la requête à l'API pour éviter les requêtes abusives qui auraient pour conséquence le blacklistage de la PWA par les APIs.

---

## Réutilisation de la PWA

### Prérequis

Pour réutiliser la PWA en local sur votre machine il vous faudra :

* **Un serveur web**

> [!TIP]
> *Normalement fonctionnelle sur n'importe quel service, notez bien qu'elle a été **développée sur** un serveur **Apache**. C'est donc ce service que je recommande.*

**HTTPS est OBLIGATOIRE** (Requis pour le Service Worker et l'API Geolocation).

### Configuration

1. **Téléchargez le projet** dans votre serveur web.
2. **Adaptation de la PWA :**
Ouvrez `js/pwa.js` et modifiez la ligne suivante ***si le chemin d'accès change*** :

```javascript
const REGISTRATION = await navigator.serviceWorker.register(/*Mettez le nouveau lien ici*/);

```

3. **Accédez à l'application** via votre navigateur.

---

## Utilisation sur mobile en mode PWA

1. Ouvrir l'application dans le navigateur.
2. Cliquer sur le bouton **"Télécharger"** dans la barre de navigation.
3. Dès lors l'application est téléchargée sur le mobile et peut être utilisée comme une autre application.
4. Lors d'une mise à jour, un bouton **"Mettre à jour"** devient utilisable automatiquement grâce au fichier `pwa.js`.

---

## Auteur & Crédits aux ressources utilisées

* **Développeur :** ErrorCors
* **Design :** Bulma CSS
* **Cartographie :** Leaflet JS / OpenStreetMap contributors
* **Données :** OpenSky Network, Bus-Tracker, Data.gouv, Tchoo.net
* **Proxy Cors :** Cors-anywhere

---

#### ***Projet étudiant réalisé à l'IUT Annecy.***








