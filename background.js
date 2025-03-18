// Liste des domaines à exclure du suivi
const excludedDomains = [
  ""
];

// Convertir la liste en Set pour des recherches plus rapides
const excludedDomainsSet = new Set(excludedDomains);

// Stockage des statistiques par onglet
let tabStats = {};

// Stockage des requêtes détaillées par domaine tiers pour chaque onglet
let tabRequests = {};

// Stockage de l'historique des sites visités
let sitesHistory = [];

// Cache pour les domaines extraits
const domainCache = {};

// Objet pour stocker les timers d'inactivité par onglet
const saveTimers = {};

// Charger l'historique des sites au démarrage
chrome.storage.local.get(['sitesHistory'], (result) => {
if (result.sitesHistory) {
  sitesHistory = result.sitesHistory;
}
});

// Fonction pour extraire le domaine principal d'une URL avec mise en cache
function getCachedDomain(url) {
// Si le résultat est dans le cache, le retourner
if (domainCache[url]) {
  return domainCache[url];
}

// Sinon, extraire le domaine et le stocker dans le cache
const domain = extractMainDomain(url);

// Limiter la taille du cache
if (Object.keys(domainCache).length > 5000) {
  // Vider une partie du cache si nécessaire
  const cacheKeys = Object.keys(domainCache).slice(0, 1000);
  for (const key of cacheKeys) {
    delete domainCache[key];
  }
}

// Stocker dans le cache et retourner
domainCache[url] = domain;
return domain;
}

// Fonction pour extraire le domaine principal d'une URL
function extractMainDomain(url) {
try {
  const hostname = new URL(url).hostname;
  const parts = hostname.split('.');
  
  // Gestion des cas spéciaux comme co.uk, com.br, etc.
  if (parts.length > 2) {
    const tld = parts[parts.length - 2] + '.' + parts[parts.length - 1];
    if (tld.match(/co\.[a-z]{2}|com\.[a-z]{2}|org\.[a-z]{2}/)) {
      return parts[parts.length - 3] + '.' + tld;
    }
  }
  
  // Retourne le domaine principal (sans sous-domaines)
  if (parts.length > 1) {
    return parts[parts.length - 2] + '.' + parts[parts.length - 1];
  }
  return hostname;
} catch (e) {
  return "";
}
}

// Fonction optimisée pour vérifier si un domaine est dans la liste d'exclusion
function isDomainExcluded(domain) {
// Vérifier d'abord dans le Set (recherche O(1))
if (excludedDomainsSet.has(domain)) {
  return true;
}

// Puis vérifier les sous-domaines
for (const excludedDomain of excludedDomains) {
  if (domain.endsWith('.' + excludedDomain)) {
    return true;
  }
}

return false;
}

// Fonction pour initialiser ou réinitialiser les statistiques d'un onglet
function initTabStats(tabId, url) {
if (!url || url.startsWith('chrome:') || url.startsWith('about:') || url.startsWith('moz-extension:') || 
    url.startsWith('chrome-extension:') || url.startsWith('file:')) {
  tabStats[tabId] = {
    mainDomain: "",
    thirdPartyDomains: {},
    totalRequests: 0,
    requestTypes: {
      xmlhttprequest: 0,
      script: 0,
      stylesheet: 0,
      image: 0,
      media: 0,
      font: 0,
      other: 0
    }
  };
  tabRequests[tabId] = {};
  return;
}

const mainDomain = getCachedDomain(url);

// Vérifier si le domaine est exclu
if (isDomainExcluded(mainDomain)) {
  tabStats[tabId] = {
    mainDomain: "",
    thirdPartyDomains: {},
    totalRequests: 0,
    requestTypes: {
      xmlhttprequest: 0,
      script: 0,
      stylesheet: 0,
      image: 0,
      media: 0,
      font: 0,
      other: 0
    }
  };
  tabRequests[tabId] = {};
  return;
}

tabStats[tabId] = {
  mainDomain: mainDomain,
  thirdPartyDomains: {},
  totalRequests: 0,
  requestTypes: {
    xmlhttprequest: 0,
    script: 0,
    stylesheet: 0,
    image: 0,
    media: 0,
    font: 0,
    other: 0
  },
  url: url, // Stocker l'URL complète
  visitTime: new Date().getTime() // Ajouter un horodatage
};

// Initialiser le stockage des requêtes détaillées
tabRequests[tabId] = {};

updateBadge(tabId);
}

