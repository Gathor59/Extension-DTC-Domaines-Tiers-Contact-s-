document.addEventListener('DOMContentLoaded', () => {
  // Éléments DOM
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const groupVisitsCheckbox = document.getElementById('groupVisitsCheckbox');
  groupVisitsCheckbox.checked = true;
  const historyTableBody = document.getElementById('historyTableBody');
  const emptyState = document.getElementById('emptyState');
  const exportButton = document.getElementById('exportButton');
  const clearButton = document.getElementById('clearButton');
  
  // Éléments pour le filtre de période
  const periodFilterBtn = document.getElementById('periodFilterBtn');
  const periodFilterDropdown = document.getElementById('periodFilterDropdown');
  const periodFilterDay = document.getElementById('periodFilterDay');
  const periodFilterWeek = document.getElementById('periodFilterWeek');
  const periodFilterMonth = document.getElementById('periodFilterMonth');
  const periodFilterAllTime = document.getElementById('periodFilterAllTime');
  const selectedPeriod = document.getElementById('selectedPeriod');
  
  // Éléments des statistiques par période
  const totalSitesDay = document.getElementById('totalSitesDay');
  const uniqueDomainsDay = document.getElementById('uniqueDomainsDay');
  const avgThirdPartyDay = document.getElementById('avgThirdPartyDay');
  const avgRequestsDay = document.getElementById('avgRequestsDay');
  const totalSitesWeek = document.getElementById('totalSitesWeek');
  const uniqueDomainsWeek = document.getElementById('uniqueDomainsWeek');
  const avgThirdPartyWeek = document.getElementById('avgThirdPartyWeek');
  const avgRequestsWeek = document.getElementById('avgRequestsWeek');
  const totalSitesMonth = document.getElementById('totalSitesMonth');
  const uniqueDomainsMonth = document.getElementById('uniqueDomainsMonth');
  const avgThirdPartyMonth = document.getElementById('avgThirdPartyMonth');
  const avgRequestsMonth = document.getElementById('avgRequestsMonth');
  const totalSitesAllTime = document.getElementById('totalSitesAllTime');
  const uniqueDomainsAllTime = document.getElementById('uniqueDomainsAllTime');
  const avgThirdPartyAllTime = document.getElementById('avgThirdPartyAllTime');
  const avgRequestsAllTime = document.getElementById('avgRequestsAllTime');
  const totalThirdPartyDomainsDay = document.getElementById('totalThirdPartyDomainsDay');
  const totalRequestsDay = document.getElementById('totalRequestsDay');
  
  const totalThirdPartyDomainsWeek = document.getElementById('totalThirdPartyDomainsWeek');
  const totalRequestsWeek = document.getElementById('totalRequestsWeek');
  
  const totalThirdPartyDomainsMonth = document.getElementById('totalThirdPartyDomainsMonth');
  const totalRequestsMonth = document.getElementById('totalRequestsMonth');
  
  const totalThirdPartyDomainsAllTime = document.getElementById('totalThirdPartyDomainsAllTime');
  const totalRequestsAllTime = document.getElementById('totalRequestsAllTime');
  
  // Éléments du Top 10
  const tabDay = document.getElementById('tabDay');
  const tabWeek = document.getElementById('tabWeek');
  const tabMonth = document.getElementById('tabMonth');
  const tabAllTime = document.getElementById('tabAllTime');
  const top10Contents = document.querySelectorAll('.top10-content');
  
  // Éléments du modal de détails
  const detailsModal = document.getElementById('detailsModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalUrl = document.getElementById('modalUrl');
  const modalVisitTime = document.getElementById('modalVisitTime');
  const modalDomainsCount = document.getElementById('modalDomainsCount');
  const modalRequestsCount = document.getElementById('modalRequestsCount');
  const modalDomainsList = document.getElementById('modalDomainsList');
  
  // Éléments du modal de confirmation
  const confirmModal = document.getElementById('confirmModal');
  const confirmClearBtn = document.getElementById('confirmClearBtn');
  const cancelClearBtn = document.getElementById('cancelClearBtn');
  
  // Stocker l'historique complet et filtré
  let sitesHistory = [];
  let filteredHistory = [];
  let showAllTopSites = false; // Variable pour contrôler l'affichage complet ou limité du top 10
  
  // Période actuelle (par défaut: jour)
  let currentPeriod = 'day';
  
  // Variables pour la pagination
  let currentPage = 1;
  const itemsPerPage = 50;
  let totalPages = 1;

  // Charger les données d'historique
  loadHistoryData();
  
  // Ajouter les écouteurs d'événements
  searchInput.addEventListener('input', filterAndSortHistory);
  sortSelect.addEventListener('change', filterAndSortHistory);
  groupVisitsCheckbox.addEventListener('change', filterAndSortHistory);
  exportButton.addEventListener('click', exportHistory);
  clearButton.addEventListener('click', showConfirmModal);
  confirmClearBtn.addEventListener('click', clearHistory);
  cancelClearBtn.addEventListener('click', hideConfirmModal);
  
  // Écouteurs pour le filtre de période
  periodFilterBtn.addEventListener('click', togglePeriodFilterDropdown);
  periodFilterDay.addEventListener('click', () => switchPeriodFilter('day'));
  periodFilterWeek.addEventListener('click', () => switchPeriodFilter('week'));
  periodFilterMonth.addEventListener('click', () => switchPeriodFilter('month'));
  periodFilterAllTime.addEventListener('click', () => switchPeriodFilter('allTime'));
  
  // Écouteurs pour le Top 10
  tabDay.addEventListener('click', () => switchTab('day'));
  tabWeek.addEventListener('click', () => switchTab('week'));
  tabMonth.addEventListener('click', () => switchTab('month'));
  tabAllTime.addEventListener('click', () => switchTab('allTime'));
  
  // Ajouter un écouteur de clic sur le container du top 10 pour basculer entre vue limitée et complète
  document.querySelector('.top10-container').addEventListener('click', function(event) {
      // Ne basculer que si on n'a pas cliqué sur un onglet ou une ligne de résultat
      if (!event.target.closest('.top10-tab') && !event.target.closest('tr')) {
        showAllTopSites = !showAllTopSites;
        updateTop10Lists(); // Mettre à jour l'affichage du top 10
      }
  });
  
  // Fermer les menus déroulants quand on clique ailleurs
  document.addEventListener('click', (event) => {
    if (!event.target.matches('.period-filter-btn') && 
        !event.target.closest('.period-filter-btn')) {
      periodFilterDropdown.classList.remove('show');
    }
  });
  
  // Fermer les modals lorsqu'on clique sur le X
  document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      detailsModal.style.display = 'none';
      confirmModal.style.display = 'none';
    });
  });
  
  // Fermer les modals lorsqu'on clique en dehors
  window.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
      detailsModal.style.display = 'none';
    }
    if (event.target === confirmModal) {
      confirmModal.style.display = 'none';
    }
  });
  
  // Fonction pour charger les données d'historique
  function loadHistoryData() {
    chrome.runtime.sendMessage({ action: "getSitesHistory" }, (response) => {
      if (response && response.sitesHistory) {
        sitesHistory = response.sitesHistory;
        filterAndSortHistory();
        updateStatsSummary();
        updateTop10Lists();
        
        // Mettre à jour les statistiques quotidiennes si on est en mode semaine
        if (currentPeriod === 'week') {
          updateDailyStats();
        }
      }
    });
  }
  
  // Fonction pour obtenir le nombre de domaines uniques
  function getUniqueDomains(sites) {
    // Utiliser un Set pour compter les domaines uniques
    const uniqueDomains = new Set();
    
    sites.forEach(site => {
      if (site.mainDomain) {
        uniqueDomains.add(site.mainDomain);
      }
    });
    
    return uniqueDomains.size;
  }
  
  // Fonction pour filtrer et trier l'historique
  function filterAndSortHistory() {
    const searchTerm = searchInput.value.toLowerCase();
    const sortOption = sortSelect.value;
    const shouldGroupVisits = groupVisitsCheckbox.checked;
    
    // Obtenir les sites pour la période actuelle
    const periodFilteredSites = filterSitesByPeriod(currentPeriod);
    
    // Filtrer l'historique
    filteredHistory = periodFilteredSites.filter(site => {
      return site.mainDomain.toLowerCase().includes(searchTerm) || 
             site.url.toLowerCase().includes(searchTerm);
    });
    
    // Regrouper les visites si l'option est activée
    if (shouldGroupVisits) {
      const groupedMap = new Map();
      
      filteredHistory.forEach(site => {
        // Utiliser le domaine principal comme clé de regroupement
        if (!groupedMap.has(site.mainDomain)) {
          groupedMap.set(site.mainDomain, site);
        } else {
          // Si le site existe déjà, garder le plus récent
          const existingSite = groupedMap.get(site.mainDomain);
          if (site.visitTime > existingSite.visitTime) {
            groupedMap.set(site.mainDomain, site);
          }
        }
      });
      
      // Convertir la Map en tableau
      filteredHistory = Array.from(groupedMap.values());
    }
    
    // Trier l'historique
    filteredHistory.sort((a, b) => {
      switch (sortOption) {
        case 'time-desc':
          return b.visitTime - a.visitTime;
        case 'time-asc':
          return a.visitTime - b.visitTime;
        case 'domain-asc':
          return a.mainDomain.localeCompare(b.mainDomain);
        case 'domain-desc':
          return b.mainDomain.localeCompare(a.mainDomain);
        case 'third-party-desc':
          return b.thirdPartyDomains - a.thirdPartyDomains;
        case 'third-party-asc':
          return a.thirdPartyDomains - b.thirdPartyDomains;
        case 'requests-desc':
          return b.totalRequests - a.totalRequests;
        case 'requests-asc':
          return a.totalRequests - b.totalRequests;
        default:
          return b.visitTime - a.visitTime;
      }
    });
    
    // Calculer le nombre total de pages
    totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    if (totalPages < 1) totalPages = 1;
    
    // Ajuster la page courante si nécessaire
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    // Mettre à jour les informations de pagination
    updatePaginationControls();
    
    // Afficher l'historique pour la page courante
    renderHistoryTable();
  }
  
  // Fonction auxiliaire pour filtrer les sites par période
  function filterSitesByPeriod(period) {
    // Obtenir les dates limites pour les différentes périodes
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
    
    // Filtrer les sites par période sélectionnée
    switch (period) {
      case 'day':
        return sitesHistory.filter(site => site.visitTime >= todayStart);
      case 'week':
        return sitesHistory.filter(site => site.visitTime >= weekStart);
      case 'month':
        return sitesHistory.filter(site => site.visitTime >= monthStart);
      case 'allTime':
      default:
        return sitesHistory;
    }
  }
  
  // Fonction pour mettre à jour le résumé des statistiques
  function updateStatsSummary() {
    // Obtenir les sites pour chaque période
    const todaySites = filterSitesByPeriod('day');
    const weekSites = filterSitesByPeriod('week');
    const monthSites = filterSitesByPeriod('month');
    
    // Calculer le nombre de domaines uniques pour chaque période
    const todayUniqueDomains = getUniqueDomains(todaySites);
    const weekUniqueDomains = getUniqueDomains(weekSites);
    const monthUniqueDomains = getUniqueDomains(monthSites);
    const allTimeUniqueDomains = getUniqueDomains(sitesHistory);
    
    // Mettre à jour les statistiques pour chaque période
    updatePeriodStats(
      totalSitesDay, 
      uniqueDomainsDay, 
      avgThirdPartyDay, 
      avgRequestsDay,
      totalThirdPartyDomainsDay,
      totalRequestsDay, 
      todaySites, 
      todayUniqueDomains
    );
    
    updatePeriodStats(
      totalSitesWeek, 
      uniqueDomainsWeek, 
      avgThirdPartyWeek, 
      avgRequestsWeek,
      totalThirdPartyDomainsWeek,
      totalRequestsWeek, 
      weekSites, 
      weekUniqueDomains
    );
    
    updatePeriodStats(
      totalSitesMonth, 
      uniqueDomainsMonth, 
      avgThirdPartyMonth, 
      avgRequestsMonth,
      totalThirdPartyDomainsMonth,
      totalRequestsMonth, 
      monthSites, 
      monthUniqueDomains
    );
    
    updatePeriodStats(
      totalSitesAllTime, 
      uniqueDomainsAllTime, 
      avgThirdPartyAllTime, 
      avgRequestsAllTime,
      totalThirdPartyDomainsAllTime,
      totalRequestsAllTime, 
      sitesHistory, 
      allTimeUniqueDomains
    );
  }
  
  // Fonction auxiliaire pour mettre à jour les statistiques d'une période
  function updatePeriodStats(totalElement, uniqueDomainsElement, avgThirdPartyElement, avgRequestsElement, totalThirdPartyElement, totalRequestsElement, sites, uniqueDomainsCount) {
      totalElement.textContent = sites.length;
      uniqueDomainsElement.textContent = uniqueDomainsCount;
      
      if (sites.length > 0) {
        // Pour le calcul des domaines tiers uniques en mode semaine
        if (currentPeriod === 'week') {
          let uniqueThirdPartyDomains = new Set();
          
          // Collecter tous les domaines tiers uniques
          sites.forEach(site => {
            if (site.domainsList && site.domainsList.length > 0) {
              site.domainsList.forEach(domain => {
                uniqueThirdPartyDomains.add(domain.domain);
              });
            }
          });
          
          const totalThirdParty = uniqueThirdPartyDomains.size;
          const totalRequests = sites.reduce((sum, site) => sum + site.totalRequests, 0);
          
          avgThirdPartyElement.textContent = (totalThirdParty / uniqueDomainsCount).toFixed(1);
          avgRequestsElement.textContent = (totalRequests / sites.length).toFixed(1);
          
          // Mettre à jour les totaux avec des domaines tiers uniques
          totalThirdPartyElement.textContent = totalThirdParty.toLocaleString();
          totalRequestsElement.textContent = totalRequests.toLocaleString();
        } else {
          // Comportement standard pour les autres périodes
          const totalThirdParty = sites.reduce((sum, site) => sum + site.thirdPartyDomains, 0);
          const totalRequests = sites.reduce((sum, site) => sum + site.totalRequests, 0);
          
          avgThirdPartyElement.textContent = (totalThirdParty / sites.length).toFixed(1);
          avgRequestsElement.textContent = (totalRequests / sites.length).toFixed(1);
          
          // Ajout des nouveaux totaux
          totalThirdPartyElement.textContent = totalThirdParty.toLocaleString();
          totalRequestsElement.textContent = totalRequests.toLocaleString();
        }
      } else {
        avgThirdPartyElement.textContent = '0';
        avgRequestsElement.textContent = '0';
        totalThirdPartyElement.textContent = '0';
        totalRequestsElement.textContent = '0';
      }
  }
  
  // Fonction pour afficher l'historique dans le tableau avec pagination
  function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    
    if (filteredHistory.length === 0) {
      emptyState.style.display = 'flex';
      document.querySelector('.table-container').style.display = 'none';
      document.querySelector('.pagination-container').style.display = 'none';
      return;
    }
    
    emptyState.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
    document.querySelector('.pagination-container').style.display = 'flex';
    
    // Calculer les indices de début et de fin pour la page courante
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredHistory.length);
    
    // Afficher les éléments de la page courante
    for (let i = startIndex; i < endIndex; i++) {
      const site = filteredHistory[i];
      
      // Pour chaque site dans l'historique filtré, créer une ligne
      const row = document.createElement('tr');
      
      // Formater la date de visite
      const visitDate = new Date(site.visitTime);
      const formattedDate = visitDate.toLocaleDateString() + ' ' + visitDate.toLocaleTimeString();
      
      // Limiter l'URL affichée
      const displayUrl = site.url.length > 50 ? site.url.substring(0, 47) + '...' : site.url;
      
      row.innerHTML = `
        <td>
          <div class="site-domain">${site.mainDomain}</div>
          <div class="site-url">${displayUrl}</div>
        </td>
        <td class="date-cell">${formattedDate}</td>
        <td class="count-cell">${site.thirdPartyDomains}</td>
        <td class="count-cell">${site.totalRequests}</td>
        <td class="actions-cell">
          <button class="action-btn details-btn" title="Voir les détails">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </td>
      `;
      
      // Ajouter un écouteur pour le bouton de détails
      row.querySelector('.details-btn').addEventListener('click', () => {
        showDetailsModal(site);
      });
      
      historyTableBody.appendChild(row);
    }
    
    // Mettre à jour le texte de pagination
    document.querySelector('.pagination-info').textContent = 
      `Affichage de ${startIndex + 1}-${endIndex} sur ${filteredHistory.length} site${filteredHistory.length > 1 ? 's' : ''}`;
  }
  
  // Fonction pour afficher le modal de détails
  function showDetailsModal(site) {
    modalTitle.textContent = site.mainDomain;
    modalUrl.textContent = site.url;
    
    const visitDate = new Date(site.visitTime);
    modalVisitTime.textContent = visitDate.toLocaleDateString() + ' ' + visitDate.toLocaleTimeString();
    
    modalDomainsCount.textContent = site.thirdPartyDomains;
    modalRequestsCount.textContent = site.totalRequests;
    
    // Afficher la liste des domaines
    modalDomainsList.innerHTML = '';
    if (site.domainsList && site.domainsList.length > 0) {
      site.domainsList.sort((a, b) => b.count - a.count).forEach(domain => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.innerHTML = `
          <span class="domain-name">${domain.domain}</span>
          <span class="domain-count">${domain.count} requête${domain.count > 1 ? 's' : ''}</span>
        `;
        modalDomainsList.appendChild(domainItem);
      });
    } else {
      modalDomainsList.innerHTML = '<div class="domain-item">Aucun détail disponible</div>';
    }
    
    detailsModal.style.display = 'block';
  }
  
  // Fonction pour afficher le modal de confirmation
  function showConfirmModal() {
    confirmModal.style.display = 'block';
  }
  
  // Fonction pour cacher le modal de confirmation
  function hideConfirmModal() {
    confirmModal.style.display = 'none';
  }
  
  // Fonction pour effacer l'historique
  function clearHistory() {
    chrome.runtime.sendMessage({ action: "clearHistory" }, (response) => {
      if (response && response.success) {
        sitesHistory = [];
        filteredHistory = [];
        renderHistoryTable();
        updateStatsSummary();
        updateTop10Lists();
        hideConfirmModal();
      }
    });
  }
  
  // Fonction pour exporter l'historique
  function exportHistory() {
    // Préparer les données pour l'export
    const exportData = filteredHistory.map(site => {
      const visitDate = new Date(site.visitTime);
      const formattedDate = visitDate.toLocaleDateString() + ' ' + visitDate.toLocaleTimeString();
      
      // Préparer les domaines tiers
      let domainsListText = '';
      if (site.domainsList && site.domainsList.length > 0) {
        domainsListText = site.domainsList.map(d => `${d.domain} (${d.count})`).join('; ');
      }
      
      return {
        'Site': site.mainDomain,
        'URL': site.url,
        'Visité le': formattedDate,
        'Domaines tiers': site.thirdPartyDomains,
        'Requêtes': site.totalRequests,
        'Liste des domaines': domainsListText
      };
    });
    
    // Convertir les données en CSV
    const headers = Object.keys(exportData[0] || {});
    
    if (headers.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }
    
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => {
        // Échapper les guillemets et encadrer de guillemets si nécessaire
        const value = String(row[header]).replace(/"/g, '""');
        return value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');
    
    // Créer un blob et un lien de téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Générer un nom de fichier avec la date
    const now = new Date();
    const fileName = `domaines-tiers-historique-${now.toISOString().split('T')[0]}.csv`;
    
    // Configurer et déclencher le téléchargement
    link.href = url;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Fonction pour afficher/masquer le menu déroulant du filtre de période
  function togglePeriodFilterDropdown() {
    periodFilterDropdown.classList.toggle('show');
  }
  
  // Fonction pour changer la période de filtre
  function switchPeriodFilter(period) {
    // Désactiver tous les liens du menu
    document.querySelectorAll('.period-filter-dropdown a').forEach(link => {
      link.classList.remove('active');
    });
    
    // Mettre à jour la période actuelle
    currentPeriod = period;
    
    // Activer le lien correspondant et mettre à jour le texte
    let periodText = '';
    switch (period) {
      case 'day':
        periodText = 'Aujourd\'hui';
        periodFilterDay.classList.add('active');
        
        // Basculer l'affichage des statistiques
        document.querySelectorAll('.stats-period').forEach(stat => {
          stat.classList.remove('active');
        });
        document.getElementById('statsDay').classList.add('active');
        
        // Synchroniser l'onglet du Top 10
        switchTab('day');
        
        // Masquer les statistiques quotidiennes
        if (document.getElementById('dailyStatsContainer')) {
          document.getElementById('dailyStatsContainer').style.display = 'none';
        }
        
        break;
      case 'week':
        periodText = 'Cette semaine';
        periodFilterWeek.classList.add('active');
        
        // Basculer l'affichage des statistiques
        document.querySelectorAll('.stats-period').forEach(stat => {
          stat.classList.remove('active');
        });
        document.getElementById('statsWeek').classList.add('active');
        
        // Synchroniser l'onglet du Top 10
        switchTab('week');
        
        // Mettre à jour et afficher les statistiques quotidiennes
        updateDailyStats();
        
        break;
      case 'month':
        periodText = 'Ce mois';
        periodFilterMonth.classList.add('active');
        
        // Basculer l'affichage des statistiques
        document.querySelectorAll('.stats-period').forEach(stat => {
          stat.classList.remove('active');
        });
        document.getElementById('statsMonth').classList.add('active');
        
        // Synchroniser l'onglet du Top 10
        switchTab('month');
        
        // Masquer les statistiques quotidiennes
        if (document.getElementById('dailyStatsContainer')) {
          document.getElementById('dailyStatsContainer').style.display = 'none';
        }
        
        break;
      case 'allTime':
        periodText = 'Tout le temps';
        periodFilterAllTime.classList.add('active');
        
        // Basculer l'affichage des statistiques
        document.querySelectorAll('.stats-period').forEach(stat => {
          stat.classList.remove('active');
        });
        document.getElementById('statsAllTime').classList.add('active');
        
        // Synchroniser l'onglet du Top 10
        switchTab('allTime');
        
        // Masquer les statistiques quotidiennes
        if (document.getElementById('dailyStatsContainer')) {
          document.getElementById('dailyStatsContainer').style.display = 'none';
        }
        
        break;
    }
    
    // Mettre à jour le texte du bouton
    selectedPeriod.textContent = periodText;
    
    // Fermer le menu déroulant
    periodFilterDropdown.classList.remove('show');
    
    // Réinitialiser la pagination
    resetPagination();
    
    // Mettre à jour les statistiques et filtrer l'historique
    filterAndSortHistory();
    updateStatsSummary();
  }

  // Fonction pour calculer et afficher les statistiques par jour pour la semaine
  function updateDailyStats() {
    const dailyStatsContainer = document.getElementById('dailyStatsContainer');
    
    // Si le conteneur n'existe pas encore, ne rien faire
    if (!dailyStatsContainer) return;
    
    const dailyStatsTableBody = document.getElementById('dailyStatsTableBody');
    
    // N'afficher que si on est dans la vue hebdomadaire
    if (currentPeriod !== 'week') {
      dailyStatsContainer.style.display = 'none';
      return;
    }
    
    // Afficher le conteneur
    dailyStatsContainer.style.display = 'block';
    
    // Vider le tableau
    dailyStatsTableBody.innerHTML = '';
    
    // Calculer la date de début de la semaine (7 jours en arrière)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Créer un tableau pour chaque jour de la semaine (de aujourd'hui à il y a 6 jours)
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today - i * 24 * 60 * 60 * 1000);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      // Filtrer les sites pour ce jour spécifique
      const sitesForDay = sitesHistory.filter(site => 
        site.visitTime >= dayStart && site.visitTime < dayEnd);

      // Calculer les statistiques pour ce jour
      const uniqueDomainsForDay = getUniqueDomains(sitesForDay);

      // Calculer le nombre total de domaines tiers (non-uniques)
      const totalThirdPartyDomains = sitesForDay.reduce((sum, site) => sum + site.thirdPartyDomains, 0);

      // Calculer le nombre de domaines tiers uniques
      let uniqueThirdPartyDomainsSet = new Set();
      sitesForDay.forEach(site => {
        if (site.domainsList && site.domainsList.length > 0) {
          site.domainsList.forEach(domain => {
            uniqueThirdPartyDomainsSet.add(domain.domain);
          });
        }
      });
      const uniqueThirdPartyDomainsCount = uniqueThirdPartyDomainsSet.size;

      const totalRequests = sitesForDay.reduce((sum, site) => sum + site.totalRequests, 0);

      // Formatter le nom du jour
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[date.getDay()];
      const formattedDate = `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;

      // Ajouter au tableau des jours
      days.push({
        date: formattedDate,
        timestamp: dayStart,
        totalSites: sitesForDay.length,
        uniqueDomains: uniqueDomainsForDay,
        totalThirdPartyDomains,
        uniqueThirdPartyDomains: uniqueThirdPartyDomainsCount,
        totalRequests
      });
    }

    // Inverser le tableau pour avoir les jours dans l'ordre chronologique (du plus ancien au plus récent)
    days.reverse();

    // Générer les lignes du tableau
    days.forEach(day => {
      const row = document.createElement('tr');

      // Ajouter une classe spéciale si c'est aujourd'hui
      if (day.timestamp === today) {
        row.classList.add('current-day');
      }

      row.innerHTML = `
        <td class="day-name">${day.date}</td>
        <td>${day.totalSites}</td>
        <td>${day.uniqueDomains}</td>
        <td>${day.totalThirdPartyDomains}</td>
        <td>${day.uniqueThirdPartyDomains}</td>
        <td>${day.totalRequests}</td>
      `;

      dailyStatsTableBody.appendChild(row);
    });
  }

  // Fonction pour changer d'onglet dans le Top 10
  function switchTab(period) {
    // Désactiver tous les onglets
    document.querySelectorAll('.top10-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // Désactiver tous les contenus
    top10Contents.forEach(content => {
      content.classList.remove('active');
    });

    // Activer l'onglet et le contenu correspondant
    let tabId, contentId;

    switch (period) {
      case 'day':
        tabId = 'tabDay';
        contentId = 'top10Day';
        break;
      case 'week':
        tabId = 'tabWeek';
        contentId = 'top10Week';
        break;
      case 'month':
        tabId = 'tabMonth';
        contentId = 'top10Month';
        break;
      case 'allTime':
        tabId = 'tabAllTime';
        contentId = 'top10AllTime';
        break;
    }

    document.getElementById(tabId).classList.add('active');
    document.getElementById(contentId).classList.add('active');

    // Réinitialiser l'état d'affichage complet
    showAllTopSites = false;

    // Mettre à jour les top 10
    updateTop10Lists();
  }

  // Fonction pour mettre à jour les listes du Top 10
  function updateTop10Lists() {
    // Obtenir les sites pour chaque période
    const todaySites = filterSitesByPeriod('day');
    const weekSites = filterSitesByPeriod('week');
    const monthSites = filterSitesByPeriod('month');

    // Mettre à jour les tops 10
    updateTop10Table('top10DayBody', todaySites);
    updateTop10Table('top10WeekBody', weekSites);
    updateTop10Table('top10MonthBody', monthSites);
    updateTop10Table('top10AllTimeBody', sitesHistory);
  }

  // Fonction pour mettre à jour une table de Top 10 spécifique
  function updateTop10Table(tableBodyId, sites) {
    const tableBody = document.getElementById(tableBodyId);
    const emptyMessage = tableBody.parentElement.previousElementSibling; // Message d'absence de données

    if (sites.length === 0) {
      tableBody.innerHTML = '';
      emptyMessage.style.display = 'block';
      tableBody.parentElement.style.display = 'none';
      return;
    }

    // Masquer le message d'absence de données et afficher la table
    emptyMessage.style.display = 'none';
    tableBody.parentElement.style.display = 'table';

    // Regrouper les sites par domaine principal et prendre la visite avec le plus de domaines tiers
    const sitesByDomain = new Map();

    sites.forEach(site => {
      if (!sitesByDomain.has(site.mainDomain) || 
          site.thirdPartyDomains > sitesByDomain.get(site.mainDomain).thirdPartyDomains) {
        sitesByDomain.set(site.mainDomain, site);
      }
    });

    // Convertir en tableau et trier par nombre de domaines tiers (décroissant)
    const topSites = Array.from(sitesByDomain.values())
      .sort((a, b) => b.thirdPartyDomains - a.thirdPartyDomains || b.totalRequests - a.totalRequests);

    // Déterminer combien de sites afficher
    const sitesToShow = showAllTopSites ? topSites.slice(0, 10) : topSites.slice(0, 3);

    // Générer le HTML pour chaque ligne
    tableBody.innerHTML = '';

    sitesToShow.forEach((site, index) => {
      const row = document.createElement('tr');

      // Ajouter une classe spéciale pour les 3 premiers
      let rankClass = '';
      if (index === 0) rankClass = 'top1';
      else if (index === 1) rankClass = 'top2';
      else if (index === 2) rankClass = 'top3';

      // Limiter l'URL affichée
      const displayUrl = site.url.length > 40 ? site.url.substring(0, 37) + '...' : site.url;

      row.innerHTML = `
        <td class="top10-rank ${rankClass}">#${index + 1}</td>
        <td>
          <div class="top10-site">${site.mainDomain}</div>
          <div class="top10-url">${displayUrl}</div>
        </td>
        <td class="top10-count">${site.thirdPartyDomains}</td>
        <td class="top10-count">${site.totalRequests}</td>
      `;

      // Ajouter un écouteur pour afficher les détails au clic
      row.addEventListener('click', (event) => {
        showDetailsModal(site);
        event.stopPropagation(); // Empêcher que le clic propage au container
      });

      // Ajouter un style pointer au survol
      row.style.cursor = 'pointer';

      tableBody.appendChild(row);
    });

    // Ajouter un indicateur si le top 10 est tronqué et qu'il y a plus de 3 sites
    if (!showAllTopSites && topSites.length > 3) {
      const showMoreRow = document.createElement('tr');
      showMoreRow.className = 'show-more-row';
      showMoreRow.innerHTML = `
        <td colspan="4" class="show-more-cell">
          <span>Cliquez pour afficher tous les résultats (${topSites.length})</span>
        </td>
      `;

      // Ajouter un gestionnaire d'événements spécifique à cette ligne
      showMoreRow.addEventListener('click', (event) => {
        showAllTopSites = true;
        updateTop10Lists();
        event.stopPropagation(); // Empêcher la propagation au conteneur parent
      });

      tableBody.appendChild(showMoreRow);
    }
  }

  // Nouvelle fonction pour mettre à jour les contrôles de pagination
  function updatePaginationControls() {
    const paginationPages = document.querySelector('.pagination-pages');
    paginationPages.innerHTML = '';

    // Bouton précédent
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn prev-btn';
    prevButton.innerHTML = '&laquo; Précédent';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderHistoryTable();
        updatePaginationControls();
      }
    });
    paginationPages.appendChild(prevButton);

    // Afficher les numéros de page (avec des ellipses pour les grandes plages)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Ajuster si on est proche de la fin
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Première page et ellipse si nécessaire
    if (startPage > 1) {
      const firstPageBtn = document.createElement('button');
      firstPageBtn.className = 'pagination-btn page-btn';
      firstPageBtn.textContent = '1';
      firstPageBtn.addEventListener('click', () => {
        currentPage = 1;
        renderHistoryTable();
        updatePaginationControls();
      });
      paginationPages.appendChild(firstPageBtn);

      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationPages.appendChild(ellipsis);
      }
    }

    // Pages visibles
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = 'pagination-btn page-btn' + (i === currentPage ? ' active' : '');
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderHistoryTable();
        updatePaginationControls();
      });
      paginationPages.appendChild(pageBtn);
    }

    // Dernière page et ellipse si nécessaire
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationPages.appendChild(ellipsis);
      }

      const lastPageBtn = document.createElement('button');
      lastPageBtn.className = 'pagination-btn page-btn';
      lastPageBtn.textContent = totalPages;
      lastPageBtn.addEventListener('click', () => {
        currentPage = totalPages;
        renderHistoryTable();
        updatePaginationControls();
      });
      paginationPages.appendChild(lastPageBtn);
    }

    // Bouton suivant
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn next-btn';
    nextButton.innerHTML = 'Suivant &raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderHistoryTable();
        updatePaginationControls();
      }
    });
    paginationPages.appendChild(nextButton);
  }

  // Fonction à ajouter pour réinitialiser la pagination
  function resetPagination() {
    currentPage = 1;
    updatePaginationControls();
  }

  // Modifier les écouteurs d'événements pour réinitialiser la pagination
  searchInput.addEventListener('input', () => {
    resetPagination();
    filterAndSortHistory();
  });

  sortSelect.addEventListener('change', () => {
    resetPagination();
    filterAndSortHistory();
  });

  groupVisitsCheckbox.addEventListener('change', () => {
    resetPagination();
    filterAndSortHistory();
  });
});