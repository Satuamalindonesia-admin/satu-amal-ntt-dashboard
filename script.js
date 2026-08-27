// ============================================================
// SATU AMAL INDONESIA
// NTT RESPONSE COMMAND CENTER
// Dashboard Donasi
// ============================================================

const API_URL =
  'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGdGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

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

  if (n >= 1000000000) {
    return 'Rp' +
      (n / 1000000000)
        .toFixed(2)
        .replace('.', ',') +
      ' M';
  }

  if (n >= 1000000) {
    return 'Rp' +
      (n / 1000000)
        .toFixed(1)
        .replace('.', ',') +
      ' Jt';
  }

  if (n >= 1000) {
    return 'Rp' +
      Math.round(n / 1000) +
      ' Rb';
  }

  return money(n);
}


function pct(n) {
  n = Number(n) || 0;

  return (
    (n * 100)
      .toFixed(n * 100 % 1 ? 1 : 0)
      .replace('.', ',') +
    '%'
  );
}


function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    }
  );
}


// ============================================================
// STATUS
// ============================================================

function setStatus(ok, text) {

  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (dot) {

    if (ok === true) {
      dot.style.background = '#222';
    }

    else if (ok === false) {
      dot.style.background = '#b42318';
    }

    else {
      dot.style.background = '#999';
    }
  }

  if (statusText) {
    statusText.textContent = text;
  }
}


// ============================================================
// LOAD DATA
// ============================================================

function load() {

  setStatus(null, 'Menghubungkan ke Google Sheets...');

  const callbackName =
    'satuAmalCallback_' +
    Date.now();

  let finished = false;

  const script =
    document.createElement('script');

  const timeout =
    setTimeout(function () {

      if (finished) return;

      finished = true;

      cleanup();

      setStatus(
        false,
        'Gagal terhubung ke Google Sheets'
      );

    }, 20000);


  function cleanup() {

    clearTimeout(timeout);

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

    try {
      delete window[callbackName];
    }

    catch (e) {
      window[callbackName] = undefined;
    }
  }


  window[callbackName] =
    function (data) {

      if (finished) return;

      finished = true;

      cleanup();

      console.log(
        'DATA GOOGLE SHEETS:',
        data
      );

      if (!data || data.ok !== true) {

        console.error(
          'API mengembalikan data tidak valid:',
          data
        );

        setStatus(
          false,
          'Data Google Sheets tidak valid'
        );

        return;
      }


      try {

        render(data);

        const generated =
          data.generatedAt
            ? new Date(data.generatedAt)
            : new Date();

        setStatus(
          true,
          'Live • ' +
          generated.toLocaleTimeString(
            'id-ID',
            {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }
          )
        );

      }

      catch (error) {

        console.error(
          'Render error:',
          error
        );

        setStatus(
          false,
          'Data berhasil diterima, tetapi gagal ditampilkan'
        );
      }
    };


  script.onerror =
    function () {

      if (finished) return;

      finished = true;

      cleanup();

      console.error(
        'JSONP gagal dimuat dari Apps Script.'
      );

      setStatus(
        false,
        'Gagal terhubung ke Google Sheets'
      );
    };


  // ==========================================================
  // INI BAGIAN PENTING
  // Google Apps Script menggunakan parameter "prefix"
  // ==========================================================

  script.src =
    API_URL +
    '?prefix=' +
    encodeURIComponent(callbackName) +
    '&t=' +
    Date.now();


  document.head.appendChild(script);
}


// ============================================================
// RENDER
// ============================================================

