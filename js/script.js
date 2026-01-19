////////////////////////
// === CONSTANTES === //
////////////////////////

// === CONSTANTES GLOBALES POUR API ===
const API_AVION_URL = "https://opensky-network.org/api/states/all";
const BUS_TRACKER_URL = "https://bus-tracker.fr/api/vehicle-journeys/markers";
const GARES_URL = "https://www.data.gouv.fr/api/1/datasets/r/c498ad8d-2ec7-48ed-9949-28003f49f24f";
const AEROPORTS_URL = "./data/airports.json";
const API_TRAJET_TRAIN_URL = "https://api.tchoo.net/api/carto.php?action=train&numero=";

// --- URL POUR L'API TRAIN
const API_TCHOO_TRAIN_URL = "https://api.tchoo.net/trains.json";
const CORS_PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const FULL_URL = CORS_PROXY_URL + API_TCHOO_TRAIN_URL;

// --- CONSTANTE POUR LE BUS ---
const RAYON_MAX_FETCH = 200;


// === CONSTANTES POUR LEAFLET ===
const MAP_DEFAULT_LAT = 46.603354;
const MAP_DEFAULT_LON = 1.888334;
const MAP_DEFAULT_ZOOM = 6;
const EARTH_RADIUS_KM = 6371;
const ICON_AVION = L.icon({ iconUrl: './assets/plane.svg', iconSize:[35,35], iconAnchor:[17,17] });
const ICON_BUS = L.icon({ iconUrl: './assets/bus.svg', iconSize: [30, 30], iconAnchor: [15, 15] });
const ICON_TRAIN = L.icon({ iconUrl: "./assets/train.svg", iconSize: [32, 32], iconAnchor: [16, 16] });
const ICON_GARE = L.icon({ iconUrl: "./assets/train_station.svg", iconSize: [24,24], iconAnchor: [12,24] });
const ICON_AEROPORT = L.icon({ iconUrl: "./assets/control_tower.svg", iconSize: [30, 30], iconAnchor: [15, 15] });

const LAYERS = {
    geoloc: L.layerGroup(),
    planes: L.layerGroup(),
    buses: L.layerGroup(),
    trainStations: L.layerGroup(),
    trains: L.layerGroup(),
    trainPath: L.layerGroup(),
    airports: L.layerGroup(),
    railways: L.layerGroup()
};

// === CALQUE POUR LES RAILS (Pas en local car dynamique suivant le zoom) ===
const RAILWAYS_TILE_LAYER = L.tileLayer(
    "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
    {
        attribution: '© OpenStreetMap contributors, © OpenRailwayMap',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
    }
);

// === LISTE DES SÉLECTEURS DE LA SIDEBAR ===
const FILTERS_LIST = ["planes", "buses", "trains", "train_stations", "airports", "railways"];




////////////////////////////////
// === VARIABLES GLOBALES === //
////////////////////////////////

let mapInstance = null;
let userLat = null;
let userLon = null;
let radiusKm = 100;

// --- REFRESH APPELS API GPS ---
const REFRESH_DELAY = 60000;
let lastRefreshTime = 0;

// --- ID DU SUIVI GPS ---
let userWatchId = null;


////////////////////
// === LOADER === //
////////////////////

const LOADER = document.getElementById('loader');
function showLoader() {
    if (LOADER) {
        LOADER.classList.add('is-active');
    }
}

function hideLoader() {
    if (LOADER) {
        LOADER.classList.remove('is-active');
    }
}
/////////////////////
// === SIDEBAR === //
/////////////////////


// === GESTION DES SIDEBARS GAUCHE & DROITE ===

