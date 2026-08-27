// ============================================================
// SATU AMAL INDONESIA — NTT RESPONSE COMMAND CENTER
// Dashboard Penghimpunan Donasi — Google Apps Script JSONP
// ============================================================

// URL Web App Google Apps Script
const API_URL =
  'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGdGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const charts = {};

// ============================================================
// FORMAT ANGKA
// ============================================================

function money(n) {
  return IDR.format(Number(n) || 0);
}

function shortMoney(n) {
  n = Number(n) || 0;

  if (n >= 1e9) {
    return 'Rp' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
  }

  if (n >= 1e6) {
    return 'Rp' + (n / 1e6).toFixed(1).replace('.', ',') + ' Jt';
  }

  if (n >= 1e3) {
    return 'Rp' + Math.round(n / 1e3) + ' Rb';
  }

  return money(n);
}

function pct(n) {
  n = Number(n) || 0;
  return (n * 100)
    .toFixed(n * 100 % 1 ? 1 : 0)
    .replace('.', ',') + '%';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// ============================================================
// STATUS DASHBOARD
// ============================================================

function setStatus(ok, text) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (dot) {
    dot.style.background =
      ok === true
        ? '#222'
        : ok === false
        ? '#b42318'
        : '#999';
  }

  if (statusText) {
    statusText.textContent = text;
  }
}

// ============================================================
// LOAD DATA DENGAN JSONP
// Tidak menggunakan fetch() agar tidak terkena masalah CORS
// dari Google Apps Script.
// ============================================================

function load() {
  if (API_URL.includes('PASTE_')) {
    setStatus(false, 'API belum dipasang');
    return;
  }

  setStatus(null, 'Memuat data...');

  const callbackName =
    '__satuAmalDashboard_' + Date.now();

  const script = document.createElement('script');

  const timeout = setTimeout(function () {
    cleanup();
    setStatus(false, 'Gagal memuat data');
    console.error('Timeout: Google Apps Script tidak merespons.');
  }, 15000);

  function cleanup() {
    clearTimeout(timeout);

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

    try {
      delete window[callbackName];
    } catch (e) {
      window[callbackName] = undefined;
    }
  }

  window[callbackName] = function (data) {
    cleanup();

    if (!data || data.ok !== true) {
      console.error('API Error:', data);
      setStatus(false, 'Gagal memuat data');
      return;
    }

    try {
      render(data);

      const generated = data.generatedAt
        ? new Date(data.generatedAt)
        : new Date();

      setStatus(
        true,
        'Live • ' +
          generated.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
      );
    } catch (e) {
      console.error('Render Error:', e);
      setStatus(false, 'Gagal menampilkan data');
    }
  };

  script.onerror = function () {
    cleanup();
    setStatus(false, 'Gagal terhubung ke Google Sheets');
    console.error('Google Apps Script tidak dapat diakses.');
  };

  script.src =
    API_URL +
    '?callback=' +
    encodeURIComponent(callbackName) +
    '&t=' +
    Date.now();

  document.head.appendChild(script);
}

// ============================================================
// RENDER DATA UTAMA
// ============================================================

