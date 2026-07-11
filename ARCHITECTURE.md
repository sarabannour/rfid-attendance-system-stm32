# 🏗️ Architecture Diagram

## System Flow

```
Firebase Realtime Database
        ↓
    [RTDB Data]
        │
        ├── sensors: [...]
        ├── devices: {...}
        ├── logs: [...]
        ├── config: {...}
        └── stats: {...}
        ↓
rtdb-loader.js
        ↓
    [realtimeData = {
      sensors: [...],
      devices: {...},
      logs: [...],
      config: {...},
      stats: {...}
    }]
        ↓
displayAllSections()
        ↓
    ┌───────────────────────────────────┐
    │    HTML Page Containers           │
    ├───────────────────────────────────┤
    │ #section-sensors    ← <div>Data</div> │
    │ #section-devices    ← <div>Data</div> │
    │ #section-logs       ← <div>Data</div> │
    │ #section-config     ← <div>Data</div> │
    │ #section-stats      ← <div>Data</div> │
    └───────────────────────────────────┘
        ↓
    🎨 Styled Display
        ↓
    User sees data on page!
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ESPWEB Dashboard                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │         Dashboard (dashboard.js)                │   │
│  │  - Navigation                                   │   │
│  │  - Page management                              │   │
│  │  - Operators, Presence, Payslips               │   │
│  └────────────────────────────────────────────────┘   │
│                        ↑                                │
│  ┌────────────────────────────────────────────────┐   │
│  │      RTDB Data Display (rtdb-loader.js)         │   │
│  │  - Listen to Firebase changes                   │   │
│  │  - Format and display data                      │   │
│  │  - Update sections automatically                │   │
│  └────────────────────────────────────────────────┘   │
│                        ↑                                │
│  ┌────────────────────────────────────────────────┐   │
│  │         Firebase Config & Auth                  │   │
│  │  - Authentication (Firestore)                   │   │
│  │  - Realtime Database (RTDB)                     │   │
│  └────────────────────────────────────────────────┘   │
│                        ↑                                │
│  ┌────────────────────────────────────────────────┐   │
│  │      Firebase Cloud Services                    │   │
│  │  - Firestore (Operators data)                   │   │
│  │  - Realtime Database (Sensors, Devices, Logs)  │   │
│  │  - Authentication                              │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────┐
│    Firebase Console                 │
│  (Add/Edit Data)                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│   Realtime Database                 │
│  {                                  │
│    sensors: [...],                  │
│    devices: {...},                  │
│    logs: [...],                     │
│    config: {...},                   │
│    stats: {...}                     │
│  }                                  │
└────────────┬────────────────────────┘
             │
             ↓ (onValue listener)
┌─────────────────────────────────────┐
│   rtdb-loader.js                    │
│  realtimeData = {...}               │
│  displayAllSections()               │
└────────────┬────────────────────────┘
             │
             ├─────────────┬─────────────┬──────────┬─────────┐
             ↓             ↓             ↓          ↓         ↓
      ┌──────────────┐  ┌────────────┐  ┌────────┐ ┌──────┐ ┌────────┐
      │section-      │  │section-    │  │section-│ │section│ │section-│
      │sensors       │  │devices     │  │logs    │ │config │ │stats   │
      │              │  │            │  │        │ │       │ │        │
      │[Cards Grid]  │  │[Cards Grid]│  │[Cards] │ │[List] │ │[List]  │
      └──────────────┘  └────────────┘  └────────┘ └──────┘ └────────┘
             │             │             │          │         │
             └─────────────┴─────────────┴──────────┴─────────┘
                           │
                           ↓
                   User sees styled
                   data on page! ✨
```

---

## File Structure

```
ESPWEB/
├── public/
│   ├── index.html
│   │   └── Pages:
│   │       ├── dashboard (existing)
│   │       ├── operators (existing)
│   │       ├── presence (existing)
│   │       ├── payslips (existing)
│   │       └── rtdb ← NEW
│   │           ├── #section-sensors
│   │           ├── #section-devices
│   │           ├── #section-logs
│   │           ├── #section-config
│   │           └── #section-stats
│   │
│   ├── css/
│   │   └── style.css (+ RTDB styles)
│   │
│   ├── js/
│   │   ├── firebase-config.js
│   │   ├── dashboard.js (+ rtdb-loader import)
│   │   ├── auth.js
│   │   ├── rtdb-loader.js ← NEW
│   │   └── firebase-sample-data.js ← NEW
│   │
│   └── assets/
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
│
├── FIREBASE_RTDB_GUIDE.md ← NEW
├── SETUP_SUMMARY.md ← NEW
└── QUICK_REFERENCE.md ← NEW
```

---

## Data Transformation Example

### Input (Firebase):
```json
{
  "sensors": [
    { "id": "s1", "name": "Temp", "value": 25 },
    { "id": "s2", "name": "Humid", "value": 65 }
  ]
}
```

### Processing:
```javascript
// rtdb-loader.js recognizes array format
// Calls displayArray(container, 'sensors', data)
// Generates HTML for each item
```

### Output (HTML):
```html
<div class="data-item">
  <div class="item-header">sensors #1</div>
  <div class="item-content">
    <div class="data-row">
      <strong>id:</strong> <span>s1</span>
    </div>
    <div class="data-row">
      <strong>name:</strong> <span>Temp</span>
    </div>
    <div class="data-row">
      <strong>value:</strong> <span>25</span>
    </div>
  </div>
</div>
<!-- Next item... -->
```

### Display:
```
┌─────────────────────┐
│ sensors #1          │ ← styled card
├─────────────────────┤
│ id: s1              │
│ name: Temp          │
│ value: 25           │
└─────────────────────┘
```

---

## Real-time Update Flow

```
Time: 0ms
└─ Firebase data: sensors = [{id: 's1', value: 25}]
└─ Display shows: Temp: 25

Time: 100ms
└─ User changes Firebase: value = 26
└─ onValue listener triggered
└─ realtimeData updates
└─ displayAllSections() called
└─ #section-sensors container updated
└─ Display shows: Temp: 26 ✨ (automatically!)
```

---

## Security Architecture

```
┌──────────────────────────┐
│   User Authentication    │
│   (Email/Password)       │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│   Firebase Security Rules        │
│   - Read: auth != null           │
│   - Write: admin check           │
│   - Restrict per section         │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│   Realtime Database Access       │
│   (Only permitted operations)    │
└──────────────────────────────────┘
```

---

## Integration Points

```
┌─────────────────────────┐
│  Existing Dashboard     │
├─────────────────────────┤
│  ✓ Authentication       │
│  ✓ Navigation          │
│  ✓ Firestore (Operators)│
│  └─ Firebase config    │
└────────┬────────────────┘
         │
         ↓ Extends with
         │
┌─────────────────────────┐
│  RTDB Display System    │
├─────────────────────────┤
│  ✓ Realtime listening   │
│  ✓ Data formatting      │
│  ✓ Display rendering    │
│  └─ Uses same Firebase  │
└─────────────────────────┘
```

---

## Navigation Integration

```
Sidebar Menu
├── Vue d'ensemble (dashboard) ← existing
├── Opérateurs (operators) ← existing
├── Présences (presence) ← existing
├── Fiches de paie (payslips) ← existing
└── Données Firebase (rtdb) ← NEW ✨
    └─ Shows 5 sections:
       ├─ Sensors
       ├─ Devices
       ├─ Logs
       ├─ Config
       └─ Stats
```

---

**All components integrate seamlessly with your existing Firebase setup!** 🚀