function initSidebarEvents() {

    // - SIDEBAR DROITE (INFOS / DÉTAILS) ---
    const SIDEBARRIGHT = document.getElementById("sidebar");
    const SIDEBARCONTENT = document.getElementById("sidebarContent");
    const CLOSEBTN = document.getElementById("closeSidebar");

    if (CLOSEBTN) {
        CLOSEBTN.addEventListener("click", function () {
            if (SIDEBARRIGHT) {
                SIDEBARRIGHT.classList.remove("is-active");
            }

            if (SIDEBARCONTENT) {
                SIDEBARCONTENT.innerHTML = "";
            }
            // --- CLEAR DU LAYER DU TRAJET DE TRAIN POUR EVITER DES AFFICHAGES INCORRECTS ---
            if (LAYERS.trainPath) {
                LAYERS.trainPath.clearLayers();
            }
        });
    }


    // --- SIDEBAR GAUCHE (FILTRES - MOBILE) ---
    const SIDEBARLEFT = document.querySelector(".filter-sidebar");
    let burger = document.getElementById("mobile-menu-toggle");

    // --- CRÉATION DE L'OVERLAY ---
    let overlay = document.getElementById("sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    // --- TOGGLE MENU GAUCHE ---
    function toggleMenu() {
        burger?.classList.toggle("is-active");
        SIDEBARLEFT?.classList.toggle("is-active");
        overlay?.classList.toggle("is-active");
    }

    // --- BURGER AVEC NETTOYAGE DES ANCIENS EVENT (DEBUG) ---
    if (burger) {
        const NEWBURGER = burger.cloneNode(true);
        burger.parentNode.replaceChild(NEWBURGER, burger);
        burger = NEWBURGER;

        burger.addEventListener("click", function (e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // --- CLIC SUR L'OVERLAY FERMETURE ---
    overlay.addEventListener("click", function () {
    if (SIDEBARLEFT?.classList.contains("is-active")) {
        toggleMenu();
        }
    });

    // --- CLIC SUR LA CARTE SUR MOBILE ---
    const MAP = document.getElementById("map");
    if (MAP) {
        MAP.addEventListener("click", function () {
            if (
                window.innerWidth <= 1023 &&
                SIDEBARLEFT &&
                SIDEBARLEFT.classList.contains("is-active")
            ) {
                toggleMenu();
            }
        });
    }
}

// === OUVERTURE SIDEBAR DROITE ===

function openSidebar(htmlContent) {
    const SIDEBAR = document.getElementById("sidebar");
    const CONTENT = document.getElementById("sidebarContent");

    if (SIDEBAR && CONTENT) {
        CONTENT.innerHTML = `<div class="p-4">${htmlContent}</div>`;
        SIDEBAR.classList.add("is-active");
    }
}


// === ACCORDÉONS (FILTRES) ===

function toggleAccordion(id) {
    const CONTENT = document.getElementById(id);
    if (!CONTENT) {
        return;
    }
    const HEADER = content.previousElementSibling;
    CONTENT.classList.toggle("is-expanded");
    HEADER?.classList.toggle("is-expanded");
}


// === TOUT COCHER (FILTRES) ===

function toggleAllInCategory(sourceCheckbox, containerId) {
    const CONTAINER = document.getElementById(containerId);
    if (!CONTAINER) {
        return;
    }
    const CHECKBOXES = CONTAINER.querySelectorAll(
        'input[type="checkbox"]:not(.switch)'
    );

    for (let i = 0; i < CHECKBOXES.length; i++) {
        CHECKBOXES[i].checked = sourceCheckbox.checked;
        CHECKBOXES[i].dispatchEvent(new Event("change"));
    }
}

// === FILTRES ===

function initFilters() {
    for (const FILTERID of FILTERS_LIST) {
        const EL = document.getElementById("filter_" + FILTERID);
        if (EL) {
            EL.addEventListener("change", refreshData);
        }
    }
}

function toggleCategory(categoryId) {
    const CATDIV = document.getElementById(categoryId);
    const MAINCHECK = document.getElementById(`${categoryId}_checkbox`);

    if (!CATDIV || !MAINCHECK) {
        return;
    }
    const CHECKBOXES = CATDIV.querySelectorAll("input[type='checkbox']");
    for (let i = 0; i < CHECKBOXES.length; i++) {
        CHECKBOXES[i].checked = MAINCHECK.checked;
    }

    refreshData();
}



////////////////////////
// === GET GLOBAL === //
////////////////////////

async function get(url) {
    showLoader();
    try {
        const RESPONSE = await fetch(url);
        console.log("Requête terminée pour : " + url);
        if (!RESPONSE.ok) {
            throw new Error("Erreur HTTP : " + RESPONSE.status);
        }
        const DATA = await RESPONSE.json();
        return DATA;
    } catch (error) {
        console.error("Erreur requête :", error);
        return null;
    } finally {
        hideLoader();
    }
}

/////////////////////////////////////////////////////////////////
// === FETCH AVEC GET DES DONNÉES ET MISE EN LOCAL STORAGE === //
/////////////////////////////////////////////////////////////////

async function fetchLocal(key, url) {
    const EXPIREMS = 60000
    const NOW = Date.now();
    // --- 1/ RÉCUPÉRATION DEPUIS LE LOCALSTORAGE ---
    const RAW = localStorage.getItem(key);
    let obj = null;

    if (RAW) {
        try {
            obj = JSON.parse(RAW);
            // --- VÉRIFICATION DU TTL ---
            if (NOW - obj.timestamp < EXPIREMS) {
                console.log(`[LOCALSTORAGE] Chargement depuis '${key}'`);
                return obj.data;
            }
        } catch (e) {
            console.warn("Erreur lecture cache", e);
        }
    }

    // --- 2/ SI LE LOCALSTORAGE EST VIDE OU TTL EXPIRÉ ---
    const DATA = await get(url);

    // --- 3/ MAJ DU LOCALSTORAGE OU STOCKAGE ---
    if (DATA) {
        localStorage.setItem(key, JSON.stringify({ data: DATA, timestamp: NOW }));
        console.log(`[LOCALSTORAGE] Sauvegarde sous '${key}'`);
        return DATA;
    } else {
        console.log('Mode hors connexion utilisation des dernières données en cache.');
        // --- VÉRIF SI OBJ N'EST PAS VIDE ---
        if (obj) {
            return obj.data;
        }
    }
    return null;
}





//////////////////////////////////////////////////////
// === MATHS POUR GÉOLOC ET CALCUL DE POSITION === //
//////////////////////////////////////////////////////

function distanceKm(lat1, lon1, lat2, lon2) {
    const D_LAT = (lat2 - lat1) * Math.PI / 180;
    const D_LON = (lon2 - lon1) * Math.PI / 180;
    const A = Math.sin(D_LAT/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(D_LON/2)**2;
    return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)));
}

function isValidAndInRadius(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number") {
        return false;
    }
    if (!userLat || !userLon){
    return true;
    }
    return distanceKm(userLat, userLon, lat, lon) <= radiusKm;
}


// --- FONCTION D'AJOUT DES MARKERS A LA CARTE ---
function addMarkerToLayer(lat, lon, icon, layer, rotationAngle, popupContentOrFn) {
    const MARKER = L.marker([lat, lon], {
        icon: icon,
        rotationAngle: rotationAngle || 0,
        rotationOrigin: 'center center'
    }).addTo(layer);

    MARKER.on("click", async function() {
      let content;
      if (typeof popupContentOrFn === 'function') {
          content = await popupContentOrFn();
      } else {
          content = popupContentOrFn;
      }
      openSidebar(content);
  });
}






//////////////////////
// === INIT MAP === //
//////////////////////

function initMap() {
    mapInstance = L.map("map").setView([MAP_DEFAULT_LAT, MAP_DEFAULT_LON], MAP_DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(mapInstance);

    const KEYS = Object.keys(LAYERS);
    for (const key of KEYS) {
        LAYERS[key].addTo(mapInstance);
    }
}




////////////////////
// === GÉOLOC === //
////////////////////

function getUserLocation() {
    // --- SI LA GÉOLOC N'EST PAS SUPPORTÉE ON ARRÊTE
    if (!navigator.geolocation) {
        console.warn("La géolocalisation n'est pas supportée.");
        return;
    }

    // --- OPTIONS POUR LA GÉOLOC ---
    const OPTIONS = {
        // --- UTILISATION DU GPS MATÉRIEL ---
        enableHighAccuracy: true,
        // --- SI LE GPS NE FONCTIONNE PAS APRÈS 10s ON ARRÊTE POUR ÉVITER LES BUS (DEBUG) ---
        timeout: 10000,
        // --- ON NE MET PAS DE POSITION EN CACHE ---
        maximumAge: 0
    };

    // --- UTILISATION DE WATCHPOSITION POUR UN RAFRAÎCHISSEMENT À CHAQUE DÉPLACEMENT ---
    userWatchId = navigator.geolocation.watchPosition(
        function(pos) {
            console.log("Nouvelle position");

            userLat = pos.coords.latitude;
            userLon = pos.coords.longitude;

            // --- MAJ DU CERCLE ---
            updateGeolocCircle();


            // ⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠  //
            // ATTENTION AU BAN DES APIS NE PAS ENLEVER CE CODE //
            // ⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠  //
            const NOW = Date.now();
            if (NOW - lastRefreshTime > REFRESH_DELAY) {
                console.log("Actualisation API, délai entre appels OK.");
                refreshData();
                lastRefreshTime = NOW;
            }
        },
        function(e) {
            console.error("Erreur GPS :", e);
        },
        OPTIONS
    );
}

function updateGeolocCircle() {
    LAYERS.geoloc.clearLayers();
    if (!userLat || !userLon) {
        return;
    }
    L.circle([userLat, userLon], { radius: radiusKm * 1000, color: 'blue', fill: false, weight: 2 }).addTo(LAYERS.geoloc);
    L.marker([userLat, userLon]).addTo(LAYERS.geoloc).openPopup();
}

// === CERCLE AUTOUR DU USER ===
function initRadiusSlider() {
    const SLIDER = document.getElementById("radiusSlider");
    const TEXT = document.getElementById("radiusValue");

    if (SLIDER && TEXT) {

        // --- CHANGEMENT VISUEL (INPUT) ---
        SLIDER.addEventListener("input", function(e) {
            radiusKm = parseInt(e.target.value);
            TEXT.textContent = radiusKm + " km";
            updateGeolocCircle();
        });

        // --- RELÂCHEMENT DU SLIDER (CHANGE) ---
        SLIDER.addEventListener("change", function(e) {
            console.log("Changement de rayon : mise à jour de l'affichage.");
            refreshData();
        });
    }
}

///////////////////////
// === WAKE LOCK === //
///////////////////////

let wakeLock = null;

// --- ACTIVATION WAKE LOCK
async function activateWakeLock() {
    // --- VÉRIF SI SUPPORTÉ PAR LE NAVIGATEUR ---
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activé.');

            // --- DÉBOGAGE SI LE WAKE LOCK EST FORCÉ DE S'ARRÊTER (ATTENTION BATTERIE FAIBLE) ---
            wakeLock.addEventListener('release', function() {
                console.log('Wake LOCK désactivé.');
            });

        } catch (e) {
            console.error(`Erreur Lock: ${e}`);
        }
    } else {
        console.warn("Wake Lock n'est pas supporté.");
    }
}

