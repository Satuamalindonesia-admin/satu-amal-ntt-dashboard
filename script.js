// ============================================================
// SATU AMAL INDONESIA — NTT RESPONSE COMMAND CENTER
// ============================================================

const API_URL =
  'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const charts = {};


// ============================================================
// FORMAT
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

  return money(n);
}

function pct(n) {
  n = Number(n) || 0;
  return (n * 100)
    .toFixed((n * 100) % 1 ? 1 : 0)
    .replace('.', ',') + '%';
}

function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])
  );
}


// ============================================================
// STATUS
// ============================================================

function setStatus(ok, text) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (dot) {
    dot.style.background =
      ok === true ? '#222' :
      ok === false ? '#b42318' :
      '#999';
  }

  if (statusText) {
    statusText.textContent = text;
  }
}


// ============================================================
// LOAD DATA VIA JSONP
// ============================================================

let jsonpCounter = 0;

function load() {

  setStatus(null, 'Menghubungkan...');

  const callbackName =
    'satuAmalCallback_' + Date.now() + '_' + (++jsonpCounter);

  const script = document.createElement('script');

  window[callbackName] = function(data) {

    try {

      if (!data || !data.ok) {
        throw new Error('API mengembalikan error');
      }

      render(data);

      setStatus(
        true,
        'Live • ' +
        new Date(data.generatedAt).toLocaleTimeString(
          'id-ID',
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }
        )
      );

    } catch (error) {

      console.error(error);
      setStatus(false, 'Data API bermasalah');

    } finally {

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

    }
  };

  script.onerror = function() {

    console.error('JSONP gagal dimuat');

    setStatus(
      false,
      'Gagal terhubung ke Google Sheets'
    );

    delete window[callbackName];

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  };

  script.src =
    API_URL +
    '?callback=' +
    encodeURIComponent(callbackName) +
    '&t=' +
    Date.now();

  document.body.appendChild(script);
}


// ============================================================
// RENDER DASHBOARD
// ============================================================

function render(d) {

  const s = d.summary || {};

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  document.getElementById('total').textContent =
    money(s.total);

  document.getElementById('transactions').textContent =
    Number(s.transactions || 0).toLocaleString('id-ID');

  document.getElementById('donors').textContent =
    Number(s.uniqueDonors || 0).toLocaleString('id-ID');

  document.getElementById('today').textContent =
    money(s.todayTotal);


  // ----------------------------------------------------------
  // TARGET 1 MINGGU
  // ----------------------------------------------------------

  const weeklyProgress =
    Number(s.weeklyProgress) || 0;

  document.getElementById('weeklyText').textContent =
    shortMoney(s.total) + ' / Rp200 Juta';

  document.getElementById('weeklyPct').textContent =
    pct(weeklyProgress);

  document.getElementById('weeklyBar').style.width =
    Math.min(weeklyProgress * 100, 100) + '%';

  document.getElementById('weeklyRemaining').textContent =
    Number(s.weeklyRemaining) > 0
      ? 'Sisa ' + money(s.weeklyRemaining)
      : 'Target tercapai';


  // ----------------------------------------------------------
  // TARGET 2 BULAN
  // ----------------------------------------------------------

  const overallProgress =
    Number(s.overallProgress) || 0;

  document.getElementById('overallText').textContent =
    shortMoney(s.total) + ' / Rp1 Miliar';

  document.getElementById('overallPct').textContent =
    pct(overallProgress);

  document.getElementById('overallBar').style.width =
    Math.min(overallProgress * 100, 100) + '%';

  document.getElementById('overallRemaining').textContent =
    Number(s.overallRemaining) > 0
      ? 'Sisa ' + money(s.overallRemaining)
      : 'Target tercapai';


  // ----------------------------------------------------------
  // CHART
  // ----------------------------------------------------------

  renderChart(
    'reffChart',
    'bar',
    (d.byReff || []).slice().reverse()
  );

  renderChart(
    'jenisChart',
    'doughnut',
    d.byJenis || []
  );

  renderChart(
    'dateChart',
    'line',
    (d.byDate || []).slice().reverse()
  );


  // ----------------------------------------------------------
  // TRANSAKSI TERBARU
  // ----------------------------------------------------------

  const recent = d.recent || [];

  document.getElementById('recent').innerHTML =
    recent.map(r => `
      <tr>
        <td>
          ${esc((r.tanggal || '') + ' ' + (r.waktu || ''))}
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
    `).join('');


  // ----------------------------------------------------------
  // UPDATE TIME
  // ----------------------------------------------------------

  document.getElementById('updated').textContent =
    'Update: ' +
    new Date(d.generatedAt).toLocaleString('id-ID');
}


// ============================================================
// CHART
// ============================================================

function renderChart(id, type, items) {

  const canvas = document.getElementById(id);

  if (!canvas) return;

  if (charts[id]) {
    charts[id].destroy();
  }

  const isDoughnut =
    type === 'doughnut';

  charts[id] = new Chart(canvas, {

    type: type,

    data: {

      labels: items.map(x => x.label),

      datasets: [{

        label: 'Nominal',

        data: items.map(x =>
          Number(x.nominal) || 0
        ),

        borderWidth: 2,

        tension: 0.25

      }]

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {
          display: isDoughnut
        }

      },

      scales: isDoughnut
        ? {}
        : {

            y: {

              beginAtZero: true,

              ticks: {

                callback: function(value) {
                  return shortMoney(value);
                }

              }

            },

            x: {

              ticks: {
                maxRotation: 0
              }

            }

          }

    }

  });
}


// ============================================================
// REFRESH BUTTON
// ============================================================

const refreshBtn =
  document.getElementById('refreshBtn');

if (refreshBtn) {
  refreshBtn.addEventListener(
    'click',
    load
  );
}


// ============================================================
// INITIAL LOAD
// ============================================================

load();


// ============================================================
// AUTO REFRESH 60 DETIK
// ============================================================

setInterval(
  load,
  60000
);
