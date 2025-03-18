document.addEventListener('DOMContentLoaded', async () => {
  // Récupérer les éléments du DOM
  const saveHistoryBtn = document.getElementById('saveHistoryBtn');
  const viewHistoryBtn = document.getElementById('viewHistoryBtn');
  
  // Ajouter les écouteurs d'événements pour les nouveaux boutons
  saveHistoryBtn.addEventListener('click', saveCurrentSite);
  viewHistoryBtn.addEventListener('click', openHistoryPage);
  
  // Force la sauvegarde des statistiques actuelles pour assurer la cohérence
  chrome.runtime.sendMessage({ action: "saveCurrentSite" });
  
  // Requête pour obtenir les statistiques de l'onglet actif
  chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
    if (response && response.stats) {
      updateUI(response.stats);
    } else {
      displayError();
    }
  });
});

// Fonction pour ouvrir la page d'options
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// Fonction pour exclure le site actuel du suivi
function excludeCurrentSite() {
  chrome.runtime.sendMessage({ action: "excludeCurrentSite" }, (response) => {
    if (response && response.success) {
      // Mise à jour réussie
      showStatus(`${response.domain} a été exclu du suivi`, 'success');
      
      // Mettre à jour l'interface pour refléter que le site n'est plus suivi
      document.querySelector('.main-title').textContent = "Site non suivi";
      document.querySelector('.domains-count').textContent = "0";
      document.querySelector('.requests-count').textContent = "0";
      document.querySelector('.domains-list').innerHTML = 
        '<div class="empty-list">Ce site est exclu du suivi</div>';
      
      // Masquer le bouton d'exclusion
      excludeSiteButton.style.display = 'none';
    } else {
      // Erreur
      showStatus(response.error || 'Erreur lors de l\'exclusion du site', 'error');
    }
  });
}

// Fonction pour afficher un message de statut
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  statusMessage.style.display = 'block';
  
  // Masquer le message après 3 secondes
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Ajouter cette fonction pour vérifier si le site actuel est exclu
// et mettre à jour l'interface en conséquence
function checkIfSiteIsExcluded(mainDomain) {
  chrome.runtime.sendMessage({ action: "getExcludedSites" }, (response) => {
    if (response && response.excludedSites && mainDomain) {
      const isExcluded = response.excludedSites.includes(mainDomain);
      
      if (isExcluded) {
        // Mettre à jour l'interface pour refléter que le site n'est plus suivi
        document.querySelector('.main-title').textContent = "Site non suivi";
        document.querySelector('.domains-count').textContent = "0";
        document.querySelector('.requests-count').textContent = "0";
        document.querySelector('.domains-list').innerHTML = 
          '<div class="empty-list">Ce site est exclu du suivi</div>';
        
        // Masquer le bouton d'exclusion
        excludeSiteButton.style.display = 'none';
      }
    }
  });
}

// Fonction pour mettre à jour l'interface utilisateur avec les statistiques
function updateUI(stats) {
  // Mise à jour du domaine principal
  document.getElementById('mainDomainValue').textContent = stats.mainDomain || 'N/A';
  
  // Compter le nombre de domaines tiers et de requêtes
  const domainsCount = Object.keys(stats.thirdPartyDomains).length;
  document.getElementById('domainsCount').textContent = domainsCount;
  document.getElementById('thirdPartyCount').textContent = domainsCount;
  document.getElementById('requestsCount').textContent = stats.totalRequests;
  
  // Mise à jour des types de requêtes
  updateRequestTypes(stats.requestTypes);
  
  // Afficher la liste des domaines tiers
  displayDomainList(stats.thirdPartyDomains);
}

// Fonction pour mettre à jour l'affichage des types de requêtes
function updateRequestTypes(requestTypes) {
  const total = Object.values(requestTypes).reduce((sum, count) => sum + count, 0) || 1; // Éviter division par zéro
  
  // Mise à jour de chaque barre de progression
  updateTypeBar('xhr', requestTypes.xmlhttprequest, total);
  updateTypeBar('script', requestTypes.script, total);
  updateTypeBar('css', requestTypes.stylesheet, total);
  updateTypeBar('image', requestTypes.image, total);
  updateTypeBar('media', requestTypes.media, total);
  updateTypeBar('font', requestTypes.font, total);
  updateTypeBar('other', requestTypes.other, total);
}

// Fonction pour mettre à jour une barre de type spécifique
function updateTypeBar(id, count, total) {
  const percentage = (count / total) * 100;
  const bar = document.getElementById(`${id}-bar`);
  const countElement = document.getElementById(`${id}-count`);
  
  bar.style.width = `${percentage}%`;
  countElement.textContent = count;
}

// Variables globales pour suivre l'état de l'interface
let activeDomainItem = null;
let currentDomain = null;