// --- DÉBOGAGE SI L'UTILISATEUR QUITTE ET REVIENT SUR LE NAV POUR ÉVITER LA DÉSACTIVATION ---
function handleVisibilityChange() {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        activateWakeLock();
    }
}

activateWakeLock();

// --- RELANCE AUTOMATIQUE ---
document.addEventListener('visibilitychange', handleVisibilityChange);




//////////////////////////////////////////////////
// === REFRESH GLOBAL POUR AFFICHAGE PROPRE === //
//////////////////////////////////////////////////

function refreshData() {
    handleLayerState("filter_planes", LAYERS.planes, fetchDonneeAvions);
    handleLayerState("filter_buses", LAYERS.buses, fetchDonneeBus);
    handleLayerState("filter_trains", LAYERS.trains, fetchTrains);
    handleLayerState("filter_train_stations", LAYERS.trainStations, fetchGares);
    handleLayerState("filter_airports", LAYERS.airports, fetchAeroports);

    const RAIL_CHECK = document.getElementById("filter_railways");
    if (RAIL_CHECK?.checked) {
        RAILWAYS_TILE_LAYER.addTo(LAYERS.railways);
    } else {
        LAYERS.railways.clearLayers();
    }
}

function handleLayerState(checkboxId, layerGroup, fetchFunction) {
    const CHECKBOX = document.getElementById(checkboxId);
    if (CHECKBOX?.checked) {
        fetchFunction();
    } else  {
    layerGroup.clearLayers();
    }
}



