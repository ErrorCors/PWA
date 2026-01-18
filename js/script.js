////////////////////////
// === CONSTANTES === //
////////////////////////

// === CONSTANTES GLOBALES POUR API ===
const API_PLANES_URL = "https://opensky-network.org/api/states/all";
const BUS_TRACKER_URL = "https://bus-tracker.fr/api/vehicle-journeys/markers";
const TRAIN_STATIONS_URL = "https://www.data.gouv.fr/api/1/datasets/r/c498ad8d-2ec7-48ed-9949-28003f49f24f";
const AIRPORTS_URL = "./data/airports.json";
const API_TRAIN_ROUTE_URL = "https://api.tchoo.net/api/carto.php?action=train&numero=";

// --- URL POUR l'API TRAIN
const API_TCHOO_TRAIN_URL = "https://api.tchoo.net/trains.json";
const CORS_PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const FULL_URL = CORS_PROXY_URL + API_TCHOO_TRAIN_URL;

// === CONSTANTES POUR LEAFLET ===
const MAP_DEFAULT_LAT = 46.603354;
const MAP_DEFAULT_LON = 1.888334;
const MAP_DEFAULT_ZOOM = 6;
const EARTH_RADIUS_KM = 6371;
const PLANE_ICON = L.icon({ iconUrl: './assets/plane.svg', iconSize:[35,35], iconAnchor:[17,17] });
const BUS_ICON = L.icon({ iconUrl: './assets/bus.svg', iconSize: [30, 30], iconAnchor: [15, 15] });
const TRAIN_ICON = L.icon({ iconUrl: "./assets/train.svg", iconSize: [32, 32], iconAnchor: [16, 16] });
const STATION_ICON = L.icon({ iconUrl: "./assets/train_station.svg", iconSize: [24,24], iconAnchor: [12,24] });
const TOWER_ICON = L.icon({ iconUrl: "./assets/control_tower.svg", iconSize: [30, 30], iconAnchor: [15, 15] });

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

// === LISTE DES SELECTEURS DE LA SIDEBAR ===
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

const loader = document.getElementById('loader');
function showLoader() {
    if (loader) 
        loader.classList.add('is-active');
}

function hideLoader() {
    if (loader) 
        loader.classList.remove('is-active');
}

/////////////////////
// === SIDEBAR === //
/////////////////////

// --- GESTION DES SIDEBAR GAUCHE ET DROITE ---
function initSidebarEvents() {
    
    // --- 1/ GESTION SIDEBAR INFOSUPP ---
    const CLOSE_BTN = document.getElementById("closeSidebar");
    if (CLOSE_BTN) {
        CLOSE_BTN.addEventListener("click", function() {
            document.getElementById("sidebar").classList.remove("is-active");
            document.getElementById("sidebarContent").innerHTML = "";
            LAYERS.trainPath.clearLayers();
        });
    }

    // --- 2/ GESTION SIDEBAR FILTRES (GAUCHE - MOBILE) ---
    // --- SELECTION AVEC LES FILTRES DEFINIS EN CSS ---
    const sidebarLeft = document.querySelector('.filter-sidebar'); 

    // --- MENU BURGER ---
    const burger = document.getElementById('burger');
    
    // --- CREATION DE l'OVERLAY ---
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // --- POUR OUVRIR/FERMER LE MENU ---
    function toggleMenu() {
        if(burger) {
            burger.classList.toggle('is-active');
        }
        if(sidebarLeft) {
            sidebarLeft.classList.toggle('is-active');
        }
        if(overlay) {
            overlay.classList.toggle('is-active');
        }
    }

    // --- EVENEMENT DU CLIQUE DU BURGER
    if (burger) {
        // --- ON CLEAR LES ANCIENS EVENEMENTS ---
        // --- EVITE L'AFFICHAGE DE PLUSIEURS BURGER AU MEME MOMENT DANS DIFFERENTS ETATS (DEBUG) ---
        const NEWBURGER = burger.cloneNode(true);
        burger.parentNode.replaceChild(NEWBURGER, burger);
        
        NEWBURGER.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // --- EVENT POUR FERMER L'OVERLAY SI ON CLIQUE A COTE (SURTOUT UTILE POUR MOBILE) ---
    if(overlay) {
        overlay.addEventListener('click', function() {
            if (sidebarLeft && sidebarLeft.classList.contains('is-active')) {
                toggleMenu();
            }
        });
    }

    // --- 3/ GESTION FERMETURE AUTOMATIQUE SUR CARTE (MOBILE) ---
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.addEventListener('click', function() {
            // --- SI ON EST SUR MOBILE ET QUE LE MENU EST OUVERT
            if (window.innerWidth <= 1023 && sidebarLeft && sidebarLeft.classList.contains('is-active')) {
                toggleMenu();
            }
        });
    }
}

