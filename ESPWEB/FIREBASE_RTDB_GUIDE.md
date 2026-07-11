# 📊 Guide d'utilisation: Firebase Realtime Database avec le Dashboard

Ce guide explique comment structurer vos données Firebase Realtime Database et les afficher dans le dashboard.

---

## 🎯 Vue d'ensemble du système

Le système automatise l'affichage des données du **Firebase Realtime Database (RTDB)** dans votre application web. Chaque section du RTDB correspond à une section du dashboard.

### Architecture

```
Firebase Realtime Database (RTDB)
├── sensors/          → Affiche dans #section-sensors
├── devices/          → Affiche dans #section-devices
├── logs/             → Affiche dans #section-logs
├── config/           → Affiche dans #section-config
└── stats/            → Affiche dans #section-stats
```

---

## 📝 Structure des données dans Firebase

### 1️⃣ Format TABLEAU (Array)

Chaque élément du tableau est affiché dans une carte.

**Exemple - Capteurs:**
```json
{
  "sensors": [
    {
      "id": "sensor_001",
      "name": "Capteur Température",
      "value": 24.5,
      "unit": "°C",
      "lastUpdate": "2025-05-09 14:32:15"
    },
    {
      "id": "sensor_002",
      "name": "Capteur Humidité",
      "value": 65,
      "unit": "%",
      "lastUpdate": "2025-05-09 14:32:10"
    }
  ]
}
```

### 2️⃣ Format OBJET (Object)

Les données clé-valeur sont affichées en lignes.

**Exemple - Configuration:**
```json
{
  "config": {
    "appName": "ESPWEB",
    "version": "1.0.0",
    "mode": "production",
    "updateInterval": 5000,
    "timezone": "Africa/Tunis"
  }
}
```

### 3️⃣ Format IMBRIQUÉ

Les objets imbriqués sont affichés au format JSON.

**Exemple - Appareils:**
```json
{
  "devices": {
    "device_001": {
      "name": "ESP32-001",
      "status": "online",
      "location": "Salle A",
      "sensors": {
        "temperature": 24.5,
        "humidity": 65
      }
    }
  }
}
```

---

## 🔧 Configuration dans Firebase Console

### Étape 1: Accéder à Realtime Database
1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. **Realtime Database** → **Créer une base de données**
4. Choisissez le mode **Test** (pour développement)

### Étape 2: Ajouter les données

**Exemple complet de structure:**

```
/
├── sensors
│   ├── 0
│   │   ├── id: "sensor_001"
│   │   ├── name: "Température"
│   │   ├── value: 24.5
│   │   └── unit: "°C"
│   └── 1
│       ├── id: "sensor_002"
│       ├── name: "Humidité"
│       ├── value: 65
│       └── unit: "%"
├── devices
│   ├── device_001
│   │   ├── name: "ESP32"
│   │   ├── status: "online"
│   │   └── location: "Salle"
├── logs
│   ├── 0
│   │   ├── timestamp: 1683626400
│   │   ├── message: "Démarrage système"
│   │   └── level: "info"
├── config
│   ├── version: "1.0.0"
│   ├── mode: "production"
│   └── updateInterval: 5000
└── stats
    ├── totalDevices: 5
    ├── onlineDevices: 4
    └── lastUpdate: "2025-05-09"
```

---

## 💻 Code: Comment ça marche

### 1. Initialisation automatique

```javascript
// Automatiquement appelé au chargement du dashboard
import { initializeRTDBListener } from './rtdb-loader.js';
```

### 2. Accès aux données depuis JavaScript

```javascript
// Importer les fonctions
import { realtimeData, getSection } from './js/rtdb-loader.js';

// Accéder aux données chargées
console.log(realtimeData.sensors);  // Tableau des capteurs
console.log(realtimeData.devices);  // Objet des appareils

// Obtenir une section spécifique (asynchrone)
const sensors = await getSection('sensors');
console.log(sensors);
```

### 3. Mettre à jour les données

```javascript
import { updateSection } from './js/rtdb-loader.js';

// Mettre à jour une section
await updateSection('sensors', [
  { id: 'sensor_001', name: 'Temp', value: 25 },
  { id: 'sensor_002', name: 'Humidity', value: 60 }
]);
```

---

## 🎨 Ajouter des sections personnalisées

### Dans le HTML

Ajoutez un nouveau conteneur:

```html
<!-- Dans #page-rtdb, ajoutez: -->
<div id="section-monAppli" class="rtdb-section">
  <div class="rtdb-section-title">Mon Application</div>
  <div class="rtdb-container">
    <!-- Données chargées dynamiquement -->
  </div>
</div>
```

### Dans Firebase

Créez la section correspondante:

```json
{
  "monAppli": {
    "status": "actif",
    "users": 150,
    "uptime": "99.9%"
  }
}
```

### Résultat

Le contenu apparaît automatiquement dans la section!

---

## 🚀 Cas d'usage courants

### 1. Afficher les données d'IoT

```json
{
  "sensors": [
    { "id": "temp", "name": "Température", "value": 22, "unit": "°C" },
    { "id": "humid", "name": "Humidité", "value": 45, "unit": "%" },
    { "id": "press", "name": "Pression", "value": 1013, "unit": "hPa" }
  ]
}
```

### 2. Afficher les statuts des appareils

```json
{
  "devices": {
    "ESP32_001": {
      "name": "Cuisine",
      "status": "online",
      "temperature": 23.5,
      "lastSeen": "2025-05-09T14:32:15Z"
    },
    "ESP32_002": {
      "name": "Salon",
      "status": "offline",
      "temperature": 21.0,
      "lastSeen": "2025-05-09T12:00:00Z"
    }
  }
}
```

### 3. Afficher les journaux

```json
{
  "logs": [
    {
      "timestamp": "2025-05-09T14:32:15Z",
      "level": "info",
      "message": "Capteur activé"
    },
    {
      "timestamp": "2025-05-09T14:31:00Z",
      "level": "warning",
      "message": "Batterie faible"
    }
  ]
}
```

---

## 📋 Règles de sécurité (IMPORTANT!)

Pour **production**, mettez à jour vos règles Firebase:

```json
{
  "rules": {
    "sensors": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "devices": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "logs": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "config": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "stats": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    }
  }
}
```

---

## 🐛 Dépannage

### Les données ne s'affichent pas?

1. **Vérifier la connexion Firebase:**
   ```javascript
   // Dans la console du navigateur
   console.log(firebase.database().ref('.info/connected'));
   ```

2. **Vérifier les données chargées:**
   ```javascript
   console.log(realtimeData);  // Doit contenir vos données
   ```

3. **Vérifier les conteneurs HTML:**
   - Assurez-vous que `<div id="section-sensors">` existe

### Les données ne se mettent pas à jour?

- Le système écoute automatiquement les changements
- Vérifiez que `initializeRTDBListener()` est appelé
- Vérifiez les permissions Firebase (Read/Write)

---

## 📚 Ressources

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Rules](https://firebase.google.com/docs/rules)
- [JavaScript SDK](https://firebase.google.com/docs/database/web/start)

---

## ✅ Checklist

- [ ] Configuration Firebase Realtime Database
- [ ] Structure des données dans Firebase
- [ ] Les conteneurs HTML avec les bons IDs existent
- [ ] La page "Données Firebase" apparaît dans le menu
- [ ] Les données s'affichent correctement
- [ ] Les permissions Firebase sont correctes
- [ ] Règles de sécurité configurées (production)

Vous avez maintenant un système complet pour afficher vos données Firebase! 🎉