////////////////////////////////////////////
// === REQUÊTES API + TRI DES DONNÉES === //
////////////////////////////////////////////


// === 1/ AVIONS -> PositionsDesAvions ===
async function fetchDonneeAvions() {
    // --- SI ON N'A PAS LA GÉOLOC DE USER ALORS ON NE FAIT AUCUNE REQUÊTE ---

    // --- ATTENTION SI ON COMMENTE CETTE LIGNE ALORS TOUS LES AVIONS DU MONDE S'AFFICHENT !!!! ---

    if (!userLat || !userLon) {
        return;
    }

    // --- INTERROGATION DU LOCAL STORAGE POUR ÉVITER DE FAIRE DES REQUÊTES INUTILES ---
    const DATA = await fetchLocal("PositionsDesAvions", API_AVION_URL);
    if (!DATA?.states)
        return;

    // --- CLEAR DU LAYER POUR ÉVITER LES ERREURS D'AFFICHAGE ---
    LAYERS.planes.clearLayers();
    let state, icao24, callsign, country, time, lastC, lon, lat, alt, ground, vel, heading, vert, html;

    // --- POUR TOUS LES AVIONS ON RÉCUPÈRE LES INFOS DANS UN TAB ---
    for (state of DATA.states) {
        [icao24, callsign, country, time, lastC, lon, lat, alt, ground, vel, heading, vert] = state;
        // --- ON VÉRIF SI L'AVION EST BIEN DANS LE RADIUS CHOISI PAR L'USER ---
        if (isValidAndInRadius(lat, lon)) {
            // --- S'IL EST BIEN DANS LE RAYON ON AJOUTE UN AVION SUR LA CARTE ---
            html = buildPlanePopup(callsign, vel, alt, country, vert, ground, icao24);
            addMarkerToLayer(lat, lon, ICON_AVION, LAYERS.planes, heading, html);
        }
    }
}

