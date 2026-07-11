// ============================================================
// rtdb-loader.js — Chargement & affichage données Realtime DB
// Récupère les données organisées par sections/noms
// ============================================================

import { rtdb } from './firebase-config.js';
import { ref, onValue, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ──────────────────────────────────────────────
// GLOBAL STATE
// ──────────────────────────────────────────────
export let realtimeData = {};  // Toutes les données du RTDB organisées

// ──────────────────────────────────────────────
// Fonction principale : Charger TOUTES les données du RTDB
// ──────────────────────────────────────────────
export function initializeRTDBListener() {
  const rootRef = ref(rtdb, '/');  // Racine de la BD
  
  onValue(rootRef, (snapshot) => {
    realtimeData = snapshot.val() || {};
    console.log('✓ RTDB Data loaded:', realtimeData);
    
    // Afficher les données dans les sections correspondantes
    displayAllSections();
  }, (error) => {
    console.error('RTDB Error:', error);
  });
}

// ──────────────────────────────────────────────
// Afficher les données dans les sections
// ──────────────────────────────────────────────
function displayAllSections() {
  // Parcourir chaque clé principale (section)
  Object.keys(realtimeData).forEach(section => {
    displaySection(section, realtimeData[section]);
  });
}

// ──────────────────────────────────────────────
// Afficher une section spécifique
// Format supposé : chaque clé = section, chaque valeur = tableau ou objet
// ──────────────────────────────────────────────
function displaySection(sectionName, data) {
  // Chercher un conteneur avec l'ID section-{nom}
  const container = document.getElementById(`section-${sectionName}`);
  
  if (!container) {
    console.warn(`⚠ Conteneur #section-${sectionName} non trouvé`);
    return;
  }

  if (!data) {
    container.innerHTML = '<div class="empty-state">Aucune donnée</div>';
    return;
  }

  // Vérifier si c'est un tableau ou un objet
  if (Array.isArray(data)) {
    displayArray(container, sectionName, data);
  } else if (typeof data === 'object') {
    displayObject(container, sectionName, data);
  } else {
    container.innerHTML = `<p>${data}</p>`;
  }
}

// ──────────────────────────────────────────────
// Afficher les données de type TABLEAU
// ──────────────────────────────────────────────
function displayArray(container, sectionName, data) {
  const html = data.map((item, idx) => {
    if (typeof item === 'object') {
      return `
        <div class="data-item">
          <div class="item-header">${sectionName} #${idx + 1}</div>
          <div class="item-content">
            ${Object.entries(item).map(([key, val]) => 
              `<div class="data-row"><strong>${key}:</strong> <span>${formatValue(val)}</span></div>`
            ).join('')}
          </div>
        </div>
      `;
    } else {
      return `<div class="data-item"><span>${item}</span></div>`;
    }
  }).join('');
  
  container.innerHTML = html || '<div class="empty-state">Liste vide</div>';
}

// ──────────────────────────────────────────────
// Afficher les données de type OBJET
// ──────────────────────────────────────────────
function displayObject(container, sectionName, data) {
  const html = `
    <div class="data-item">
      <div class="item-header">${sectionName}</div>
      <div class="item-content">
        ${Object.entries(data).map(([key, val]) => {
          if (typeof val === 'object') {
            return `<div class="data-row"><strong>${key}:</strong> <pre>${JSON.stringify(val, null, 2)}</pre></div>`;
          }
          return `<div class="data-row"><strong>${key}:</strong> <span>${formatValue(val)}</span></div>`;
        }).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ──────────────────────────────────────────────
// Formater les valeurs pour l'affichage
// ──────────────────────────────────────────────
function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? '✓ Oui' : '✗ Non';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// ──────────────────────────────────────────────
// Fonction utilitaire : Récupérer une section spécifique
// ──────────────────────────────────────────────
export async function getSection(sectionName) {
  const sectionRef = ref(rtdb, `/${sectionName}`);
  try {
    const snapshot = await get(sectionRef);
    return snapshot.val();
  } catch (error) {
    console.error(`Erreur lecture section "${sectionName}":`, error);
    return null;
  }
}

// ──────────────────────────────────────────────
// Fonction utilitaire : Mettre à jour une section (optionnel)
// ──────────────────────────────────────────────
export async function updateSection(sectionName, data) {
  try {
    const sectionRef = ref(rtdb, `/${sectionName}`);
    await set(sectionRef, data);
    console.log(`✓ Section "${sectionName}" mise à jour`);
    return true;
  } catch (error) {
    console.error(`Erreur mise à jour section "${sectionName}":`, error);
    return false;
  }
}

// ──────────────────────────────────────────────
// Initialiser au chargement du script
// ──────────────────────────────────────────────
initializeRTDBListener();