function render(d) {
  const s = d.summary || {};

  // ----------------------------------------------------------
  // KARTU UTAMA
  // ----------------------------------------------------------

  const totalEl = document.getElementById('total');
  const transactionsEl = document.getElementById('transactions');
  const donorsEl = document.getElementById('donors');
  const todayEl = document.getElementById('today');

  if (totalEl) {
    totalEl.textContent = money(s.total);
  }

  if (transactionsEl) {
    transactionsEl.textContent =
      Number(s.transactions || 0).toLocaleString('id-ID');
  }

  if (donorsEl) {
    donorsEl.textContent =
      Number(s.uniqueDonors || 0).toLocaleString('id-ID');
  }

  if (todayEl) {
    todayEl.textContent = money(s.todayTotal);
  }

  // ----------------------------------------------------------
  // TARGET 1 PEKAN
  // ----------------------------------------------------------

  const weeklyText = document.getElementById('weeklyText');
  const weeklyPct = document.getElementById('weeklyPct');
  const weeklyBar = document.getElementById('weeklyBar');
  const weeklyRemaining =
    document.getElementById('weeklyRemaining');

  if (weeklyText) {
    weeklyText.textContent =
      shortMoney(s.total) + ' / Rp200 Juta';
  }

  if (weeklyPct) {
    weeklyPct.textContent = pct(s.weeklyProgress);
  }

  if (weeklyBar) {
    weeklyBar.style.width =
      Math.min(Number(s.weeklyProgress || 0) * 100, 100) + '%';
  }

  if (weeklyRemaining) {
    weeklyRemaining.textContent =
      Number(s.weeklyRemaining || 0) > 0
        ? 'Sisa ' + money(s.weeklyRemaining)
        : 'Target tercapai';
  }

  // ----------------------------------------------------------
  // TARGET RESPONS NTT — 2 BULAN
  // ----------------------------------------------------------

  const overallText = document.getElementById('overallText');
  const overallPct = document.getElementById('overallPct');
  const overallBar = document.getElementById('overallBar');
  const overallRemaining =
    document.getElementById('overallRemaining');

  if (overallText) {
    overallText.textContent =
      shortMoney(s.total) + ' / Rp1 Miliar';
  }

  if (overallPct) {
    overallPct.textContent = pct(s.overallProgress);
  }

  if (overallBar) {
    overallBar.style.width =
      Math.min(Number(s.overallProgress || 0) * 100, 100) + '%';
  }

  if (overallRemaining) {
    overallRemaining.textContent =
      Number(s.overallRemaining || 0) > 0
        ? 'Sisa ' + money(s.overallRemaining)
        : 'Target tercapai';
  }

  // ----------------------------------------------------------
  // CHART
  // ----------------------------------------------------------

  if (Array.isArray(d.byReff)) {
    renderChart(
      'reffChart',
      'bar',
      d.byReff.slice().reverse(),
      'Kanal'
    );
  }

  if (Array.isArray(d.byJenis)) {
    renderChart(
      'jenisChart',
      'doughnut',
      d.byJenis,
      'Jenis'
    );
  }

  if (Array.isArray(d.byDate)) {
    renderChart(
      'dateChart',
      'line',
      d.byDate.slice().reverse(),
      'Tanggal'
    );
  }

  // ----------------------------------------------------------
  // TABEL DONASI TERBARU
  // ----------------------------------------------------------

  const recentEl = document.getElementById('recent');

  if (recentEl && Array.isArray(d.recent)) {
    recentEl.innerHTML = d.recent
      .map(function (r) {
        return `
          <tr>
            <td>
              ${esc(
                (r.tanggal || '') +
                ' ' +
                (r.waktu || '')
              )}
            </td>

            <td>
              ${esc(r.nama || '')}
            </td>

            <td>
              <b>${money(r.nominal)}</b>
            </td>

            <td>
              ${esc(r.reff || '')}
            </td>

            <td>
              ${esc(r.jenis || '')}
            </td>

            <td>
              ${esc(r.pic || '')}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ----------------------------------------------------------
  // WAKTU UPDATE
  // ----------------------------------------------------------

  const updatedEl = document.getElementById('updated');

  if (updatedEl) {
    updatedEl.textContent =
      'Update: ' +
      new Date(
        d.generatedAt || Date.now()
      ).toLocaleString('id-ID');
  }
}

// ============================================================
// CHART
// ============================================================

function renderChart(id, type, items, label) {
  const canvas = document.getElementById(id);

  if (!canvas) {
    console.warn('Canvas tidak ditemukan:', id);
    return;
  }

  // Hapus chart lama
  if (charts[id]) {
    try {
      charts[id].destroy();
    } catch (e) {
      console.warn('Gagal destroy chart:', id, e);
    }
  }

  const isDate = id === 'dateChart';

  const opts = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: type === 'doughnut'
      },

      tooltip: {
        callbacks: {
          label: function (context) {
            return money(context.raw);
          }
        }
      }
    },

    scales:
      type === 'doughnut'
        ? {}
        : {
            y: {
              beginAtZero: true,

              ticks: {
                callback: function (v) {
                  return shortMoney(v);
                }
              }
            },

            x: {
              ticks: {
                maxRotation: 0,
                autoSkip: true
              }
            }
          }
  };

  // Tinggi chart
  const parent = canvas.parentElement;

  if (parent) {
    canvas.style.height = isDate
      ? '280px'
      : '280px';
  }

  charts[id] = new Chart(canvas, {
    type: type,

    data: {
      labels: items.map(function (x) {
        return x.label;
      }),

      datasets: [
        {
          label: 'Nominal',

          data: items.map(function (x) {
            return Number(x.nominal) || 0;
          }),

          borderWidth: 2,
          tension: 0.25
        }
      ]
    },

    options: opts
  });
}

// ============================================================
// REFRESH BUTTON
// ============================================================

const refreshBtn = document.getElementById('refreshBtn');

if (refreshBtn) {
  refreshBtn.addEventListener('click', function () {
    load();
  });
}

// ============================================================
// LOAD PERTAMA
// ============================================================

load();

// ============================================================
// AUTO REFRESH SETIAP 60 DETIK
// ============================================================

setInterval(function () {
  load();
}, 60000);