// === 2/ BUS -> PositionsDesBus / InfosSuppBus ===
async function fetchDonneeBus() {

    // --- SI ON N'A PAS LA GÉOLOC ALORS ON NE FAIT RIEN ---
    if (!userLat || !userLon) {
        return;
    }

    // --- CALCUL DU RAYON DE 200KM AUTOUR DU USER ---
    let delta_lat = (RAYON_MAX_FETCH / EARTH_RADIUS_KM) * (180 / Math.PI);
    let delta_lon = (RAYON_MAX_FETCH / EARTH_RADIUS_KM) * (180 / Math.PI) / Math.cos(userLat * Math.PI / 180);

    const FACTOR = 1.0;

    const URL = `${BUS_TRACKER_URL}?swLat=${userLat - delta_lat * FACTOR}&swLon=${userLon - delta_lon * FACTOR}&neLat=${userLat + delta_lat * FACTOR}&neLon=${userLon + delta_lon * FACTOR}`;

    const DATA = await fetchLocal("PositionsDesBus", URL);

    if (!DATA?.items) {
        return;
    }

    // --- CLEAR DU LAYER ---
    LAYERS.buses.clearLayers();

    let lat, lon, popupFn, details_url, details;

    for (const item of DATA.items) {
        // --- FILTRAGE SERVICEJOURNEY POUR AFFICHER SEULEMENT LES BUS ET PAS LES TER ---
        if (item.id.includes("ServiceJourney")) {
            continue;
        }

        lat = item.position?.latitude;
        lon = item.position?.longitude;

        if (isValidAndInRadius(lat, lon)) {

            popupFn = async function() {
                openSidebar("Chargement des données...");
                try {
                    details_url = `https://bus-tracker.fr/api/vehicle-journeys/${encodeURIComponent(item.id)}`;
                    // --- 30s DE VALIDITÉ POUR LES DÉTAILS ---
                    details = await fetchLocal("InfosSuppBus_" + item.id, details_url, 30000);
                    return buildBusPopup(details);
                } catch (e) {
                    return "Erreur lors du chargement des données";
                }
            };
            addMarkerToLayer(lat, lon, ICON_BUS, LAYERS.buses, item.position.bearing, popupFn);
        }
    }
}

