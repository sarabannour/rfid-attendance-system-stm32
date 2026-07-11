// ============================================================
// firebase-sample-data.js
// Exemple de données pour tester le système RTDB
// À exécuter une seule fois via la console du navigateur
// ============================================================

import { rtdb } from './firebase-config.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * Exemple 1: Données de CAPTEURS (format tableau)
 */
export const sampleSensors = [
  {
    id: "sensor_001",
    name: "Capteur Température Cuisine",
    value: 24.5,
    unit: "°C",
    lastUpdate: "2025-05-09 14:32:15",
    status: "online"
  },
  {
    id: "sensor_002",
    name: "Capteur Humidité Salon",
    value: 65,
    unit: "%",
    lastUpdate: "2025-05-09 14:32:10",
    status: "online"
  },
  {
    id: "sensor_003",
    name: "Capteur Luminosité Chambre",
    value: 450,
    unit: "lux",
    lastUpdate: "2025-05-09 14:30:45",
    status: "online"
  },
  {
    id: "sensor_004",
    name: "Capteur Pression Extérieur",
    value: 1013.25,
    unit: "hPa",
    lastUpdate: "2025-05-09 14:15:30",
    status: "offline"
  }
];

/**
 * Exemple 2: Données d'APPAREILS (format objet)
 */
export const sampleDevices = {
  "esp32_kitchen": {
    name: "ESP32 - Cuisine",
    type: "Microcontrôleur",
    status: "online",
    location: "Cuisine",
    ip_address: "192.168.1.100",
    uptime_hours: 720,
    last_seen: "2025-05-09T14:35:00Z"
  },
  "esp32_living": {
    name: "ESP32 - Salon",
    type: "Microcontrôleur",
    status: "online",
    location: "Salon",
    ip_address: "192.168.1.101",
    uptime_hours: 480,
    last_seen: "2025-05-09T14:34:50Z"
  },
  "esp32_bedroom": {
    name: "ESP32 - Chambre",
    type: "Microcontrôleur",
    status: "offline",
    location: "Chambre",
    ip_address: "192.168.1.102",
    uptime_hours: 0,
    last_seen: "2025-05-09T10:00:00Z"
  }
};

/**
 * Exemple 3: JOURNAUX (format tableau)
 */
export const sampleLogs = [
  {
    timestamp: "2025-05-09T14:35:12Z",
    level: "info",
    source: "esp32_kitchen",
    message: "Capteur température lu: 24.5°C"
  },
  {
    timestamp: "2025-05-09T14:35:05Z",
    level: "warning",
    source: "esp32_bedroom",
    message: "Connexion perdue, tentative de reconnexion"
  },
  {
    timestamp: "2025-05-09T14:35:00Z",
    level: "info",
    source: "esp32_living",
    message: "Système démarré avec succès"
  },
  {
    timestamp: "2025-05-09T14:34:50Z",
    level: "error",
    source: "esp32_kitchen",
    message: "Erreur lecture capteur: Timeout"
  }
];

/**
 * Exemple 4: CONFIGURATION (format objet)
 */
export const sampleConfig = {
  appName: "ESPWEB Dashboard",
  version: "1.0.0",
  environment: "production",
  timezone: "Africa/Tunis",
  language: "fr",
  updateInterval: 5000,
  maxRetries: 3,
  logRetentionDays: 30,
  enableNotifications: true,
  enableDebugMode: false
};

/**
 * Exemple 5: STATISTIQUES (format objet)
 */
export const sampleStats = {
  totalDevices: 3,
  onlineDevices: 2,
  offlineDevices: 1,
  totalSensors: 4,
  activeSensors: 3,
  failedReadings: 2,
  averageTemperature: 22.3,
  averageHumidity: 55,
  uptime_percent: 98.5,
  lastUpdate: "2025-05-09T14:35:30Z",
  totalDataPoints: 45678
};

/**
 * ═════════════════════════════════════════════════════════
 * FONCTION PRINCIPALE: Charger tous les exemples
 * ═════════════════════════════════════════════════════════
 */
export async function loadSampleData() {
  try {
    console.log('📥 Chargement des données d\'exemple dans Firebase...');

    // Charger chaque section
    await Promise.all([
      setSectionData('sensors', sampleSensors),
      setSectionData('devices', sampleDevices),
      setSectionData('logs', sampleLogs),
      setSectionData('config', sampleConfig),
      setSectionData('stats', sampleStats)
    ]);

    console.log('✅ Tous les exemples de données sont chargés!');
    console.log('📄 Allez sur la page "Données Firebase" pour voir les données.');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error);
    return false;
  }
}

/**
 * Fonction utilitaire: Ajouter une section
 */
async function setSectionData(sectionName, data) {
  try {
    const sectionRef = ref(rtdb, `/${sectionName}`);
    await set(sectionRef, data);
    console.log(`✓ Section '${sectionName}' ajoutée`);
  } catch (error) {
    console.error(`✗ Erreur section '${sectionName}':`, error);
    throw error;
  }
}

// ═════════════════════════════════════════════════════════
// MODE D'EMPLOI:
// ═════════════════════════════════════════════════════════
// 
// 1. Ouvrez la console du navigateur (F12)
// 2. Collez ce code:
//    import { loadSampleData } from './firebase-sample-data.js';
//    await loadSampleData();
// 
// 3. Attendez le message de succès ✅
// 4. Rechargez la page
// 5. Allez sur "Données Firebase" dans le menu
// 6. Les données s'affichent automatiquement!
// 
// ═════════════════════════════════════════════════════════
