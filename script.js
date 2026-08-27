// Satu Amal Indonesia — NTT Response Command Center
// Versi perbaikan koneksi Google Apps Script / Google Sheets.
//
// PENTING:
// 1. API_URL harus menunjuk ke URL Web App Apps Script yang berakhiran /exec.
// 2. Versi ini mencoba fetch() terlebih dahulu.
// 3. Jika browser memblokir CORS, versi ini mencoba JSONP.
// 4. Agar fallback JSONP bekerja, doGet() Apps Script harus mendukung parameter ?callback=...

const API_URL = 'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const charts = {};

function money(n) {
  return IDR.format(Number(n) || 0);
}

function shortMoney(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return 'Rp' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (n >= 1e6) return 'Rp' + (n / 1e6).toFixed(1).replace('.', ',') + ' Jt';
  return money(n);
}

function pct(n) {
  n = Number(n) || 0;
  return (n * 100).toFixed((n * 100) % 1 ? 1 : 0).replace('.', ',') + '%';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

function setStatus(ok, text) {
  const dot = document.getElementById('statusDot');
  const status = document.getElementById('statusText');

  if (dot) {
    dot.style.background =
      ok === true ? '#16803c' :
      ok === false ? '#b42318' :
      '#999';
  }

  if (status) status.textContent = text;
}

function clearDashboard() {
  const ids = [
    'total', 'transactions', 'donors', 'today',
    'weeklyText', 'weeklyPct', 'weeklyRemaining',
    'overallText', 'overallPct', 'overallRemaining'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'transactions' || id === 'donors') el.textContent = '0';
      else if (id === 'weeklyPct' || id === 'overallPct') el.textContent = '0%';
      else el.textContent = 'Rp0';
    }
  });

  ['weeklyBar', 'overallBar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = '0%';
  });

  const recent = document.getElementById('recent');
  if (recent) {
    recent.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:24px;color:#777">
          Belum ada data yang dapat ditampilkan.
        </td>
      </tr>`;
  }
}

async function getDataByFetch() {
  const url = API_URL + (API_URL.includes('?') ? '&' : '?') + 't=' + Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Respons API bukan JSON yang valid');
    }

    if (!data || data.ok !== true) {
      throw new Error(data?.error || 'API mengembalikan error');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// Fallback JSONP untuk browser yang memblokir CORS.
// Apps Script harus mengembalikan:
// callback({...JSON...});
function getDataByJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName =
      '__satuAmalDashboard_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    const script = document.createElement('script');
    let finished = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[callbackName];
      } catch (_) {
        window[callbackName] = undefined;
      }
    };

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 15000);

    window[callbackName] = data => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();

      if (!data || data.ok !== true) {
        reject(new Error(data?.error || 'API JSONP mengembalikan error'));
        return;
      }

      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('JSONP gagal dimuat'));
    };

    const separator = API_URL.includes('?') ? '&' : '?';
    script.src =
      API_URL +
      separator +
      'callback=' + encodeURIComponent(callbackName) +
      '&t=' + Date.now();

    document.head.appendChild(script);
  });
}

async function load() {
  if (!API_URL || API_URL.includes('PASTE_')) {
    setStatus(false, 'API belum dipasang');
    clearDashboard();
    return;
  }

  setStatus(null, 'Menghubungkan ke Google Sheets...');

  try {
    let data;

    // Jalur utama.
    try {
      data = await getDataByFetch();
    } catch (fetchError) {
      console.warn('Fetch gagal, mencoba JSONP:', fetchError);

      // Jalur cadangan jika CORS diblokir.
      data = await getDataByJsonp();
    }

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
    console.error('Dashboard gagal mengambil data:', e);

    setStatus(
      false,
      'Gagal terhubung ke Google Sheets'
    );

    // Tetap tampilkan data nol agar dashboard tidak rusak.
    clearDashboard();
  }
}

function render(d) {
  const s = d.summary || {};

  const total = Number(s.total) || 0;
  const transactions = Number(s.transactions) || 0;
  const uniqueDonors = Number(s.uniqueDonors) || 0;
  const todayTotal = Number(s.todayTotal) || 0;

  const weeklyProgress = Number(s.weeklyProgress) || 0;
  const weeklyRemaining = Number(s.weeklyRemaining) || 0;

  const overallProgress = Number(s.overallProgress) || 0;
  const overallRemaining = Number(s.overallRemaining) || 0;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setWidth = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min(Math.max(value, 0), 100) + '%';
  };

  setText('total', money(total));
  setText('transactions', transactions.toLocaleString('id-ID'));
  setText('donors', uniqueDonors.toLocaleString('id-ID'));
  setText('today', money(todayTotal));

  setText('weeklyText', shortMoney(total) + ' / Rp200 Juta');
  setText('weeklyPct', pct(weeklyProgress));
  setWidth('weeklyBar', weeklyProgress * 100);
  setText(
    'weeklyRemaining',
    weeklyRemaining > 0 ? 'Sisa ' + money(weeklyRemaining) : 'Target tercapai'
  );

  setText('overallText', shortMoney(total) + ' / Rp1 Miliar');
  setText('overallPct', pct(overallProgress));
  setWidth('overallBar', overallProgress * 100);
  setText(
    'overallRemaining',
    overallRemaining > 0 ? 'Sisa ' + money(overallRemaining) : 'Target tercapai'
  );

  renderChart('reffChart', 'bar', Array.isArray(d.byReff) ? d.byReff.slice().reverse() : [], 'Kanal');
  renderChart('jenisChart', 'doughnut', Array.isArray(d.byJenis) ? d.byJenis : [], 'Jenis');
  renderChart('dateChart', 'line', Array.isArray(d.byDate) ? d.byDate.slice().reverse() : [], 'Tanggal');

  renderRecent(Array.isArray(d.recent) ? d.recent : []);

  setText(
    'updated',
    'Update: ' +
    new Date(d.generatedAt || Date.now()).toLocaleString('id-ID')
  );
}

function renderRecent(rows) {
  const table = document.getElementById('recent');
  if (!table) return;

  if (!rows.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:24px;color:#777">
          Belum ada transaksi.
        </td>
      </tr>`;
    return;
  }

  table.innerHTML = rows.map(r => `
    <tr>
      <td>${esc((r.tanggal || '') + ' ' + (r.waktu || ''))}</td>
      <td>${esc(r.nama)}</td>
      <td><b>${money(r.nominal)}</b></td>
      <td>${esc(r.reff)}</td>
      <td>${esc(r.jenis)}</td>
      <td>${esc(r.pic)}</td>
    </tr>
  `).join('');
}

function renderChart(id, type, items, label) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === 'undefined') return;

  if (charts[id]) {
    charts[id].destroy();
  }

  const safeItems = items || [];
  const isDate = id === 'dateChart';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'doughnut'
      }
    },
    scales: type === 'doughnut'
      ? {}
      : {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => shortMoney(value)
            }
          },
          x: {
            ticks: {
              maxRotation: 0
            }
          }
        }
  };

  const parent = canvas.parentElement;
  if (parent) {
    canvas.style.height = '280px';
  }

  const dataset = {
    label: 'Nominal',
    data: safeItems.map(x => Number(x.nominal) || 0),
    borderWidth: 2,
    tension: 0.25
  };

  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels: safeItems.map(x => x.label || ''),
      datasets: [dataset]
    },
    options
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const refresh = document.getElementById('refreshBtn');

  if (refresh) {
    refresh.addEventListener('click', () => {
      load();
    });
  }

  load();

  // Refresh otomatis setiap 60 detik.
  setInterval(load, 60000);
});
