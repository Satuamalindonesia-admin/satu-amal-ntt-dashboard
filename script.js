// Tempel URL Web App Google Apps Script di sini setelah deployment.
const API_URL = 'https://script.google.com/macros/s/AKfycbwJaC5W0DzvLGdGarehlu1MzpSWJeWh77CfxBWnAEQsXrwqx3jnn0KnlpEwOU_y6lc8iA/exec';

const IDR = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const charts = {};

function money(n){return IDR.format(n||0)}
function shortMoney(n){
  n=n||0;
  if(n>=1e9)return 'Rp'+(n/1e9).toFixed(2).replace('.',',')+' M';
  if(n>=1e6)return 'Rp'+(n/1e6).toFixed(1).replace('.',',')+' Jt';
  return money(n);
}
function pct(n){return (n*100).toFixed(n*100%1?1:0).replace('.',',')+'%'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

async function load(){
  if(API_URL.includes('PASTE_')){
    setStatus(false,'API belum dipasang');
    return;
  }
  setStatus(null,'Memuat data...');
  try{
    const res=await fetch(API_URL+'?t='+Date.now(),{cache:'no-store'});
    const data=await res.json();
    if(!data.ok) throw new Error('API mengembalikan error');
    render(data);
    setStatus(true,'Live • '+new Date(data.generatedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  }catch(e){
    console.error(e); setStatus(false,'Gagal memuat data');
  }
}
function setStatus(ok,text){
  document.getElementById('statusDot').style.background=ok===true?'#222':ok===false?'#b42318':'#999';
  document.getElementById('statusText').textContent=text;
}
function render(d){
  const s=d.summary;
  document.getElementById('total').textContent=money(s.total);
  document.getElementById('transactions').textContent=s.transaksi.toLocaleString('id-ID');
  document.getElementById('donors').textContent=s.uniqueDonors.toLocaleString('id-ID');
  document.getElementById('today').textContent=money(s.todayTotal);

  document.getElementById('weeklyText').textContent=shortMoney(s.total)+' / Rp200 Juta';
  document.getElementById('weeklyPct').textContent=pct(s.weeklyProgress);
  document.getElementById('weeklyBar').style.width=Math.min(s.weeklyProgress*100,100)+'%';
  document.getElementById('weeklyRemaining').textContent=s.weeklyRemaining>0?'Sisa '+money(s.weeklyRemaining):'Target tercapai';

  document.getElementById('overallText').textContent=shortMoney(s.total)+' / Rp1 Miliar';
  document.getElementById('overallPct').textContent=pct(s.overallProgress);
  document.getElementById('overallBar').style.width=Math.min(s.overallProgress*100,100)+'%';
  document.getElementById('overallRemaining').textContent=s.overallRemaining>0?'Sisa '+money(s.overallRemaining):'Target tercapai';

  renderChart('reffChart','bar',d.byReff.slice().reverse(),'Kanal');
  renderChart('jenisChart','doughnut',d.byJenis,'Jenis');
  renderChart('dateChart','line',d.byDate.slice().reverse(),'Tanggal');

  document.getElementById('recent').innerHTML=d.recent.map(r=>`
    <tr>
      <td>${esc((r.tanggal||'')+' '+(r.waktu||''))}</td>
      <td>${esc(r.nama)}</td>
      <td><b>${money(r.nominal)}</b></td>
      <td>${esc(r.reff)}</td>
      <td>${esc(r.jenis)}</td>
      <td>${esc(r.pic)}</td>
    </tr>`).join('');
  document.getElementById('updated').textContent='Update: '+new Date(d.generatedAt).toLocaleString('id-ID');
}
function renderChart(id,type,items,label){
  if(charts[id]) charts[id].destroy();
  const isDate=id==='dateChart';
  const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut'}},
    scales:type==='doughnut'?{}:{y:{beginAtZero:true,ticks:{callback:v=>shortMoney(v)}},x:{ticks:{maxRotation:0}}}};
  document.getElementById(id).parentElement.querySelector('canvas').style.height=isDate?'280px':'280px';
  charts[id]=new Chart(document.getElementById(id),{
    type,
    data:{labels:items.map(x=>x.label),datasets:[{label:'Nominal',data:items.map(x=>x.nominal),borderWidth:2,tension:.25}]},
    options:opts
  });
}
document.getElementById('refreshBtn').addEventListener('click',load);
load();
setInterval(load,60000);
