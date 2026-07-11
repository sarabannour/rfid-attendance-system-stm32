// ============================================================
// dashboard.js — Logique principale du tableau de bord
// ============================================================

import { db, rtdb } from './firebase-config.js';
import {
  collection, onSnapshot, query, orderBy, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, onValue, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let allRecords  = [];   // toutes les entrées Firestore
let operatorMap = {};   // { id: { name, totalHours } }
let rtdbReadings = []; // toutes les lectures Realtime Database

// Fixed list of operators
const operators = [
  { id: "EMP001", name: "Rachid" },
  { id: "EMP002", name: "Rania" },
  { id: "EMP003", name: "Rabia" },
  { id: "EMP004", name: "Leila" },
  { id: "EMP005", name: "Meriem" }
];

// Notification sound
let entrySoundUrl;
let entrySound;
try {
  entrySoundUrl = new URL('../sounds/entry.mp3', import.meta.url).href;
  entrySound = new Audio(entrySoundUrl);
} catch (err) {
  entrySoundUrl = 'sounds/entry.mp3';
  entrySound = new Audio(entrySoundUrl);
  console.warn('Fallback entry sound path used', entrySoundUrl, err);
}
entrySound.preload = 'auto';
entrySound.volume = 1;
entrySound.muted = false;
entrySound.load();
entrySound.addEventListener('error', (event) => {
  console.error('Entry sound failed to load', event, entrySound.src);
  updateSoundStatus('load-error');
});
entrySound.addEventListener('canplaythrough', () => {
  console.log('Entry sound loaded and ready to play', entrySound.src);
  updateSoundStatus('ready');
});
entrySound.addEventListener('play', () => {
  console.log('Entry sound play() started', entrySound.src);
  updateSoundStatus('playing');
});
entrySound.addEventListener('pause', () => {
  console.log('Entry sound paused');
  updateSoundStatus('paused');
});

function updateSoundStatus(message) {
  const el = document.getElementById('soundStatus');
  if (el) el.textContent = `son: ${message}`;
}

let audioContext = null;
function getAudioContext() {
  if (!audioContext) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    audioContext = new C();
  }
  return audioContext;
}

async function playBeep() {
  const context = getAudioContext();
  if (!context) {
    console.warn('No AudioContext available for fallback beep');
    return;
  }
  if (context.state === 'suspended') {
    try {
      await context.resume();
      console.log('AudioContext resumed for beep');
    } catch (err) {
      console.warn('AudioContext resume failed', err);
    }
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 600;
  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.3, context.currentTime);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.15);
  oscillator.onended = () => {
    gain.disconnect();
    oscillator.disconnect();
  };
}

// Track previous number of readings and last latest scan key
let lastReadingCount = 0;
let lastScanKey = '';
let audioUnlocked = false;

function unlockEntrySound(event) {
  if (audioUnlocked) return;
  console.log('Unlock audio event', event.type);
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    context.resume().then(() => {
      console.log('AudioContext resumed');
    }).catch(err => {
      console.warn('AudioContext resume failed', err);
    });
  }
  entrySound.play().then(() => {
    entrySound.pause();
    entrySound.currentTime = 0;
    audioUnlocked = true;
    console.log('Entry sound unlocked for playback');
    updateSoundStatus('unlocked');
  }).catch(err => {
    console.warn('Entry sound unlock failed', err);
    audioUnlocked = true;
    updateSoundStatus('unlock-failed');
  });
}

document.body.addEventListener('click', unlockEntrySound, { passive: true });
document.body.addEventListener('keydown', unlockEntrySound, { passive: true });
document.body.addEventListener('pointerdown', unlockEntrySound, { passive: true });
document.body.addEventListener('touchstart', unlockEntrySound, { passive: true });

// ──────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────
const pages    = { dashboard: 'Dashboard', operators: 'Opérateurs', presence: 'Présences', payslips: 'Fiches de paie', rtdb: 'Données Firebase' };
const pageTitleMap = { intro: 'Présentation du service', ...pages };
const menuBtn  = document.getElementById('menuBtn');
const backBtn  = document.getElementById('backBtn');
const refreshBtn = document.getElementById('refreshBtn');
const sidebar  = document.getElementById('sidebar');
let pageHistory = [];

console.log('dashboard initialized', { menuBtn: !!menuBtn, backBtn: !!backBtn, refreshBtn: !!refreshBtn, sidebar: !!sidebar });

function getActivePage() {
  const active = document.querySelector('.page.active');
  return active ? active.id.replace('page-', '') : null;
}

function updateBackButton() {
  if (!backBtn) return;
  backBtn.disabled = pageHistory.length === 0;
}

function activatePage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  document.getElementById('pageTitle').textContent = pageTitleMap[page] || page;
  if (page === 'payslips') buildPayslipSelects();
  if (page === 'presence') renderPresence();
  if (page === 'operators') renderOperators();
  if (window.innerWidth < 900) sidebar.classList.remove('open');
}