// === OUVERTURE SIDEBAR DETAILS (DROITE) ===
function openSidebar(htmlContent) {
    const SIDEBAR = document.getElementById("sidebar"); // ID 'sidebar' pour le panneau de droite
    const CONTENT = document.getElementById("sidebarContent");
    
    if(SIDEBAR && CONTENT) {
        CONTENT.innerHTML = `<div class="p-4">${htmlContent}</div>`;
        SIDEBAR.classList.add("is-active");
    }
}

// === ACCORDEONS (FILTRES) ===
function toggleAccordion(id) {
    let content = document.getElementById(id);
    if(content) {
        let header = content.previousElementSibling;
        content.classList.toggle('is-expanded');
        if(header) {
            header.classList.toggle('is-expanded');
        }
    }
}

// === TOUT COCHER ===
function toggleAllInCategory(sourceCheckbox, containerId) {
    let container = document.getElementById(containerId);
    if(container) {
        let checkboxes = container.querySelectorAll('input[type="checkbox"]:not(.switch)'); 
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = sourceCheckbox.checked;
            checkboxes[i].dispatchEvent(new Event('change'));
        }
    }
}
// === SIDEBAR UI ===
function openSidebar(htmlContent) {
    const SIDEBAR = document.getElementById("sidebar");
    const CONTENT = document.getElementById("sidebarContent");
    CONTENT.innerHTML = `<div class="p-4">${htmlContent}</div>`;
    SIDEBAR.classList.add("is-active");
}

function initSidebarEvents() {
    const CLOSE_BTN = document.getElementById("closeSidebar");
    if (CLOSE_BTN) {
        CLOSE_BTN.addEventListener("click", function() {
            document.getElementById("sidebar").classList.remove("is-active");
            document.getElementById("sidebarContent").innerHTML = "";
            LAYERS.trainPath.clearLayers();
        });
    }
    // --- GESTION MOBILE ---
    const burger = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('leftSidebar');
    
    // --- CREATION DE L'OVERLAY ---
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // --- FONCTION DE BASCULE ---
    function toggleMenu() {
        burger.classList.toggle('is-active');
        sidebar.classList.toggle('is-active');
        overlay.classList.toggle('is-active');
    }

    // --- CLIQUE SUR LE BURGER MENU ---
    if (burger) {
        burger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Fermer si on clique sur l'overlay (en dehors du menu)
    overlay.addEventListener('click', toggleMenu);
    
    // Fermer si on clique sur un lien ou check dans le menu (optionnel, pour confort)
    // sidebar.addEventListener('click', (e) => { 
    //    if(window.innerWidth < 1024) toggleMenu(); 
    // });
}

// === FILTRES ===
function initFilters() {
    let el;
    for (const filterId of FILTERS_LIST) {
        el = document.getElementById("filter_" + filterId);
        if(el) el.addEventListener("change", refreshData);
    }
}

function toggleCategory(categoryId) {
    const CAT_DIV = document.getElementById(categoryId);
    const MAIN_CHECK = document.getElementById(`${categoryId}_checkbox`);
    if(CAT_DIV && MAIN_CHECK) {
        const checkboxes = CAT_DIV.getElementsByTagName('input');
        for (const checkbox of checkboxes) {
            checkbox.checked = MAIN_CHECK.checked;
        }
        refreshData();
    }
}





////////////////////////
// === GET GLOBAL === //
////////////////////////

async function get(url) {
    showLoader();
    try {
        const RESPONSE = await fetch(url);
        console.log("Requête terminée pour : " + url);
        if (!RESPONSE.ok) throw new Error("Erreur HTTP : " + RESPONSE.status);
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
// === fetch avec get des données et mise en local storage === //
/////////////////////////////////////////////////////////////////
async function fetchLocal(key, url) {
    const EXPIREMS = 60000
    const NOW = Date.now();
    // --- 1/ RECUPERATION DEPUIS LE LOCALSTORAGE ---
    const RAW = localStorage.getItem(key);
    
    if (RAW) {
        try {
            const OBJ = JSON.parse(RAW);
            // --- VERIFICATION DU TTL ---
            if (NOW - OBJ.timestamp < EXPIREMS) {
                console.log(`[LOCALSTORAGE] Chargement depuis '${key}'`);
                return OBJ.data;
            }
        } catch (e) {
            console.warn("Erreur lecture cache", e);
        }
    }

    // --- 2/ SI LE LOCALSTORAGE EST VIDE OU TTL EXPIRE ---
    const DATA = await get(url);
    
    // --- 3/ MAJ DU LOCALSTORAGE OU STOCKAGE ---
    if (DATA) {
        localStorage.setItem(key, JSON.stringify({ data: DATA, timestamp: NOW }));
        console.log(`[LOCALSTORAGE] Sauvegarde sous '${key}'`);
    }
    return DATA;
}





//////////////////////////////////////////////////////
// === MATHS POUR GEOLOC ET CALCULE DE POSITION === //
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
// === GEOLOC === //
////////////////////

function getUserLocation() {
    // --- SI LA GEOLOC N'EST PAS SUPPORTE ON ARRETE
    if (!navigator.geolocation) {
        console.warn("La géolocalisation n'est pas supportée.");
        return;
    }

    // --- OPTIONS POUR LA GEOLOC ---
    const options = {
        // --- UTILISATION DU GPS MATERIEL ---
        enableHighAccuracy: true,
        // --- SI LE GPS NE FONCTIONNE PAS APRES 10s ON ARRETE POUR EVITER LES BUS (DEBUG) ---
        timeout: 10000,         
        // --- ON NE MET PAS DE POSITION EN CACHE ---  
        maximumAge: 0             
    };

    // --- UTILISATION DE WATCHPOSITION POUR UN RAFRAICHISSEMENT A CHAQUE DEPLACEMENT ---
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
            const now = Date.now();
            if (now - lastRefreshTime > REFRESH_DELAY) {
                console.log("Actualisation API, délai entre appels OK.");
                refreshData();
                lastRefreshTime = now;
            }
        },
        function(e) {
            console.error("Erreur GPS :", e.message);
        },
        options 
    );
}

function updateGeolocCircle() {
    LAYERS.geoloc.clearLayers();
    if (!userLat || !userLon) {
        return;
    }
    L.circle([userLat, userLon], { radius: radiusKm * 1000, color: 'blue', fill: false, weight: 2 }).addTo(LAYERS.geoloc);
    L.marker([userLat, userLon]).bindPopup("Vous êtes ici").addTo(LAYERS.geoloc).openPopup();
}

// === CERCLE AUTOUR DU USER ===
function initRadiusSlider() {
    const SLIDER = document.getElementById("radiusSlider");
    const TEXT = document.getElementById("radiusValue");
    if(SLIDER && TEXT) {
        SLIDER.addEventListener("input", function(e) {
            radiusKm = parseInt(e.target.value);
            TEXT.textContent = radiusKm + " km";
            updateGeolocCircle();
            refreshData();
        });
    }
}

const DELTA_LAT = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
const DELTA_LON = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI) / Math.cos(userLat * Math.PI / 180);