function render(d) {

  const s = d.summary || {};


  // TOTAL DONASI

  const total =
    document.getElementById('total');

  if (total) {
    total.textContent =
      money(s.total);
  }


  // TRANSAKSI

  const transactions =
    document.getElementById('transactions');

  if (transactions) {
    transactions.textContent =
      Number(
        s.transactions || 0
      ).toLocaleString('id-ID');
  }


  // DONATUR

  const donors =
    document.getElementById('donors');

  if (donors) {
    donors.textContent =
      Number(
        s.uniqueDonors || 0
      ).toLocaleString('id-ID');
  }


  // DONASI HARI INI

  const today =
    document.getElementById('today');

  if (today) {
    today.textContent =
      money(s.todayTotal);
  }


  // ==========================================================
  // TARGET 1 PEKAN
  // ==========================================================

  const weeklyText =
    document.getElementById(
      'weeklyText'
    );

  if (weeklyText) {
    weeklyText.textContent =
      shortMoney(s.total) +
      ' / Rp200 Juta';
  }


  const weeklyPct =
    document.getElementById(
      'weeklyPct'
    );

  if (weeklyPct) {
    weeklyPct.textContent =
      pct(s.weeklyProgress);
  }


  const weeklyBar =
    document.getElementById(
      'weeklyBar'
    );

  if (weeklyBar) {

    weeklyBar.style.width =
      Math.min(
        Number(
          s.weeklyProgress || 0
        ) * 100,
        100
      ) + '%';
  }


  const weeklyRemaining =
    document.getElementById(
      'weeklyRemaining'
    );

  if (weeklyRemaining) {

    weeklyRemaining.textContent =
      Number(
        s.weeklyRemaining || 0
      ) > 0

        ? 'Sisa ' +
          money(
            s.weeklyRemaining
          )

        : 'Target tercapai';
  }


  // ==========================================================
  // TARGET 1 MILIAR
  // ==========================================================

  const overallText =
    document.getElementById(
      'overallText'
    );

  if (overallText) {

    overallText.textContent =
      shortMoney(s.total) +
      ' / Rp1 Miliar';
  }


  const overallPct =
    document.getElementById(
      'overallPct'
    );

  if (overallPct) {

    overallPct.textContent =
      pct(s.overallProgress);
  }


  const overallBar =
    document.getElementById(
      'overallBar'
    );

  if (overallBar) {

    overallBar.style.width =
      Math.min(
        Number(
          s.overallProgress || 0
        ) * 100,
        100
      ) + '%';
  }


  const overallRemaining =
    document.getElementById(
      'overallRemaining'
    );

  if (overallRemaining) {

    overallRemaining.textContent =
      Number(
        s.overallRemaining || 0
      ) > 0

        ? 'Sisa ' +
          money(
            s.overallRemaining
          )

        : 'Target tercapai';
  }


  // ==========================================================
  // CHART
  // ==========================================================

  if (
    Array.isArray(d.byReff)
  ) {

    renderChart(
      'reffChart',
      'bar',
      d.byReff
        .slice()
        .reverse(),
      'Kanal'
    );
  }


  if (
    Array.isArray(d.byJenis)
  ) {

    renderChart(
      'jenisChart',
      'doughnut',
      d.byJenis,
      'Jenis'
    );
  }


  if (
    Array.isArray(d.byDate)
  ) {

    renderChart(
      'dateChart',
      'line',
      d.byDate
        .slice()
        .reverse(),
      'Tanggal'
    );
  }


  // ==========================================================
  // TABEL DONASI TERBARU
  // ==========================================================

  const recent =
    document.getElementById(
      'recent'
    );

  if (
    recent &&
    Array.isArray(d.recent)
  ) {

    recent.innerHTML =
      d.recent
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
                ${esc(
                  r.nama || ''
                )}
              </td>

              <td>
                <b>
                  ${money(
                    r.nominal
                  )}
                </b>
              </td>

              <td>
                ${esc(
                  r.reff || ''
                )}
              </td>

              <td>
                ${esc(
                  r.jenis || ''
                )}
              </td>

              <td>
                ${esc(
                  r.pic || ''
                )}
              </td>

            </tr>
          `;
        })
        .join('');
  }


  // ==========================================================
  // UPDATE TIME
  // ==========================================================

  const updated =
    document.getElementById(
      'updated'
    );

  if (updated) {

    updated.textContent =
      'Update: ' +
      new Date(
        d.generatedAt ||
        Date.now()
      ).toLocaleString('id-ID');
  }
}


// ============================================================
// CHART
// ============================================================

function renderChart(
  id,
  type,
  items,
  label
) {

  const canvas =
    document.getElementById(id);

  if (!canvas) {
    return;
  }


  if (charts[id]) {

    try {
      charts[id].destroy();
    }

    catch (e) {}
  }


  const options = {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {
        display:
          type === 'doughnut'
      },

      tooltip: {

        callbacks: {

          label:
            function (context) {

              return money(
                context.raw
              );
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

                callback:
                  function (value) {

                    return shortMoney(
                      value
                    );
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


  canvas.style.height =
    '280px';


  charts[id] =
    new Chart(
      canvas,
      {

        type: type,

        data: {

          labels:
            items.map(
              function (x) {
                return x.label;
              }
            ),

          datasets: [

            {

              label:
                'Nominal',

              data:
                items.map(
                  function (x) {
                    return Number(
                      x.nominal
                    ) || 0;
                  }
                ),

              borderWidth: 2,

              tension: 0.25
            }
          ]
        },

        options: options
      }
    );
}


// ============================================================
// BUTTON REFRESH
// ============================================================

const refreshBtn =
  document.getElementById(
    'refreshBtn'
  );


if (refreshBtn) {

  refreshBtn.addEventListener(
    'click',
    function () {
      load();
    }
  );
}


// ============================================================
// LOAD PERTAMA
// ============================================================

load();


// ============================================================
// AUTO REFRESH 60 DETIK
// ============================================================

setInterval(
  function () {
    load();
  },
  60000
);