function navigateTo(page, push = true) {
  const current = getActivePage();
  if (push && current && current !== page) {
    pageHistory.push(current);
  }
  activatePage(page);
  updateBackButton();
}

function goBack() {
  const previous = pageHistory.pop();
  if (previous) {
    activatePage(previous);
  } else {
    activatePage('dashboard');
  }
  updateBackButton();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    console.log('menuBtn clicked');
    if (window.innerWidth < 900) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('closed');
    }
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    console.log('backBtn clicked');
    goBack();
  });
}

const enterDashboardBtn = document.getElementById('enterDashboardBtn');
if (enterDashboardBtn) {
  enterDashboardBtn.addEventListener('click', () => navigateTo('dashboard'));
}

updateBackButton();

// ──────────────────────────────────────────────
// DATE / CLOCK
// ──────────────────────────────────────────────
function updateDate() {
  const now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
updateDate();
setInterval(updateDate, 60000);

// ──────────────────────────────────────────────
// CONNECTION STATUS (Realtime Database ping)
// ──────────────────────────────────────────────
const connRef = ref(rtdb, '.info/connected');
onValue(connRef, snap => {
  const dot  = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  if (snap.val() === true) {
    dot.className  = 'status-dot online';
    text.textContent = 'Firebase connecté';
  } else {
    dot.className  = 'status-dot offline';
    text.textContent = 'Hors ligne';
  }
});

// ──────────────────────────────────────────────
// REFRESH BUTTON
// ──────────────────────────────────────────────
if (refreshBtn) {
  refreshBtn.addEventListener('click', function() {
    console.log('refreshBtn clicked');
    this.classList.add('spinning');
    setTimeout(() => {
      this.classList.remove('spinning');
      window.location.reload();
    }, 400);
  });
}

window.soundTestClick = async (event) => {
  console.log('soundTestClick called', event?.type);
  updateSoundStatus('button-clicked');
  if (!audioUnlocked) {
    console.log('Audio not unlocked yet, unlocking now');
    unlockEntrySound(event || new Event('click'));
  }
  updateSoundStatus('playing-beep');
  await playBeep();
  entrySound.currentTime = 0;
  entrySound.play().then(() => {
    console.log('MP3 sound test played successfully');
    updateSoundStatus('mp3-playing');
  }).catch(err => {
    console.error('MP3 sound test failed', err);
    updateSoundStatus('mp3-failed');
  });
};

const soundTestBtn = document.getElementById('soundTestBtn');
if (soundTestBtn) {
  console.log('soundTestBtn found', soundTestBtn);
  soundTestBtn.addEventListener('click', window.soundTestClick);
}

// ──────────────────────────────────────────────
// FIRESTORE LISTENER
// ──────────────────────────────────────────────
// Structure attendue dans Firestore — collection "operators"
// Chaque document : {
//   operatorId: "ID001",
//   name: "Maram Aribi",
//   entryTime: Timestamp,
//   exitTime: Timestamp | null,
//   status: "present" | "absent",
//   date: "2025-10-15"          // YYYY-MM-DD
// }

const q = query(collection(db, 'operators'), orderBy('entryTime', 'desc'));

onSnapshot(q, snapshot => {
  const firestoreData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Only use Firestore data if not in localhost OR if Firestore has data
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (firestoreData.length > 0 || !isLocalhost) {
    allRecords = firestoreData;
  }
  // If localhost and Firestore is empty, keep test data already loaded
  
  if (allRecords.length > 0) {
    buildOperatorMap();
    renderDashboard();
    renderOperators();
    renderPresence();
    if (getActivePage() === 'payslips') buildPayslipSelects();
  }
}, err => {
  console.error('Firestore error:', err);
  // In localhost with test data, don't show error
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost || allRecords.length === 0) {
    setConnectionError();
  }
});

// ──────────────────────────────────────────────
// REALTIME DATABASE LISTENER - Compter les opérateurs
// ──────────────────────────────────────────────
const usersDataRef = ref(rtdb, 'usersData');
const presenceUpdateInterval = 60000;

function parseDateTimeValue(value) {
  if (!value && value !== 0) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  // Numeric timestamp in seconds or milliseconds.
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) {
    if (/^\d{10}$/.test(raw)) {
      return new Date(asNumber * 1000);
    }
    return new Date(asNumber);
  }

  // Normalize common date/time formats
  const normalized = raw.replace(/\s+/g, 'T').replace(/\.(\d+)?$/, '').replace(/-/g, '-');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDurationFrom(date) {
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return '0m';
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatStatusBadge(status) {
  const normalized = String(status || '').trim();
  const cssClass = normalized.toLowerCase() === 'entry' ? 'status-entry' : 'status-exit';
  return `<span class="status-chip ${cssClass}">${normalized || '—'}</span>`;
}

function normalizeAttendanceStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  const entryValues = ['entry', 'entrée', 'entree', 'in', 'checkin', 'start', 'arrival', 'login'];
  const exitValues = ['exit', 'sortie', 'out', 'checkout', 'end', 'departure', 'logout'];
  if (entryValues.includes(normalized)) return 'entry';
  if (exitValues.includes(normalized)) return 'exit';
  return 'unknown';
}