// === 3/ TRAINS -> PositionsDesTrains / InfosSuppTrains ===
async function fetchTrains() {
    // --- SI ON N'A PAS LA GÉOLOC DE USER ALORS ON NE FAIT AUCUNE REQUÊTE ---
    if (!userLat || !userLon) {
        return;
    }
    // --- APPEL DU LOCAL STORAGE POUR LA POSITION DES TRAINS ---
    const DATA = await fetchLocal("PositionsDesTrains", FULL_URL);

    // --- ON CLEAR TOUS LES LAYERS DES TRAINS ---
    LAYERS.trains.clearLayers();
    LAYERS.trainPath.clearLayers();

    let lat;
    let lon;
    let popupFn;

    for (const FEATURE of DATA.features) {

        // --- TEST SI L'ATTRIBUT GEOMETRY EXISTE BIEN ALORS IL REGARDE SI COORDINATES EXISTE ---
        // --- SINON IL PASSE AU FEATURE SUIVANT ---
        if (!FEATURE.geometry?.coordinates) {
            continue;
        }

        lon = parseFloat(FEATURE.geometry.coordinates[0]);
        lat = parseFloat(FEATURE.geometry.coordinates[1]);

        // --- SI LE TRAIN EST BIEN DANS LE RAYON ALORS ON L'AFFICHE ETC COMME POUR LES AVIONS ---
        if (isValidAndInRadius(lat, lon)) {
            popupFn = async function() {
                if (FEATURE.properties.numero) {
                    await fetchTrajetTrain(FEATURE.properties.numero);
                }
                return buildTrainPopup(FEATURE.properties);
            };
            addMarkerToLayer(lat, lon, ICON_TRAIN, LAYERS.trains, FEATURE.properties.angle, popupFn);
        }
    }
}

// === 4/ TRAJET TRAIN -> Utilise InfosSuppTrains ===
async function fetchTrajetTrain(trainNumero) {

    // --- SI LE TRAIN N'A PAS DE NUMÉRO ON NE CONTINUE PAS CAR IL EST OBLIGATOIRE POUR L'URL SUIVANT ---
    if (!trainNumero) {
        return;
    }

    // --- ON CLEAR L'ANCIEN CHEMIN POUR ÊTRE SÛR QUE LA CARTE SOIT PROPRE ---
    LAYERS.trainPath.clearLayers();

    // --- ON CONSTRUIT L'URL AVEC LE NUMÉRO DE TRAIN
    const URL = CORS_PROXY_URL + API_TRAJET_TRAIN_URL + trainNumero;

    try {
        // --- ON PREND DANS LE LOCAL STORAGE SI ON A DÉJÀ POUR CE TRAIN ---
        const DATA = await fetchLocal("InfosSuppTrains_" + trainNumero, URL);

        // --- SI IL NE RETURN RIEN DANS DATA ALORS ON ARRÊTE TOUT CAR ON EXPLOITE DATA ENSUITE ---
        if (!DATA) {
            return;
        }

        let latlngs = [], feature, coords, type;

        // --- TRACÉ DU CHEMIN DU TRAIN ---
        if (DATA.type === "FeatureCollection" && Array.isArray(DATA.features)) {
            for (let i = 0; i < DATA.features.length; i++) {
                feature = DATA.features[i];
                if (!feature.geometry?.coordinates) {
                    continue;
                }

                coords = feature.geometry.coordinates;
                type = feature.geometry.type;

                // --- DEUX CAS SI LE TYPE EST LINESTRING OU MULTILINESTRING ---
                if (type === "LineString") {
                    for (let j = 0; j < coords.length; j++) {
                        latlngs.push([ coords[j][1], coords[j][0] ]);
                    }
                } else if (type === "MultiLineString") {
                    for (let k = 0; k < coords.length; k++) {
                        for (let l = 0; l < coords[k].length; l++) {
                            latlngs.push([ coords[k][l][1], coords[k][l][0] ]);
                        }
                    }
                }
            }
        }

        // --- SI LES DONNÉES SONT UN SIMPLE TABLEAU ---
        else if (Array.isArray(DATA)) {
            let p;
            for (let i = 0; i < DATA.length; i++) {
                p = DATA[i];
                if (p.lat && p.lon) {
                    latlngs.push([parseFloat(p.lat), parseFloat(p.lon)]);
                } else if (Array.isArray(p)) {
                      latlngs.push([p[0], p[1]]);
                }
            }
        }

        if (latlngs.length > 0) {
            const POLYLINE = L.polyline(latlngs, { color: '#e63946', weight: 5, opacity: 0.9 });
            POLYLINE.addTo(LAYERS.trainPath);
            const BOUNDS = POLYLINE.getBounds();
            if (BOUNDS.isValid()) {
                mapInstance.fitBounds(BOUNDS, { padding: [50, 50] });
            }
        }

    } catch (e) { console.error(e); }
}