// Fonction pour sauvegarder les statistiques d'un site
function saveSiteStats(tabId) {
  if (!tabStats[tabId] || !tabStats[tabId].mainDomain || !tabStats[tabId].url) {
    return; // Ne pas sauvegarder si aucune donnée pertinente
  }
  
  // Vérifier si le domaine est exclu
  if (isDomainExcluded(tabStats[tabId].mainDomain)) {
    return; // Ne pas sauvegarder les sites exclus
  }
  
  // Créer un objet représentant le site et ses statistiques
  const siteEntry = {
    url: tabStats[tabId].url,
    mainDomain: tabStats[tabId].mainDomain,
    visitTime: tabStats[tabId].visitTime || new Date().getTime(),
    thirdPartyDomains: Object.keys(tabStats[tabId].thirdPartyDomains).length,
    totalRequests: tabStats[tabId].totalRequests,
    domainsList: Object.keys(tabStats[tabId].thirdPartyDomains).map(domain => ({
      domain,
      count: tabStats[tabId].thirdPartyDomains[domain]
    }))
  };
  
  // Créer un identifiant unique basé sur l'URL et l'horodatage au format hh:mm:ss
  // Cela permettra de distinguer différentes visites dans la même journée
  // mais de ne pas créer de doublons pour les mises à jour rapides
  const visitDate = new Date(siteEntry.visitTime);
  const visitKey = `${siteEntry.url}_${visitDate.getHours()}:${visitDate.getMinutes()}:${visitDate.getSeconds()}`;
  
  // Trouver s'il existe déjà une entrée avec le même identifiant (même URL et même heure)
  const existingIndex = sitesHistory.findIndex(site => {
    const siteDate = new Date(site.visitTime);
    const siteKey = `${site.url}_${siteDate.getHours()}:${siteDate.getMinutes()}:${siteDate.getSeconds()}`;
    return siteKey === visitKey;
  });
  
  // Recherche d'une entrée récente (dernières 30 secondes) à la même URL
  // pour éviter les doublons dus à des mises à jour rapprochées
  const now = new Date().getTime();
  const recentEntryIndex = sitesHistory.findIndex(site => 
    site.url === siteEntry.url && 
    Math.abs(site.visitTime - siteEntry.visitTime) < 30000); // 30 secondes de tolérance
  
  if (existingIndex >= 0) {
    // Remplacer l'entrée existante avec les mêmes timestamp et URL
    sitesHistory[existingIndex] = siteEntry;
  } else if (recentEntryIndex >= 0 && sitesHistory[recentEntryIndex].visitTime > now - 30000) {
    // Mise à jour d'une entrée très récente (moins de 30 secondes)
    sitesHistory[recentEntryIndex] = siteEntry;
  } else {
    // Ajouter une nouvelle entrée pour une nouvelle visite
    sitesHistory.push(siteEntry);
    
    // Limiter la taille de l'historique (10000 entrées max)
    if (sitesHistory.length > 10000) {
      sitesHistory.shift(); // Supprimer l'entrée la plus ancienne
    }
  }
  
  // Sauvegarder dans le stockage local
  chrome.storage.local.set({ sitesHistory });
}

// Fonction pour mettre à jour le badge avec le nombre de domaines tiers
function updateBadge(tabId) {
if (!tabStats[tabId] || !tabStats[tabId].mainDomain) {
  chrome.action.setBadgeText({ text: "", tabId });
  return;
}

const thirdPartyCount = Object.keys(tabStats[tabId].thirdPartyDomains).length;
chrome.action.setBadgeText({ text: thirdPartyCount.toString(), tabId });
chrome.action.setBadgeBackgroundColor({ color: "#4169E1", tabId });
}

// Écouteur pour les changements d'onglet
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
if (changeInfo.status === 'loading' && tab.url) {
  // Si l'onglet avait déjà des statistiques, les sauvegarder avant de réinitialiser
  if (tabStats[tabId] && tabStats[tabId].mainDomain) {
    // Annuler tout timer de sauvegarde en cours
    if (saveTimers[tabId]) {
      clearTimeout(saveTimers[tabId]);
      delete saveTimers[tabId];
    }
    
    saveSiteStats(tabId);
  }
  
  initTabStats(tabId, tab.url);
} else if (changeInfo.status === 'complete' && tab.url) {
  // Sauvegarder également quand la page est complètement chargée
  setTimeout(() => {
    if (tabStats[tabId] && tabStats[tabId].mainDomain) {
      saveSiteStats(tabId);
    }
  }, 2000); // Attendre 2 secondes pour que les requêtes aient le temps de s'accumuler
}
});