// Fonction pour afficher la liste des domaines tiers
function displayDomainList(thirdPartyDomains) {
  const domainListElement = document.getElementById('domainList');
  domainListElement.innerHTML = '';
  
  // Trier les domaines par nombre de requêtes (décroissant)
  const sortedDomains = Object.entries(thirdPartyDomains)
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedDomains.length === 0) {
    domainListElement.innerHTML = '<div class="domain-item">Aucun domaine tiers détecté</div>';
    return;
  }
  
  // Créer un élément pour chaque domaine
  sortedDomains.forEach(([domain, count]) => {
    const domainItem = document.createElement('div');
    domainItem.className = 'domain-item';
    domainItem.innerHTML = `
      <span class="domain-name">${domain}</span>
      <span class="domain-count">${count} requête${count > 1 ? 's' : ''}</span>
    `;
    
    // Ajouter un écouteur d'événement pour afficher les requêtes détaillées au clic
    domainItem.addEventListener('click', () => {
      // Si cet élément est déjà actif, le désactiver
      if (domainItem === activeDomainItem) {
        hideRequests();
        return;
      }
      
      // Désactiver l'élément actif précédent
      if (activeDomainItem) {
        activeDomainItem.classList.remove('active');
      }
      
      // Activer le nouvel élément et charger ses requêtes
      activeDomainItem = domainItem;
      domainItem.classList.add('active');
      currentDomain = domain;
      
      loadDomainRequests(domain);
    });
    
    domainListElement.appendChild(domainItem);
  });
}

// Fonction pour charger les requêtes détaillées d'un domaine
function loadDomainRequests(domain) {
  chrome.runtime.sendMessage({ action: "getDomainRequests", domain: domain }, (response) => {
    if (response && response.requests) {
      displayDomainRequests(domain, response.requests);
    } else {
      displayRequestsError();
    }
  });
}

// Fonction pour afficher les requêtes détaillées d'un domaine
function displayDomainRequests(domain, requests) {
  const requestsContainer = document.getElementById('requestsContainer');
  const requestsList = document.getElementById('requestsList');
  requestsList.innerHTML = '';
  
  if (requests.length === 0) {
    requestsList.innerHTML = '<div class="request-item">Aucune requête détaillée disponible</div>';
    requestsContainer.style.display = 'block';
    return;
  }
  
  // Trier les requêtes de la plus récente à la plus ancienne
  requests.sort((a, b) => b.timestamp - a.timestamp);
  
  // Créer un élément pour chaque requête
  requests.forEach(request => {
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item';
    
    // Formater l'URL pour l'affichage (tronquer si trop longue)
    let displayUrl = request.url;
    if (displayUrl.length > 100) {
      displayUrl = displayUrl.substring(0, 97) + '...';
    }
    
    // Formater l'horodatage
    const date = new Date(request.timestamp);
    const formattedTime = date.toLocaleTimeString();
    
    requestItem.innerHTML = `
      <span class="request-url">${displayUrl}</span>
      <div class="request-meta">
        <span class="request-type ${request.type.toLowerCase()}">${request.type}</span>
        <span class="request-time">${formattedTime}</span>
      </div>
    `;
    requestsList.appendChild(requestItem);
  });
  
  requestsContainer.style.display = 'block';
}

// Fonction pour cacher les requêtes détaillées
function hideRequests() {
  document.getElementById('requestsContainer').style.display = 'none';
  if (activeDomainItem) {
    activeDomainItem.classList.remove('active');
    activeDomainItem = null;
  }
  currentDomain = null;
}

// Fonction pour afficher une erreur lors du chargement des requêtes
function displayRequestsError() {
  const requestsList = document.getElementById('requestsList');
  requestsList.innerHTML = '<div class="request-item">Erreur lors du chargement des requêtes</div>';
  document.getElementById('requestsContainer').style.display = 'block';
}

// Fonction pour afficher un message d'erreur
function displayError() {
  document.getElementById('mainDomainValue').textContent = 'Erreur';
  document.getElementById('domainList').innerHTML = 
    '<div class="domain-item">Impossible de récupérer les statistiques</div>';
}

// Fonction pour sauvegarder le site actuel dans l'historique
function saveCurrentSite() {
  // Forcer la mise à jour des statistiques actuelles
  chrome.runtime.sendMessage({ action: "getStats" }, (statsResponse) => {
    if (statsResponse && statsResponse.stats) {
      // Une fois les statistiques récupérées, demander la sauvegarde
      chrome.runtime.sendMessage({ action: "saveCurrentSite" }, (response) => {
        if (response && response.success) {
          // Actualiser l'affichage des statistiques avec les données les plus récentes
          updateUI(statsResponse.stats);
          
          // Afficher une notification temporaire de succès
          const saveBtn = document.getElementById('saveHistoryBtn');
          const originalIcon = saveBtn.innerHTML;
          
          saveBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          `;
          
          // Restaurer l'icône d'origine après 2 secondes
          setTimeout(() => {
            saveBtn.innerHTML = originalIcon;
          }, 2000);
        }
      });
    }
  });
}

// Fonction pour ouvrir la page d'historique
function openHistoryPage() {
  chrome.tabs.create({ url: "history.html" });
}