// === 5/ GARES -> PositionsDesGares ===
async function fetchGares() {
    const CHECKBOX = document.getElementById("filter_train_stations");

    if (!CHECKBOX || !CHECKBOX.checked) {
        return;
    }
    // --- DEMANDE LE LOCAL STORAGE POUR LA POSITION DES GARES ---
    const DATA = await fetchLocal("PositionsDesGares", GARES_URL, 60000);

    if (!CHECKBOX.checked || !DATA) {
        return;
    }

    LAYERS.trainStations.clearLayers();
    let lat,lon,html;
    for (const STATION of DATA) {
        lat = STATION.position_geographique?.lat;
        lon = STATION.position_geographique?.lon;
        if (isValidAndInRadius(lat, lon)) {
            html = buildStationPopup(STATION.nom, lat, lon);
            addMarkerToLayer(lat, lon, ICON_GARE, LAYERS.trainStations, 0, html);
        }
    }
}

// === 6/ AÉROPORTS -> PositionsDesAeroports ===
async function fetchAeroports() {
    const CHECKBOX = document.getElementById("filter_airports");
    if (!CHECKBOX || !CHECKBOX.checked) {
        return;
    }

    // --- LOCAL STORAGE POSITIONS DES AÉROPORTS ---
    const DATA = await fetchLocal("PositionsDesAeroports", AEROPORTS_URL, 60000);

    if (!CHECKBOX.checked || !DATA?.aeroports) {
        return;
    }
    LAYERS.airports.clearLayers();
    let lat,lon;
    for (const AIRPORT of DATA.aeroports) {
        lat = AIRPORT.latitude;
        lon = AIRPORT.longitude;
        if (isValidAndInRadius(lat, lon)) {
            const html = buildAirportPopup(AIRPORT, lat, lon);
            addMarkerToLayer(lat, lon, ICON_AEROPORT, LAYERS.airports, 0, html);
        }
    }
}




///////////////////////////////////////////////////////////////////
// === CONSTRUCTION DES HTML POPUP POUR AFFICHER LES DÉTAILS === //
///////////////////////////////////////////////////////////////////

function buildPlanePopup(callsign, vel, alt, country, vert, ground, icao) {
    return `<div class="tags has-addons mb-4"><span class="tag is-dark">Appel</span><span class="tag is-info">${callsign || "N/A"}</span></div>
            <div class="box is-shadowless border-light has-background-light mb-4"><nav class="level is-mobile"><div class="level-item has-text-centered"><div><p class="heading">Vitesse</p><p class="title is-5">${vel ? (vel * 3.6).toFixed(0) : "0"} <small>km/h</small></p></div></div><div class="level-item has-text-centered"><div><p class="heading">Altitude</p><p class="title is-5">${alt ? alt.toFixed(0) : "0"} <small>m</small></p></div></div></nav></div>
            <div class="content is-small"><table class="table is-fullwidth is-striped"><tbody><tr><td>Pays</td><td>${country}</td></tr><tr><td>Statut</td><td>${ground ? 'Au sol' : 'En vol'}</td></tr><tr><td>ICAO</td><td>${icao}</td></tr></tbody></table></div>`;
}