function parseUsersDataEntries(data) {
  const readings = [];
  if (!data || typeof data !== 'object') return readings;
  Object.entries(data).forEach(([userId, userData]) => {
    const items = userData?.readings || userData;
    if (items && typeof items === 'object') {
      Object.entries(items).forEach(([readingId, reading]) => {
        const readingData = reading || {};
        const timeValue = parseDateTimeValue(readingData.time || readingData.date || readingData.timestamp);
        if (!timeValue) {
          return;
        }
        const status = normalizeAttendanceStatus(readingData.status || readingData.state || readingData.action || readingData.type);
        readings.push({
          uid: readingData.uid || userId || '—',
          name: readingData.name || readingData.fullName || readingData.username || userId || '—',
          status,
          entryTime: timeValue,
          time: timeValue
        });
      });
    }
  });
  return readings;
}

async function tryLoadAlternateUsersDataPath() {
  const altRef = ref(rtdb, 'UsersData');
  const snapshot = await get(altRef);
  if (!snapshot.exists()) return [];
  console.log('RTDB alternate path UsersData found');
  return parseUsersDataEntries(snapshot.val());
}

function renderActivityTable(records) {
  const body = document.getElementById('activityTableBody');
  if (!body) return;
  if (!records.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty-cell">Aucune activité</td></tr>';
    return;
  }
  body.innerHTML = records.map(r => {
    return `<tr>
      <td>${r.name || '—'}</td>
      <td>${formatStatusBadge(r.status)}</td>
      <td>${r.time ? r.time.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</td>
      <td><code style="font-family:'DM Mono',monospace">${r.uid || '—'}</code></td>
    </tr>`;
  }).join('');
}