///////////////////////
// === WAKE LOCK === //
///////////////////////

let wakeLock = null;

// --- ACTIVATION WAKE LOCK
async function activateWakeLock() {
    // --- VERIF SI SUPPORTE PAR LE NAVIGATEUR ---
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activé.');

            // --- DEBUGAGE SI LE WAKE LOCK EST FORCE DE S'ARRETER (ATTENTION BATTERIE FAIBLE) ---
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

// --- DEBUGAGE SI L'UTILISATEUR QUITTE ET REVIENT SUR LE NAV POUR EVITER LA DESACTIVATION ---
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
    handleLayerState("filter_buses", LAYERS.buses, fetchDonneeBuses);
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
// === REQUETES API + TRI DES DONNEES === //
////////////////////////////////////////////


// === 1) AVIONS -> PositionsDesAvions ===
async function fetchDonneeAvions() {
    // --- SI ON N'A PAS LA GEOLOC DE USER ALORS ON NE FAIT AUCUNE REQUETE --- 
    
    // --- ATTENTION SI ON COMMENTE CETTE LIGNE ALORS TOUS LES AVIONS DU MONDE S'AFFICHENT !!!! ---

    if (!userLat || !userLon) {
        return;
    }

    // --- INTERROGATION DU LOCAL STORAGE POUR EVITER DE FAIRE DES REQUETES INUTILES ---
    const DATA = await fetchLocal("PositionsDesAvions", API_PLANES_URL);
    if (!DATA?.states) 
        return;

    // --- CLEAR DU LAYER POUR EVITER LES ERREURS D'AFFICHAGE ---
    LAYERS.planes.clearLayers();
    let state, icao24, callsign, country, time, lastC, lon, lat, alt, ground, vel, heading, vert, html;

    // --- POUR TOUS LES AVIONS ON RECUPERE LES INFOS DANS UN TAB ---
    for (state of DATA.states) {
        [icao24, callsign, country, time, lastC, lon, lat, alt, ground, vel, heading, vert] = state;
        // --- ON VERIF SI L'AVION EST BIEN DANS LE RADIUS CHOISI PAR L'USER ---
        if (isValidAndInRadius(lat, lon)) {
            // --- S'IL EST BIEN DANS LE RAYON ON AJOUTE UN AVION SUR LA CARTE ---
            html = buildPlanePopup(callsign, vel, alt, country, vert, ground, icao24);
            addMarkerToLayer(lat, lon, PLANE_ICON, LAYERS.planes, heading, html);
        }
    }
}

// === 2) BUS -> PositionsDesBus / InfosSuppBus ===
async function fetchDonneeBuses() {

    // --- SI ON N'A PAS LA GEOLOC DE USER ALORS ON NE FAIT AUCUNE REQUETE
    if (!userLat || !userLon) {
        return;
    }

    // --- CREATION DE L'URL POUR LA REQUETE DE L'API DES BUS
    const FACTOR = 1.3;
    const URL = `${BUS_TRACKER_URL}?swLat=${userLat - DELTA_LAT * FACTOR}&swLon=${userLon - DELTA_LON * FACTOR}&neLat=${userLat + DELTA_LAT * FACTOR}&neLon=${userLon + DELTA_LON * FACTOR}`;
    
    // --- MISE EN LOCAL STORAGE DE LA REPONSE API ---
    const DATA = await fetchLocal("PositionsDesBus", URL);
    if (!DATA?.items) {
        return;
    }

    // --- CLEAR DU LAYER BUS POUR EVITER LES ERREURS D'AFFICHAGE ---
    LAYERS.buses.clearLayers();

    let lat;
    let lon;
    let popupFn, details_url, details;

    for (const item of DATA.items) {
        // --- NE PAS SUPPRIMER => PERMET L'AFFICHAGE DES BUS SEULEMENT SINON LES TER S'AFFICHENT AUSSI ---
        // --- POUR EVITER SUPERPOSITION AVEC L'API DES TRAINS ---
        if (item.id.includes("ServiceJourney")) {
            continue;
        }
        lat = item.position?.latitude;
        lon = item.position?.longitude;

        if (isValidAndInRadius(lat, lon)) {
            // --- MISE EN PLACE DES INFOS DANS LA SIDEBAR ---
            popupFn = async function() {
                openSidebar("Chargement des données...");
                try {
                    // --- APPEL VERS L'API DES BUS POUR AVOIR DES DETAILS SUR LE BUS CLIQUE ---
                    details_url = `https://bus-tracker.fr/api/vehicle-journeys/${encodeURIComponent(item.id)}`;
                    // --- MISE EN LOCAL STORAGE DES INFOS DETAILLEES SUR LE BUS CLIQUE ---
                    details = await fetchLocal("InfosSuppBus_" + item.id, details_url, 30000);
                    return buildBusPopup(details);
                } catch (e) { 
                    return "Erreur lors du chargement des données"; 
                }
            };
            addMarkerToLayer(lat, lon, BUS_ICON, LAYERS.buses, item.position.bearing, popupFn);
        }
    }
}

// === 3) TRAINS -> PositionsDesTrains / InfosSuppTrains ===
async function fetchTrains() {
    // --- SI ON N'A PAS LA GEOLOC DE USER ALORS ON NE FAIT AUCUNE REQUETE ---
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

        // --- SI LE TRAIN EST BIEN DE LE RAYON ALORS ON L'AFFICHE ETC COMME POUR LES AVIONS ---
        if (isValidAndInRadius(lat, lon)) {
            popupFn = async function() {
                if (FEATURE.properties.numero) {
                    await fetchTrajetTrain(FEATURE.properties.numero);
                }
                return buildTrainPopup(FEATURE.properties);
            };
            addMarkerToLayer(lat, lon, TRAIN_ICON, LAYERS.trains, FEATURE.properties.angle, popupFn);
        }
    }
}