// Écouteur pour la suppression d'onglet
chrome.tabs.onRemoved.addListener((tabId) => {
// Sauvegarder les statistiques avant de supprimer l'onglet
if (tabStats[tabId] && tabStats[tabId].mainDomain) {
  saveSiteStats(tabId);
}

// Nettoyer les timers
if (saveTimers[tabId]) {
  clearTimeout(saveTimers[tabId]);
  delete saveTimers[tabId];
}

if (tabStats[tabId]) {
  delete tabStats[tabId];
}
if (tabRequests[tabId]) {
  delete tabRequests[tabId];
}
});

// Écouteur pour le changement d'onglet actif
chrome.tabs.onActivated.addListener(async (activeInfo) => {
const tab = await chrome.tabs.get(activeInfo.tabId);
if (!tabStats[activeInfo.tabId] && tab.url) {
  initTabStats(activeInfo.tabId, tab.url);
} else {
  updateBadge(activeInfo.tabId);
}
});

// Écouteur pour les requêtes web
chrome.webRequest.onBeforeRequest.addListener(
(details) => {
  const { tabId, url, type, timeStamp, requestId } = details;
  
  // Ignorer les requêtes qui ne sont pas associées à un onglet
  if (tabId < 0) return;
  
  // Vérifier si les stats pour cet onglet existent
  if (!tabStats[tabId] || !tabStats[tabId].mainDomain) return;
  
  const requestDomain = getCachedDomain(url);
  const mainDomain = tabStats[tabId].mainDomain;
  
  // Vérifier si le domaine de requête est exclu
  if (isDomainExcluded(requestDomain)) return;
  
  // Si c'est un domaine tiers, l'ajouter aux statistiques
  if (requestDomain && requestDomain !== mainDomain) {
    // Incrémenter le compteur de requêtes pour ce domaine
    tabStats[tabId].thirdPartyDomains[requestDomain] = 
      (tabStats[tabId].thirdPartyDomains[requestDomain] || 0) + 1;
    tabStats[tabId].totalRequests++;
    
    // Mise à jour du compteur par type
    const requestType = type.toLowerCase();
    if (tabStats[tabId].requestTypes[requestType] !== undefined) {
      tabStats[tabId].requestTypes[requestType]++;
    } else {
      tabStats[tabId].requestTypes.other++;
    }
    
    // Enregistrer les détails de la requête
    if (!tabRequests[tabId][requestDomain]) {
      tabRequests[tabId][requestDomain] = [];
    }
    
    // Limiter le nombre de requêtes stockées pour éviter une consommation excessive de mémoire
    if (tabRequests[tabId][requestDomain].length >= 100) {
      tabRequests[tabId][requestDomain].shift(); // Supprimer la plus ancienne requête
    }
    
    // Stocker les détails de la requête
    tabRequests[tabId][requestDomain].push({
      url: url,
      type: type,
      timestamp: timeStamp,
      id: requestId
    });
    
    // Mettre à jour le badge (toujours pour une réactivité immédiate)
    updateBadge(tabId);
    
    // Stratégie de sauvegarde optimisée
    
    // 1. Sauvegarde périodique (toutes les 10 requêtes)
    if (tabStats[tabId].totalRequests % 10 === 0) {
      saveSiteStats(tabId);
    }
    
    // 2. Sauvegarde après inactivité
    // Annuler tout timer existant
    if (saveTimers[tabId]) {
      clearTimeout(saveTimers[tabId]);
    }
    
    // Créer un nouveau timer qui sauvegarde après 2 secondes d'inactivité
    saveTimers[tabId] = setTimeout(() => {
      if (tabStats[tabId] && tabStats[tabId].mainDomain) {
        saveSiteStats(tabId);
      }
      delete saveTimers[tabId];
    }, 2000);
  }
},
{ urls: ["<all_urls>"] }
);

