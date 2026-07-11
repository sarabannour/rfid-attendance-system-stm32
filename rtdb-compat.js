// ============================================================
// rtdb-compat.js — Lecture Firebase Realtime Database compat v10
// =============================================

const firebaseConfig = {
  apiKey:            "putyours",
  authDomain:        "putyours",
  databaseURL:       "putyours",
  projectId:         ".",
  storageBucket:     ".",
  messagingSenderId: "..",
  appId:             ".0"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);
const usersDataRef = db.ref('usersData');

const tableBody = document.getElementById('rtdbTableBody');
const uniqueCountEl = document.getElementById('uniqueOperatorCount');

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function buildStatusChip(status) {
  const normalized = String(status || '').trim();
  const cls = normalized.toLowerCase() === 'entry' ? 'status-entry' : 'status-exit';
  return `<span class="status-chip ${cls}">${normalized}</span>`;
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    const aTime = new Date(a.time).getTime() || 0;
    const bTime = new Date(b.time).getTime() || 0;
    return bTime - aTime;
  });
}

function renderRTDB(entries) {
  if (!tableBody) return;
  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-cell">Aucune lecture trouvée</td></tr>';
    if (uniqueCountEl) uniqueCountEl.textContent = '0 opérateurs uniques';
    return;
  }

  const uniqueNames = new Set(entries.map(e => e.name).filter(Boolean));
  if (uniqueCountEl) {
    uniqueCountEl.textContent = `${uniqueNames.size} opérateur${uniqueNames.size > 1 ? 's' : ''} uniques`;
  }

  tableBody.innerHTML = entries.map(entry => {
    return `<tr>
      <td>${entry.name || '—'}</td>
      <td>${buildStatusChip(entry.status)}</td>
      <td>${formatDateTime(entry.time)}</td>
      <td>${entry.uid || '—'}</td>
    </tr>`;
  }).join('');
}

function listenUsersData() {
  if (!usersDataRef) return;
  usersDataRef.on('value', snapshot => {
    const data = snapshot.val();
    const entries = [];

    if (data && typeof data === 'object') {
      Object.entries(data).forEach(([userId, userData]) => {
        const readings = userData?.readings;
        if (readings && typeof readings === 'object') {
          Object.entries(readings).forEach(([readingId, reading]) => {
            entries.push({
              name: reading?.name || '—',
              status: reading?.status || reading?.state || '—',
              time: reading?.time || reading?.date || reading?.timestamp || '—',
              uid: reading?.uid || userId || '—'
            });
          });
        }
      });
    }

    renderRTDB(sortEntries(entries));
  }, error => {
    console.error('RTDB compat error:', error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" class="empty-cell">Erreur récupération données: ${error.message || error}</td></tr>`;
    }
  });
}

window.addEventListener('load', listenUsersData);