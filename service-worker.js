// Change ce nom (v1, v2, etc.) à chaque modification de code pour forcer la mise à jour chez le client
const CACHE_NAME = 'DUTY_FREE_v3'; 

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/script.js',
    './js/pwa.js',
    './favicon/site.webmanifest',

    './favicon/web-app-manifest-192x192.png',
    './favicon/web-app-manifest-512x512.png',
    './favicon/favicon.svg',
    './favicon/favicon-96x96.png',
    './favicon/apple-touch-icon.png',

    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// Installation du Service Worker
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Mise en cache des ressources...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
        .catch(error => {
            console.error("L'installation a échoué car un fichier est introuvable :", error);
        })
    );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(
                keyList.map(function(key) {
                    if (key !== CACHE_NAME) {
                        console.log("Suppression de l'ancien cache :", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // Force le nouveau service worker à prendre le contrôle immédiatement
    return self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(function() {
                // Fallback optionnel ici
            });
        })
    );
});