// === 4) TRAJET TRAIN -> Utilise InfosSuppTrains ===
async function fetchTrajetTrain(trainNumero) {

    // --- SI LE TRAIN N'A PAS DE NUMERO ON NE CONTINUE PAS CAR IL EST OBLIGATOIRE POUR L'URL SUIVANT ---
    if (!trainNumero) {
        return;
    }

    // --- ON CLEAR L'ANCIEN CHEMIN POUR ETRE SUR QUE LA CARTE SOIT PROPRE ---
    LAYERS.trainPath.clearLayers();

    // --- ON CONSTRUIT L'URL AVEC LE NUMERO DE TRAIN
    const URL = CORS_PROXY_URL + API_TRAIN_ROUTE_URL + trainNumero;

    try {
        // --- ON PREND DANS LE LOCAL STORAGE SI ON A DEJA POUR CE TRAIN ---
        const DATA = await fetchLocal("InfosSuppTrains_" + trainNumero, URL);
        
        // --- SI IL NE RETURN RIEN DANS DATA ALORS ON ARRETE TOUT CAR ON EXPLOITE DATA ENSUITE ---
        if (!DATA) {
            return;
        }

        let latlngs = [], feature, coords, type;
        
        // --- TRACE DU CHEMIN DU TRAIN ---
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

        // --- SI LES DONNEES SONT UN SIMPLE TABLEAU ---
        else if (Array.isArray(DATA)) {
            for (let i = 0; i < DATA.length; i++) {
                const p = DATA[i];
                if (p.lat && p.lon) {
                    latlngs.push([parseFloat(p.lat), parseFloat(p.lon)]);
                } else if (Array.isArray(p)) {
                     latlngs.push([p[0], p[1]]);
                } 
            }
        }

        if (latlngs.length > 0) {
            const polyline = L.polyline(latlngs, { color: '#e63946', weight: 5, opacity: 0.9 });
            polyline.addTo(LAYERS.trainPath);
            const bounds = polyline.getBounds();
            if (bounds.isValid()) mapInstance.fitBounds(bounds, { padding: [50, 50] });
        }

    } catch (e) { console.error(e); }
}