function renderPresenceTodayTable(records) {
  const body = document.getElementById('presenceTodayBody');
  if (!body) return;
  if (!records.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucun enregistrement d\'entrée/sortie pour aujourd\'hui</td></tr>';
    return;
  }
  body.innerHTML = records.map(r => {
    const entryTime = r.entryTime ? r.entryTime.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' }) : '—';
    const exitTime = r.exitTime ? r.exitTime.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' }) : '—';
    const duration = r.exitTime ? formatDurationFrom(r.entryTime) : '—';
    const statusBadge = r.entryTime
      ? '<span class="badge badge-green">Présent</span>'
      : '<span class="badge badge-red">Absent</span>';
    return `<tr>
      <td>${r.name || '—'}</td>
      <td><code style="font-family:'DM Mono',monospace">${r.uid || '—'}</code></td>
      <td>${entryTime}</td>
      <td>${exitTime}</td>
      <td>${duration}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');
}

function computeTodayEntryCount(readings) {
  const today = todayStr();
  const unique = new Set();
  readings.forEach(r => {
    if (r.time && localDateStr(r.time) === today) {
      unique.add(`${r.name}|${r.uid}`);
    }
  });
  return unique.size;
}

function buildPresenceRows(readings) {
  const today = todayStr();

  const todayReadings = readings.filter(r =>
    r.time && localDateStr(r.time) === today
  );

  if (!todayReadings.length) return [];

  const entryMap = {};
  const exitMap = {};

  todayReadings.forEach(r => {
    const key = `${r.uid}|${r.name}`;

    if (r.status.toLowerCase() === 'entry') {
      if (!entryMap[key] || r.time > entryMap[key].time) {
        entryMap[key] = r;
      }
    }

    if (r.status.toLowerCase() === 'exit') {
      if (!exitMap[key] || r.time > exitMap[key].time) {
        exitMap[key] = r;
      }
    }
  });

  const result = [];

  // SEULS ceux qui ont une entrée sont présents
  Object.entries(entryMap).forEach(([key, entry]) => {
    const exit = exitMap[key];

    result.push({
      uid: entry.uid,
      name: entry.name,
      status: 'present',
      entryTime: entry.time,
      exitTime: exit ? exit.time : null
    });
  });

  return result.sort(
    (a, b) =>
      (b.entryTime?.getTime() || 0) -
      (a.entryTime?.getTime() || 0)
  );
}

onValue(usersDataRef, async snapshot => {
  console.log('RTDB onValue triggered', { exists: snapshot.exists() });
  let data = snapshot.val();
  console.log('RTDB snapshot received', { exists: snapshot.exists(), keys: data ? Object.keys(data) : null });
  rtdbReadings = parseUsersDataEntries(data);
  console.log('Parsed RTDB readings', rtdbReadings);

  if (!rtdbReadings.length) {
    const fallback = await tryLoadAlternateUsersDataPath();
    if (fallback.length) {
      rtdbReadings = fallback;
      console.log('Loaded fallback RTDB data, count:', rtdbReadings.length);
    }
  }

  // Ensure latest scan is first in the array for all render logic
  rtdbReadings.sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0));

  const latest = rtdbReadings[0];
  const latestKey = latest ? `${latest.uid}|${latest.time?.getTime()}|${latest.status}` : '';
  const isNewScan = (rtdbReadings.length > lastReadingCount) || (lastScanKey && latestKey !== lastScanKey);

  if (isNewScan && latest) {
    console.log('Triggering scan sound', { latest, latestKey, lastScanKey, lastReadingCount, currentCount: rtdbReadings.length, audioUnlocked });
    entrySound.currentTime = 0;
    entrySound.play().then(() => {
      console.log('Scan sound played successfully');
    }).catch(err => {
      console.error('Scan sound play failed', err);
      playBeep();
    });
  }

  lastScanKey = latestKey;
  lastReadingCount = rtdbReadings.length;
  if (allRecords.length === 0) {
    ensurePayslipSource();
  }
  if (getActivePage() === 'payslips') {
    buildPayslipSelects();
  }

  const presentCount = computeTodayEntryCount(rtdbReadings);
  document.getElementById('stat-total').textContent = String(operators.length);
  document.getElementById('stat-present').textContent = String(presentCount);
  document.getElementById('stat-hours').textContent = '7.0h';
  document.getElementById('stat-salary').textContent = '7500 DT';

  if (!rtdbReadings.length) {
    document.getElementById('activityTableBody').innerHTML = '<tr><td colspan="4" class="empty-cell">Aucune lecture RTDB trouvée. Vérifie le chemin usersData/{userId}/readings.</td></tr>';
    document.getElementById('presenceTodayBody').innerHTML = '<tr><td colspan="4" class="empty-cell">Aucune présence en cours trouvée.</td></tr>';
  } else {
    renderActivityTable(rtdbReadings.slice(0, 20));
    renderPresenceTodayTable(buildPresenceRows(rtdbReadings));
  }

// IMPORTANT: Update all pages live when RTDB data changes
console.log('RTDB data updated, re-rendering pages...', { rtdbReadingsCount: rtdbReadings.length });
console.log('Complete RTDB readings:', rtdbReadings);
renderDashboard();
renderOperators();
renderPresence();

if (getActivePage() === 'payslips') {
    buildPayslipSelects();
}
});

setInterval(() => {
  renderPresenceTodayTable(buildPresenceRows(rtdbReadings));
}, presenceUpdateInterval);

// ──────────────────────────────────────────────
// BUILD OPERATOR MAP (cumul des heures)
// ──────────────────────────────────────────────
function buildOperatorMap() {
  operatorMap = {};
  allRecords.forEach(r => {
    if (!operatorMap[r.operatorId]) {
      operatorMap[r.operatorId] = { name: r.name, totalHours: 0 };
    }
    if (r.entryTime && r.exitTime) {
      const h = calcHours(r.entryTime, r.exitTime);
      operatorMap[r.operatorId].totalHours += h;
    }
  });
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function localDateStr(date = new Date()) {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
}

function calcHours(entry, exit) {
  const e = toDate(entry), x = toDate(exit);
  if (!e || !x) return 0;
  return Math.max(0, (x - e) / 3600000);
}

function fmtTime(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseYMD(value) {
  if (!value && value !== 0) return null;
  
  // Handle Firestore Timestamp objects
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return localDateStr(value.toDate());
  }
  
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return cleaned.slice(0, 10);
    }
  }
  
  const date = toDate(value);
  if (!date || isNaN(date.getTime())) return null;
  return localDateStr(date);
}

function normalizeRecordDate(record) {
  // Try date field first, then entryTime
  const dateStr = parseYMD(record.date);
  if (dateStr) return dateStr;
  return parseYMD(record.entryTime) || '';
}

function buildRecordsFromRTDB(readings) {
  const grouped = {};
  readings.forEach(r => {
    if (!r.uid || !r.time) return;
    const day = localDateStr(r.time);
    const key = `${r.uid}|${day}`;
    if (!grouped[key]) {
      grouped[key] = { uid: r.uid, name: r.name, entries: [], exits: [], allTimes: [] };
    }
    const status = normalizeAttendanceStatus(r.status);
    grouped[key].allTimes.push(r.time);
    if (status === 'entry') {
      grouped[key].entries.push(r.time);
    } else if (status === 'exit') {
      grouped[key].exits.push(r.time);
    }
  });

  return Object.values(grouped).map(item => {
    const allTimes = item.allTimes;
    const entryTime = item.entries.length
      ? new Date(Math.min(...item.entries.map(d => d.getTime())))
      : allTimes.length
        ? new Date(Math.min(...allTimes.map(d => d.getTime())))
        : null;
    const exitTime = item.exits.length
      ? new Date(Math.max(...item.exits.map(d => d.getTime())))
      : allTimes.length
        ? new Date(Math.max(...allTimes.map(d => d.getTime())))
        : null;
    return {
      operatorId: item.uid,
      name: item.name || item.uid,
      date: localDateStr(entryTime) || localDateStr(exitTime) || '',
      entryTime,
      exitTime
    };
  });
}

function ensurePayslipSource() {
  if (allRecords.length > 0) return;
  const derived = buildRecordsFromRTDB(rtdbReadings);
  if (derived.length > 0) {
    allRecords = derived;
    console.log('Payslip records built from RTDB readings', { derivedCount: derived.length });
    buildOperatorMap();
  }
}

function todayStr() {
  return localDateStr(new Date());
}

function getAvatarColor(name = '') {
  const colors = [
    ['#4f8ef7','#1e2d4a'],['#34d398','#0f3324'],['#a78bfa','#2d1f4a'],
    ['#fbbf24','#3a2c08'],['#f87171','#3a1414'],['#38bdf8','#0f2a3a']
  ];
  const i = (name.charCodeAt(0) || 0) % colors.length;
  return colors[i];
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ──────────────────────────────────────────────
// DASHBOARD PAGE
// ──────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('stat-total').textContent   = String(operators.length);
  const presentEl = document.getElementById('stat-present');
  if (presentEl && (!presentEl.textContent || presentEl.textContent.trim() === '—')) {
    presentEl.textContent = '0';
  }
  document.getElementById('stat-hours').textContent   = '7.0h';
  document.getElementById('stat-salary').textContent  = '7500 DT';

  renderActivityTable(rtdbReadings.slice(0, 20));
  renderPresenceTodayTable(buildPresenceRows(rtdbReadings));
}

function renderActivity(records) {
  const el = document.getElementById('activityList');
  if (!records.length) { el.innerHTML = '<div class="empty-state">Aucune activité</div>'; return; }
  el.innerHTML = records.map(r => {
    const [fg, bg] = getAvatarColor(r.name);
    const action = r.exitTime
      ? `Sortie à ${fmtTime(r.exitTime)}`
      : `Entrée à ${fmtTime(r.entryTime)}`;
    return `<div class="activity-item">
      <div class="activity-avatar" style="background:${bg};color:${fg}">${initials(r.name)}</div>
      <div class="activity-info">
        <div class="activity-name">${r.name || 'Inconnu'}</div>
        <div class="activity-meta">${action}</div>
      </div>
      <div class="activity-time">${fmtDate(r.entryTime)}</div>
    </div>`;
  }).join('');
}

function renderPresenceChart(records) {
  const el = document.getElementById('presenceChart');
  if (!records.length) { el.innerHTML = '<div class="empty-state">Aucune donnée pour aujourd\'hui</div>'; return; }
  const maxH = Math.max(1, ...records.map(r => calcHours(r.entryTime, r.exitTime)));
  el.innerHTML = records.slice(0, 7).map(r => {
    const h = calcHours(r.entryTime, r.exitTime);
    const pct = ((h / maxH) * 100).toFixed(0);
    const [fg] = getAvatarColor(r.name);
    return `<div class="presence-bar-row">
      <div class="bar-label" title="${r.name}">${r.name?.split(' ')[0] || '?'}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${fg}"></div></div>
      <div class="bar-val">${h.toFixed(1)}h</div>
    </div>`;
  }).join('');
}

// ──────────────────────────────────────────────
// OPERATORS PAGE
// ──────────────────────────────────────────────
function renderOperators() {
  const search = document.getElementById('operatorSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('statusFilter')?.value || '';

  const today = todayStr();
  console.log('renderOperators DEBUG', { today, rtdbReadingsCount: rtdbReadings.length, rtdbReadings: rtdbReadings.map(r => ({ name: r.name, time: r.time, timeStr: r.time ? localDateStr(r.time) : 'no time' })) });

  let rows = operators.map(op => {
    // Chercher toutes les lectures RTDB pour cet opérateur
    const readings = rtdbReadings.filter(r =>
      r.uid === op.id ||
      String(r.name || '').toLowerCase() === String(op.name || '').toLowerCase()
    );

    // ✅ Filtrer uniquement les lectures d'aujourd'hui
    const todayReadings = readings.filter(r => {
      if (!r.time) return false;
      return localDateStr(r.time) === today;
    });

    const entries = todayReadings.filter(r => r.status.toLowerCase() === 'entry');
    const exits = todayReadings.filter(r => r.status.toLowerCase() === 'exit');

    const latestEntry = entries.length ? entries.sort((a, b) => b.time - a.time)[0] : null;
    const latestExit = exits.length ? exits.sort((a, b) => b.time - a.time)[0] : null;

    const isPresent = entries.length > 0;

    console.log(`Operator ${op.name}:`, { readingsCount: readings.length, todayReadingsCount: todayReadings.length, entriesCount: entries.length, isPresent });

    return {
      operatorId: op.id,
      name: op.name,
      present: isPresent,
      record: {
        entryTime: latestEntry ? latestEntry.time : null,
        exitTime: latestExit ? latestExit.time : null
      }
    };
  });

  rows = rows.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search) ||
      r.operatorId.toLowerCase().includes(search);
    const matchStatus = !status ||
      (status === 'present' && r.present) ||
      (status === 'absent' && !r.present);
    return matchSearch && matchStatus;
  });

  const tbody = document.getElementById('operatorsBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Aucun résultat</td></tr>'; return; }

  tbody.innerHTML = rows.map(r => {
    const isPresent = r.present;
    const badge = isPresent
      ? '<span class="badge badge-green">Présent</span>'
      : '<span class="badge badge-red">Absent</span>';
    const hours = calcHours(r.record?.entryTime, r.record?.exitTime);
    const [fg, bg] = getAvatarColor(r.name);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:30px;height:30px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${initials(r.name)}</div>
          ${r.name || 'Inconnu'}
        </div>
      </td>
      <td><code style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text2)">${r.operatorId || '—'}</code></td>
      <td>${badge}</td>
      <td>${r.record ? fmtTime(r.record.entryTime) : '—'}</td>
      <td>${r.record?.exitTime ? fmtTime(r.record.exitTime) : '—'}</td>
      <td><span style="font-family:'DM Mono',monospace">${hours > 0 ? hours.toFixed(2) + 'h' : '—'}</span></td>
      <td>
        <button class="btn-icon" title="Voir détails" onclick="showOperatorDetail('${r.operatorId}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('operatorSearch')?.addEventListener('input', renderOperators);
document.getElementById('statusFilter')?.addEventListener('change', renderOperators);

window.showOperatorDetail = (id) => {
  const records = allRecords.filter(r => r.operatorId === id);
  if (!records.length) return;
  // Switch to presence page and filter by this operator
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-page="presence"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-presence').classList.add('active');
  document.getElementById('pageTitle').textContent = 'Présences';
  document.getElementById('presenceSearch').value = id;
  renderPresence();
};

// ──────────────────────────────────────────────
// PRESENCE PAGE
// ──────────────────────────────────────────────
function renderPresence() {
  console.log('=== renderPresence called ===', { rtdbReadingsCount: rtdbReadings.length });

  const search = document.getElementById('presenceSearch')?.value.toLowerCase() || '';
  const date = document.getElementById('filterDate')?.value || '';

  // Construire les données de présence à partir de rtdbReadings
  const grouped = {};
  rtdbReadings.forEach(r => {
    if (!r.uid || !r.time) return;
    const day = localDateStr(r.time);
    const key = `${r.uid}|${day}`;
    
    if (!grouped[key]) {
      grouped[key] = { 
        uid: r.uid, 
        name: r.name, 
        date: day,
        entries: [], 
        exits: [] 
      };
    }
    
    if (r.status.toLowerCase() === 'entry') {
      grouped[key].entries.push(r.time);
    } else if (r.status.toLowerCase() === 'exit') {
      grouped[key].exits.push(r.time);
    }
  });

  // Transformer en rows avec entrée/sortie
  let rows = Object.values(grouped).map(item => {
    const entryTime = item.entries.length ? new Date(Math.min(...item.entries.map(d => d.getTime()))) : null;
    const sorted = [
      ...item.entries.map(time => ({ time, status: 'entry' })),
      ...item.exits.map(time => ({ time, status: 'exit' }))
    ].sort((a, b) => a.time - b.time);

    const unmatchedEntries = [];
    const matchedExits = [];
    sorted.forEach(r => {
      if (r.status === 'entry') {
        unmatchedEntries.push(r.time);
      } else if (r.status === 'exit' && unmatchedEntries.length) {
        unmatchedEntries.shift();
        matchedExits.push(r.time);
      }
    });

    const exitTime = matchedExits.length ? matchedExits[matchedExits.length - 1] : null;
    const complete = item.entries.length === item.exits.length && item.entries.length > 0 && matchedExits.length === item.exits.length;

    console.log(`${item.name} (${item.date}):`, {
      entriesCount: item.entries.length,
      exitsCount: item.exits.length,
      entryTime,
      exitTime,
      complete,
      unmatchedEntriesCount: unmatchedEntries.length,
      matchedExitsCount: matchedExits.length
    });

    return {
      operatorId: item.uid,
      name: item.name || item.uid,
      date: item.date,
      entryTime,
      exitTime,
      entriesCount: item.entries.length,
      exitsCount: item.exits.length,
      complete
    };
  });

  console.log('Rows from RTDB:', rows.length);

  // Appliquer les filtres
  rows = rows.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search) ||
      r.operatorId.toLowerCase().includes(search);
    const matchDate = !date || r.date === date;
    return matchSearch && matchDate;
  });

  console.log('Filtered rows:', rows);

  const tbody = document.getElementById('presenceBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Aucun enregistrement</td></tr>'; return; }

  tbody.innerHTML = rows.map(r => {
    const hours = calcHours(r.entryTime, r.exitTime);
    const badge = r.complete
      ? `<span class="badge badge-green">Complet</span>`
      : `<span class="badge badge-amber">Incomplet</span>`;
    return `<tr>
      <td>${r.date || fmtDate(r.entryTime)}</td>
      <td>${r.name || 'Inconnu'}</td>
      <td><code style="font-family:'DM Mono',monospace;font-size:12px">${r.operatorId || '—'}</code></td>
      <td>${fmtTime(r.entryTime)}</td>
      <td>${r.exitTime ? fmtTime(r.exitTime) : '—'}</td>
      <td><span style="font-family:'DM Mono',monospace">${hours > 0 ? hours.toFixed(2) + 'h' : '—'}</span></td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

document.getElementById('presenceSearch')?.addEventListener('input', renderPresence);
document.getElementById('filterDate')?.addEventListener('change', renderPresence);

// ──────────────────────────────────────────────
// PAYSLIPS PAGE
// ──────────────────────────────────────────────
function buildPayslipSelects() {
  ensurePayslipSource();
  // Extract unique months from all records
  const monthSet = new Set();
  allRecords.forEach(r => {
    const ymd = normalizeRecordDate(r);
    if (ymd && ymd.length >= 7) {
      monthSet.add(ymd.slice(0, 7));
    }
  });
  
  const months = Array.from(monthSet).sort().reverse();
  
  const mSel = document.getElementById('payMonthSelect');
  const cur  = mSel.value;
  mSel.innerHTML = '<option value="">Sélectionner le mois…</option>' +
    months.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${formatMonth(m)}</option>`).join('');

  // Operators
  const opSel = document.getElementById('payOperatorSelect');
  const curOp = opSel.value;
  opSel.innerHTML = '<option value="">Tous les opérateurs</option>' +
    Object.entries(operatorMap).map(([id, o]) =>
      `<option value="${id}" ${id === curOp ? 'selected' : ''}>${o.name} (${id})</option>`
    ).join('');
  
  console.log('Payslip selects built:', { allRecordsCount: allRecords.length, months, operatorMapCount: Object.keys(operatorMap).length });

  renderPayslips();
}

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function renderPayslips() {
  const month  = document.getElementById('payMonthSelect')?.value;
  const opId   = document.getElementById('payOperatorSelect')?.value;
  const rate   = Math.max(0, parseFloat(document.getElementById('hourlyRate')?.value || 10));
  const tbody  = document.getElementById('payslipBody');
  const totalHoursEl = document.getElementById('payslipTotalHours');
  const appliedRateEl = document.getElementById('payslipAppliedRate');
  const totalSalaryEl = document.getElementById('payslipTotalSalary');

  const resetTotals = () => {
    if (totalHoursEl) totalHoursEl.textContent = '—';
    if (appliedRateEl) appliedRateEl.textContent = '—';
    if (totalSalaryEl) totalSalaryEl.textContent = '—';
  };

  if (!month) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Sélectionnez un mois pour commencer</td></tr>';
    resetTotals();
    return;
  }

  const filtered = allRecords.filter(r => {
    const recordMonth = normalizeRecordDate(r).slice(0, 7);
    return recordMonth === month && (!opId || r.operatorId === opId);
  });

  // Aggregate by operator
  const agg = {};
  filtered.forEach(r => {
    const id = r.operatorId || 'Inconnu';
    if (!agg[id]) agg[id] = { name: r.name, hours: 0 };
    agg[id].hours += calcHours(r.entryTime, r.exitTime);
  });

  if (!Object.keys(agg).length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucune donnée pour ce mois</td></tr>';
    resetTotals();
    return;
  }

  let totalHours = 0;
  let totalSalary = 0;

  tbody.innerHTML = Object.entries(agg).map(([id, o]) => {
    const hours = o.hours;
    const salary = (hours * rate).toFixed(2);
    totalHours += hours;
    totalSalary += parseFloat(salary);
    return `<tr>
      <td>${o.name || 'Inconnu'}</td>
      <td><code style="font-family:'DM Mono',monospace;font-size:12px">${id}</code></td>
      <td><span style="font-family:'DM Mono',monospace">${hours.toFixed(2)}h</span></td>
      <td>${rate} DT/h</td>
      <td><strong style="color:var(--green)">${salary} DT</strong></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="printPayslip('${id}','${o.name}','${month}','${hours.toFixed(2)}','${rate}','${salary}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Générer
        </button>
      </td>
    </tr>`;
  }).join('');

  if (totalHoursEl) totalHoursEl.textContent = `${totalHours.toFixed(2)}h`;
  if (appliedRateEl) appliedRateEl.textContent = `${rate} DT/h`;
  if (totalSalaryEl) totalSalaryEl.textContent = `${totalSalary.toFixed(2)} DT`;
}

document.getElementById('payMonthSelect')?.addEventListener('change', renderPayslips);
document.getElementById('payOperatorSelect')?.addEventListener('change', renderPayslips);
document.getElementById('hourlyRate')?.addEventListener('input', renderPayslips);

// ──────────────────────────────────────────────
// PRINT PAYSLIP
// ──────────────────────────────────────────────
window.printPayslip = (id, name, month, hours, rate, salary) => {
  document.getElementById('print-name').textContent  = name || '—';
  document.getElementById('print-id').textContent    = id;
  document.getElementById('print-period').textContent = 'Période : ' + formatMonth(month);
  document.getElementById('print-hours').textContent = hours + ' h';
  document.getElementById('print-rate').textContent  = rate + ' DT/h';
  document.getElementById('print-gross').textContent = salary + ' DT';
  document.getElementById('print-total').textContent = salary + ' DT';
  document.getElementById('payslipModal').classList.add('open');
};

window.closeModal = () => {
  document.getElementById('payslipModal').classList.remove('open');
};

document.getElementById('payslipModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ──────────────────────────────────────────────
// PDF EXPORT
// ──────────────────────────────────────────────
window.exportToPDF = async () => {
  const btn = document.getElementById('exportPdfBtn');
  const originalText = btn.innerHTML;

  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-loading"></span>';

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Colors and styling
    const primaryColor = [79, 124, 255];
    const secondaryColor = [139, 92, 246];
    const lightGray = [248, 250, 252];
    const textColor = [31, 41, 55];

    // Get data from modal
    const name   = document.getElementById('print-name').textContent;
    const id     = document.getElementById('print-id').textContent;
    const period = document.getElementById('print-period').textContent;
    const hours  = document.getElementById('print-hours').textContent;
    const rate   = document.getElementById('print-rate').textContent;
    const gross  = document.getElementById('print-gross').textContent;
    const total  = document.getElementById('print-total').textContent;

    // Header with company info
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ESPWEB', 20, 20);

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Système de Gestion du Temps', 20, 30);

    // Document title
    doc.setTextColor(...textColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHE DE PAIE', 105, 60, { align: 'center' });

    // Employee information section
    doc.setFillColor(...lightGray);
    doc.rect(20, 75, 170, 35, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations Employé', 25, 88);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom: ${name}`, 25, 100);
    doc.text(`ID: ${id}`, 25, 108);
    doc.text(`${period}`, 25, 116);

    // Salary details section
    doc.setFillColor(...lightGray);
    doc.rect(20, 125, 170, 60, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Détails Salariaux', 25, 138);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Heures travaillées: ${hours}`, 25, 150);
    doc.text(`Taux horaire: ${rate}`, 25, 158);
    doc.text(`Salaire brut: ${gross}`, 25, 166);
    doc.text(`Salaire net: ${total}`, 25, 174);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Document généré automatiquement par ESPWEB', 105, 280, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 105, 285, { align: 'center' });

    // Generate filename
    const filename = `fiche_paie_${name.replace(/\s+/g, '_')}_${localDateStr(new Date())}.pdf`;

    // Save the PDF
    doc.save(filename);

  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

// Export PDF button event
document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);

// ──────────────────────────────────────────────
// ERROR STATE
// ──────────────────────────────────────────────
function setConnectionError() {
  ['operatorsBody', 'presenceBody', 'payslipBody'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<tr><td colspan="7" class="empty-cell" style="color:var(--red)">
      Erreur de connexion Firebase. Vérifiez la configuration.
    </td></tr>`;
  });
}

// ──────────────────────────────────────────────
// TEST MODE - Initialize test data after everything is loaded
// ──────────────────────────────────────────────
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.addEventListener('load', () => {
    // Mock Firebase data using correct field names (entryTime / exitTime)
    allRecords = [
      {
        id: 'rec001', operatorId: 'EMP001', name: 'Alice Dupont',
        entryTime: new Date('2026-05-01T08:00:00'),
        exitTime:  new Date('2026-05-01T16:00:00'),
        status: 'present', date: '2026-05-01'
      },
      {
        id: 'rec002', operatorId: 'EMP002', name: 'Bob Martin',
        entryTime: new Date('2026-05-01T09:00:00'),
        exitTime:  new Date('2026-05-01T16:30:00'),
        status: 'present', date: '2026-05-01'
      },
      {
        id: 'rec003', operatorId: 'EMP003', name: 'Claire Bernard',
        entryTime: new Date('2026-05-01T07:30:00'),
        exitTime:  new Date('2026-05-01T16:00:00'),
        status: 'present', date: '2026-05-01'
      },
      {
        id: 'rec004', operatorId: 'EMP001', name: 'Alice Dupont',
        entryTime: new Date('2026-05-02T08:15:00'),
        exitTime:  new Date('2026-05-02T17:00:00'),
        status: 'present', date: '2026-05-02'
      },
      {
        id: 'rec005', operatorId: 'EMP002', name: 'Bob Martin',
        entryTime: new Date('2026-05-02T09:30:00'),
        exitTime:  new Date('2026-05-02T17:15:00'),
        status: 'present', date: '2026-05-02'
      },
      {
        id: 'rec006', operatorId: 'EMP003', name: 'Claire Bernard',
        entryTime: new Date('2026-05-03T07:45:00'),
        exitTime:  new Date('2026-05-03T16:30:00'),
        status: 'present', date: '2026-05-03'
      }
    ];

    buildOperatorMap();
    navigateTo('dashboard');
  });
}