function buildBusPopup(data) {
    if (!data) return '<div class="notification is-danger">Données indisponibles</div>';
    let callsHtml = "";
    if (data.calls?.length) {
        callsHtml = `<p class="menu-label mt-4">Prochains arrêts</p><ul class="menu-list mb-4">`;
        let call;
        for (let i = 0; i < Math.min(5, data.calls.length); i++) {
            call = data.calls[i];
            callsHtml += `<li><span class="is-size-7">${call.stopName} (${new Date(call.aimedTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</span></li>`;
        }
        callsHtml += `</ul>`;
    }
    return `<div class="card is-shadowless"><div class="media"><div class="media-content"><p class="title is-5">Ligne ${data.lineId}</p><p class="subtitle is-6">${data.destination}</p></div></div>${callsHtml}</div>`;
}

function buildTrainPopup(props) {
    return `<div class="message is-success mb-4"><div class="message-header"><p>Train ${props.numero || ""}</p></div><div class="message-body"><p>Destination: <strong>${props.fin || "?"}</strong></p><p>Ligne: ${props.ligne || "?"}</p><p class="is-size-7 has-text-grey mt-2">Trajet affiché sur la carte</p></div></div>`;
}

function buildStationPopup(nom, lat, lon) {
    let dist = userLat ? distanceKm(userLat, userLon, lat, lon).toFixed(1) : "?";
    return `<div class="box is-shadowless"><h3 class="title is-4">${nom}</h3><p>Distance: ${dist} km</p><button class="button is-small is-fullwidth mt-2" onclick="window.open('http://maps.google.com/?q=${lat},${lon}')">Itinéraire</button></div>`;
}

function buildAirportPopup(ap, lat, lon) {
    return `<h3 class="title is-4">${ap.nom}</h3><p>${ap.ville}</p><span class="tag is-dark">${ap.oaci}</span>`;
}




///////////////////////////////////
// === MODULE ROTATED MARKER === //
///////////////////////////////////

//⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠//
//                                                                    //
// === ⚠⚠⚠  NE PAS TOUCHER SINON LE BEARING NE FONCTIONNE PLUS  ⚠⚠⚠ === //
//                                                                    //
//⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠//


(function() {
    const PROTO_INIT = L.Marker.prototype._initIcon;
    const PROTO_SET = L.Marker.prototype._setPos;
    const OLD_IE = (L.DomUtil.TRANSFORM === 'msTransform');
    L.Marker.addInitHook(function () {
        const OPT = this.options.icon && this.options.icon.options;
        let anchor = OPT && OPT.iconAnchor;
        if (anchor) anchor = (anchor[0] + 'px ' + anchor[1] + 'px');
        this.options.rotationOrigin = this.options.rotationOrigin || anchor || 'center bottom';
        this.options.rotationAngle = this.options.rotationAngle || 0;
        this.on('drag', function(e) { e.target._applyRotation(); });
    });
    L.Marker.include({
        _initIcon: function() { PROTO_INIT.call(this); },
        _setPos: function(pos) { PROTO_SET.call(this,pos); this._applyRotation(); },
        _applyRotation: function() {
            if(this.options.rotationAngle) {
                this._icon.style[L.DomUtil.TRANSFORM+'Origin'] = this.options.rotationOrigin;
                if(OLD_IE) this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.rotationAngle + 'deg)';
                else this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
            }
        },
        setRotationAngle: function(angle) { this.options.rotationAngle = angle; this.update(); return this; }
    });
})();




/////////////////////////////////////////
// === DÉMARRAGE GLOBAL DE LA PAGE === //
/////////////////////////////////////////
window.onload = function() {
    initMap();
    initRadiusSlider();
    initFilters();
    initSidebarEvents();
    const BTN_LOCATE = document.getElementById("btn-locate");
    if (BTN_LOCATE) {
        BTN_LOCATE.addEventListener("click", getUserLocation);
    }
    getUserLocation();
    refreshData();
};
