const API_URL =
  'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGdGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

const IDR =
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  });

const charts = {};


function money(n) {

  return IDR.format(
    Number(n) || 0
  );

}


function shortMoney(n) {

  n = Number(n) || 0;

  if (n >= 1e9) {

    return (
      'Rp' +
      (n / 1e9)
        .toFixed(2)
        .replace('.', ',') +
      ' M'
    );

  }

  if (n >= 1e6) {

    return (
      'Rp' +
      (n / 1e6)
        .toFixed(1)
        .replace('.', ',') +
      ' Jt'
    );

  }

  return money(n);
}


function pct(n) {

  n = Number(n) || 0;

  return (
    (n * 100)
      .toFixed(
        (n * 100) % 1 ? 1 : 0
      )
      .replace('.', ',') +
    '%'
  );

}


function esc(s) {

  return String(s ?? '')
    .replace(
      /[&<>"']/g,
      function(m) {

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


/* =====================================
   LOAD DATA DENGAN JSONP
===================================== */

function load() {

  setStatus(
    null,
    'Menghubungkan ke Google Sheets...'
  );


  const callbackName =
    'satuAmalCallback_' +
    Date.now();


  window[callbackName] =
    function(data) {

      try {

        if (!data || !data.ok) {

          throw new Error(
            data?.error ||
            'API mengembalikan error'
          );

        }


        render(data);


        setStatus(
          true,
          'Live • ' +
          new Date(
            data.generatedAt
          ).toLocaleTimeString(
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
          'Dashboard error:',
          error
        );

        setStatus(
          false,
          'Gagal memuat data'
        );

      }


      cleanup();

    };


  const script =
    document.createElement('script');


  const separator =
    API_URL.includes('?')
      ? '&'
      : '?';


  script.src =
    API_URL +
    separator +
    'callback=' +
    callbackName +
    '&t=' +
    Date.now();


  script.onerror =
    function() {

      console.error(
        'Google Apps Script tidak dapat diakses.'
      );

      setStatus(
        false,
        'Gagal terhubung ke Google Sheets'
      );

      cleanup();

    };


  document.body.appendChild(
    script
  );


  function cleanup() {

    try {

      script.remove();

    }

    catch (e) {}


    try {

      delete window[callbackName];

    }

    catch (e) {}

  }

}


/* =====================================
   STATUS
===================================== */

function setStatus(
  ok,
  text
) {

  const dot =
    document.getElementById(
      'statusDot'
    );

  const statusText =
    document.getElementById(
      'statusText'
    );


  if (dot) {

    dot.style.background =
      ok === true
        ? '#222'
        : ok === false
          ? '#b42318'
          : '#999';

  }


  if (statusText) {

    statusText.textContent =
      text;

  }

}


/* =====================================
   RENDER
===================================== */

function render(d) {

  const s =
    d.summary;


  document.getElementById(
    'total'
  ).textContent =
    money(s.total);


  document.getElementById(
    'transactions'
  ).textContent =
    Number(
      s.transactions || 0
    ).toLocaleString(
      'id-ID'
    );


  document.getElementById(
    'donors'
  ).textContent =
    Number(
      s.uniqueDonors || 0
    ).toLocaleString(
      'id-ID'
    );


  document.getElementById(
    'today'
  ).textContent =
    money(
      s.todayTotal
    );


  /* TARGET MINGGUAN */

  document.getElementById(
    'weeklyText'
  ).textContent =
    shortMoney(
      s.total
    ) +
    ' / Rp200 Juta';


  document.getElementById(
    'weeklyPct'
  ).textContent =
    pct(
      s.weeklyProgress
    );


  document.getElementById(
    'weeklyBar'
  ).style.width =
    Math.min(
      s.weeklyProgress * 100,
      100
    ) +
    '%';


  document.getElementById(
    'weeklyRemaining'
  ).textContent =
    s.weeklyRemaining > 0
      ? 'Sisa ' +
        money(
          s.weeklyRemaining
        )
      : 'Target tercapai';


  /* TARGET OVERALL */

  document.getElementById(
    'overallText'
  ).textContent =
    shortMoney(
      s.total
    ) +
    ' / Rp1 Miliar';


  document.getElementById(
    'overallPct'
  ).textContent =
    pct(
      s.overallProgress
    );


  document.getElementById(
    'overallBar'
  ).style.width =
    Math.min(
      s.overallProgress * 100,
      100
    ) +
    '%';


  document.getElementById(
    'overallRemaining'
  ).textContent =
    s.overallRemaining > 0
      ? 'Sisa ' +
        money(
          s.overallRemaining
        )
      : 'Target tercapai';


  /* CHART */

  renderChart(
    'reffChart',
    'bar',
    (d.byReff || [])
      .slice()
      .reverse(),
    'Kanal'
  );


  renderChart(
    'jenisChart',
    'doughnut',
    d.byJenis || [],
    'Jenis'
  );


  renderChart(
    'dateChart',
    'line',
    (d.byDate || [])
      .slice()
      .reverse(),
    'Tanggal'
  );


  /* TRANSAKSI TERBARU */

  const recent =
    document.getElementById(
      'recent'
    );


  recent.innerHTML =
    (d.recent || [])
      .map(function(r) {

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
              ${esc(r.nama)}
            </td>

            <td>
              <b>
                ${money(r.nominal)}
              </b>
            </td>

            <td>
              ${esc(r.reff)}
            </td>

            <td>
              ${esc(r.jenis)}
            </td>

            <td>
              ${esc(r.pic)}
            </td>
          </tr>
        `;

      })
      .join('');


  const updated =
    document.getElementById(
      'updated'
    );


  if (updated) {

    updated.textContent =
      'Update: ' +
      new Date(
        d.generatedAt
      ).toLocaleString(
        'id-ID'
      );

  }

}


/* =====================================
   CHART
===================================== */

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

    charts[id].destroy();

  }


  const isDate =
    id === 'dateChart';


  const opts = {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {

        display:
          type === 'doughnut'

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
                  function(v) {

                    return shortMoney(v);

                  }

              }

            },

            x: {

              ticks: {

                maxRotation: 0

              }

            }

          }

  };


  const parent =
    canvas.parentElement;


  const chartCanvas =
    parent.querySelector(
      'canvas'
    );


  if (chartCanvas) {

    chartCanvas.style.height =
      '280px';

  }


  charts[id] =
    new Chart(
      canvas,
      {

        type: type,

        data: {

          labels:
            items.map(
              function(x) {
                return x.label;
              }
            ),

          datasets: [

            {

              label:
                'Nominal',

              data:
                items.map(
                  function(x) {
                    return x.nominal;
                  }
                ),

              borderWidth: 2,

              tension: 0.25

            }

          ]

        },

        options: opts

      }
    );

}


/* =====================================
   REFRESH
===================================== */

const refreshBtn =
  document.getElementById(
    'refreshBtn'
  );


if (refreshBtn) {

  refreshBtn.addEventListener(
    'click',
    load
  );

}


load();


setInterval(
  load,
  60000
);