// Fonction pour récupérer les statistiques de l'onglet actif
async function getActiveTabStats() {
try {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return null;
  
  const tabId = tabs[0].id;
  if (!tabStats[tabId]) {
    initTabStats(tabId, tabs[0].url);
  }
  
  // Vérifier si le site a été sauvegardé dans l'historique
  if (tabStats[tabId].mainDomain) {
    const existingIndex = sitesHistory.findIndex(site => site.mainDomain === tabStats[tabId].mainDomain);
    
    // Si le site existe dans l'historique, mettre à jour les statistiques locales
    if (existingIndex >= 0) {
      const siteFromHistory = sitesHistory[existingIndex];
      
      // Assurez-vous que les statistiques sont synchronisées
      if (siteFromHistory.thirdPartyDomains > Object.keys(tabStats[tabId].thirdPartyDomains).length) {
        // Si l'historique a plus de domaines, mettez à jour les statistiques locales
        saveSiteStats(tabId);
      }
    }
  }
  
  return tabStats[tabId];
} catch (e) {
  return null;
}
}

// Répondre aux messages du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === "getStats") {
  getActiveTabStats().then(stats => {
    sendResponse({ stats });
  });
  return true; // Indique que la réponse sera envoyée de façon asynchrone
}

if (message.action === "getDomainRequests") {
  getDomainRequests(message.domain).then(requests => {
    sendResponse({ requests });
  });
  return true;
}

if (message.action === "getSitesHistory") {
  sendResponse({ sitesHistory });
  return false;
}

if (message.action === "clearHistory") {
  sitesHistory = [];
  chrome.storage.local.set({ sitesHistory: [] });
  sendResponse({ success: true });
  return false;
}

if (message.action === "saveCurrentSite") {
  getActiveTabId().then(tabId => {
    if (tabId >= 0) {
      saveSiteStats(tabId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Aucun onglet actif" });
    }
  });
  return true;
}

if (message.action === "getExcludedDomains") {
  sendResponse({ excludedDomains });
  return false;
}
});

// Fonction pour obtenir l'ID de l'onglet actif
async function getActiveTabId() {
try {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return -1;
  return tabs[0].id;
} catch (e) {
  return -1;
}
}

// Fonction pour nettoyer les données d'historique existantes
function cleanupHistoryData() {
  chrome.storage.local.get(['sitesHistory', 'historyCleanupDone'], (result) => {
    // Vérifier si le nettoyage a déjà été effectué
    if (result.historyCleanupDone) {
      return;
    }
    
    if (result.sitesHistory && result.sitesHistory.length > 0) {
      const sitesHistory = result.sitesHistory;
      
      // Map pour stocker les entrées uniques, clé = URL_HEURE
      const uniqueEntries = new Map();
      
      // Parcourir toutes les entrées existantes
      sitesHistory.forEach(site => {
        if (!site.visitTime || !site.url) return;
        
        // Créer une clé unique basée sur l'URL et l'heure arrondie à la minute
        const visitDate = new Date(site.visitTime);
        const visitKey = `${site.url}_${visitDate.getFullYear()}-${visitDate.getMonth()}-${visitDate.getDate()}_${visitDate.getHours()}:${visitDate.getMinutes()}`;
        
        // Si cette clé existe déjà, garder celle avec le plus de requêtes
        if (uniqueEntries.has(visitKey)) {
          const existingEntry = uniqueEntries.get(visitKey);
          if (site.totalRequests > existingEntry.totalRequests) {
            uniqueEntries.set(visitKey, site);
          }
        } else {
          uniqueEntries.set(visitKey, site);
        }
      });
      
      // Convertir la Map en tableau
      const cleanHistory = Array.from(uniqueEntries.values());
      
      // Trier par date (plus récent en premier)
      cleanHistory.sort((a, b) => b.visitTime - a.visitTime);
      
      // Sauvegarder l'historique nettoyé
      chrome.storage.local.set({
        sitesHistory: cleanHistory,
        historyCleanupDone: true
      });
    }
  });
}

// Sauvegarder périodiquement les statistiques de l'onglet actif
setInterval(async () => {
const tabId = await getActiveTabId();
if (tabId >= 0 && tabStats[tabId] && tabStats[tabId].mainDomain) {
  saveSiteStats(tabId);
}
}, 30000); // Sauvegarder toutes les 30 secondes (augmenté de 10 à 30 secondes pour les performances)

// Fonction pour récupérer les requêtes d'un domaine spécifique pour l'onglet actif
async function getDomainRequests(domain) {
try {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return [];
  
  const tabId = tabs[0].id;
  if (!tabRequests[tabId] || !tabRequests[tabId][domain]) {
    return [];
  }
  
  return tabRequests[tabId][domain];
} catch (e) {
  return [];
}
}