// === 5) GARES -> PositionsDesGares ===
async function fetchGares() {
    const CHECKBOX = document.getElementById("filter_train_stations");

    if (!CHECKBOX || !CHECKBOX.checked) {
        return;
    }
    // --- DEMANDE LE LOCAL STORAGE POUR LA POSITION DES GARES ---
    const DATA = await fetchLocal("PositionsDesGares", TRAIN_STATIONS_URL, 60000);
    
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
            addMarkerToLayer(lat, lon, STATION_ICON, LAYERS.trainStations, 0, html);
        }
    }
}

// === 6) AEROPORTS -> PositionsDesAeroports ===
async function fetchAeroports() {
    const CHECKBOX = document.getElementById("filter_airports");
    if (!CHECKBOX || !CHECKBOX.checked) {
        return;
    }
    
    // --- LOCAL STORAGE POSITIONS DES AEROPORTS ---
    const DATA = await fetchLocal("PositionsDesAeroports", AIRPORTS_URL, 60000);
    
    if (!CHECKBOX.checked || !DATA?.aeroports) return;
    LAYERS.airports.clearLayers();

    for (const airport of DATA.aeroports) {
        const lat = airport.latitude;
        const lon = airport.longitude;
        if (isValidAndInRadius(lat, lon)) {
            const html = buildAirportPopup(airport, lat, lon);
            addMarkerToLayer(lat, lon, TOWER_ICON, LAYERS.airports, 0, html);
        }
    }
}




///////////////////////////////////////////////////////////////////
// === CONSTRUCTION DES HTML POPUP POUR AFFICHER LES DETAILS === //
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
        for (let i = 0; i < Math.min(5, data.calls.length); i++) {
            const call = data.calls[i];
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
    const DIST = userLat ? distanceKm(userLat, userLon, lat, lon).toFixed(1) : "?";
    return `<div class="box is-shadowless"><h3 class="title is-4">${nom}</h3><p>Distance: ${DIST} km</p><button class="button is-small is-fullwidth mt-2" onclick="window.open('http://maps.google.com/?q=${lat},${lon}')">Itinéraire</button></div>`;
}

function buildAirportPopup(ap, lat, lon) {
    return `<h3 class="title is-4">${ap.nom}</h3><p>${ap.ville}</p><span class="tag is-dark">${ap.oaci}</span>`;
}




///////////////////////////////////
// === MODULE ROTATED MARKER === //
///////////////////////////////////

//⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠//
//                                                                          //
// === ⚠⚠⚠  NE PAS TOUCHER SINON LE BEARING NE FONCTIONNE PLUS  ⚠⚠⚠ === //
//                                                                         //
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
// === DEMARRAGE GLOBAL DE LA PAGE === //
/////////////////////////////////////////
window.onload = function() {
    initMap();
    initRadiusSlider();
    initFilters();
    initSidebarEvents(); 
    const BTN_LOCATE = document.getElementById("btn-locate");
    if (BTN_LOCATE) BTN_LOCATE.addEventListener("click", getUserLocation);
    getUserLocation();
    refreshData();
};