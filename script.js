const OPENWEATHER_API_KEY='f96276a10ff40c3e256ba7991d7df571';
const WEATHERBIT_API_KEY='fa4e7a869cfd438999ca8c086959b4b1'; // 🔑 встав свій ключ

// --- Map Layers ---
const layers = {
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19, attribution:'&copy; CARTO'}),
  satellite: L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom:19, attribution:'Imagery © Esri'
    }),
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom:19, attribution:'Labels © Esri'
    })
  ]),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {maxZoom:17, attribution:'Map data: &copy; OpenTopoMap'}),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom:19, attribution:'&copy; CARTO'})
};

const map = L.map('map',{center:[40,-100],zoom:4});
let currentBase = layers.satellite;
currentBase.addTo(map);

const mapTypeSelect=document.getElementById('mapType');
mapTypeSelect.addEventListener('change',()=>{
  map.removeLayer(currentBase);
  currentBase = layers[mapTypeSelect.value];
  currentBase.addTo(map);
});

const coordsEl=document.getElementById('coords');
const zoomEl=document.getElementById('zoom');
const statusText=document.getElementById('statusText');

let singleMarker=null;
const cityMarkers=[];

function setStatus(t){statusText.textContent=t;}
function updateZoom(){zoomEl.textContent=map.getZoom();}
map.on('zoomend',updateZoom);updateZoom();

/*document.getElementById('resetBtn').addEventListener('click',()=>map.setView([45,-95],4));
document.getElementById('locateBtn').addEventListener('click',()=>map.locate({setView:true,maxZoom:10}));
document.getElementById('clearBtn').addEventListener('click',()=>{
  if(singleMarker){map.removeLayer(singleMarker);singleMarker=null;}
  cityMarkers.forEach(c=>map.removeLayer(c.marker));
  setStatus('All markers cleared');
});



map.on('locationfound',e=>{
  coordsEl.textContent=`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  fetchAndShowSingle(e.latlng.lat,e.latlng.lng,'You are here');
});
map.on('click',e=>{
  coordsEl.textContent=`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  fetchAndShowSingle(e.latlng.lat,e.latlng.lng,`Point ${e.latlng.lat.toFixed(2)},${e.latlng.lng.toFixed(2)}`);
});*/
document.getElementById('resetBtn').addEventListener('click',()=>map.flyTo([45,-95],4,{duration:1.0}));
document.getElementById('locateBtn').addEventListener('click',()=>map.locate({setView:false,maxZoom:10}));
document.getElementById('clearBtn').addEventListener('click',()=>{ 
  if(singleMarker){map.removeLayer(singleMarker);singleMarker=null;}
  cityMarkers.forEach(c=>map.removeLayer(c.marker));
  setStatus('All markers cleared');
});
map.on('locationfound',e=>{
  coordsEl.textContent=`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  map.flyTo(e.latlng, 10, {duration:1.2});
  fetchAndShowSingle(e.latlng.lat,e.latlng.lng,'You are here');
});
map.on('click',e=>{
  coordsEl.textContent=`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  map.flyTo(e.latlng, 10, {duration:1.0});
  fetchAndShowSingle(e.latlng.lat,e.latlng.lng,`Point ${e.latlng.lat.toFixed(2)},${e.latlng.lng.toFixed(2)}`);
});
// --- AQI ---
function pm25ToAQI(pm25){
  const breaks=[
    {cLow:0,cHigh:12,aLow:0,aHigh:50},
    {cLow:12.1,cHigh:35.4,aLow:51,aHigh:100},
    {cLow:35.5,cHigh:55.4,aLow:101,aHigh:150},
    {cLow:55.5,cHigh:150.4,aLow:151,aHigh:200},
    {cLow:150.5,cHigh:250.4,aLow:201,aHigh:300},
    {cLow:250.5,cHigh:350.4,aLow:301,aHigh:400},
    {cLow:350.5,cHigh:500.4,aLow:401,aHigh:500}
  ];
  for(const b of breaks){
    if(pm25>=b.cLow&&pm25<=b.cHigh){
      const aqi=Math.round(((b.aHigh-b.aLow)/(b.cHigh-b.cLow))*(pm25-b.cLow)+b.aLow);
      let cat='Unknown';
      if(aqi<=50)cat='Good';
      else if(aqi<=100)cat='Moderate';
      else if(aqi<=150)cat='Unhealthy for sensitive';
      else if(aqi<=200)cat='Unhealthy';
      else cat='Hazardous';
      return {aqi,category:cat};
    }
  }
  return {aqi:null,category:'N/A'};
}
function chooseColorFromAQ(pm25){
  if(pm25<=12)return'#00e400';
  if(pm25<=35.4)return'#ffff00';
  if(pm25<=55.4)return'#ff7e00';
  return'#ff0000';
}
function weatherIconUrl(icon){return `https://openweathermap.org/img/wn/${icon}.png`;}

// --- Custom Marker ---
function createCustomMarker(color) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span class="marker-dot" style="background:${color};"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}

// --- AIR (Weatherbit) ---
async function fetchOpenAQ(lat,lon){
  // Тепер беремо з Weatherbit "current/airquality"
  const url=`https://api.weatherbit.io/v2.0/current/airquality?lat=${lat}&lon=${lon}&key=${WEATHERBIT_API_KEY}`;
  try{
    const r=await fetch(url);
    const j=await r.json();
    const d=(j&&j.data&&j.data[0])?j.data[0]:null;
    if(!d){
      return [{parameter:'pm25',value:0,unit:'µg/m³'}];
    }
    // Приводимо до формату, який далі очікує UI
    const arr=[
      {parameter:'pm25', value:d.pm25, unit:'µg/m³'},
      {parameter:'pm10', value:d.pm10, unit:'µg/m³'},
      {parameter:'o3',   value:d.o3,   unit:'µg/m³'},
      {parameter:'no2',  value:d.no2,  unit:'µg/m³'},
      {parameter:'so2',  value:d.so2,  unit:'µg/m³'},
      {parameter:'co',   value:d.co,   unit:'µg/m³'},
      {parameter:'aqi',  value:d.aqi,  unit:'US AQI'}
    ].filter(m=>m.value!==undefined&&m.value!==null);
    return arr;
  }catch(e){
    console.error(e);
    return [{parameter:'pm25',value:0,unit:'µg/m³'}];
  }
}

// --- WEATHER (OpenWeather) ---
async function fetchWeather(lat,lon){
  try{
    const r=await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=en`);
    const d=await r.json();if(!d.main)return null;
    return{
      temp:d.main.temp,humidity:d.main.humidity,pressure:d.main.pressure,
      description:d.weather[0].description,icon:d.weather[0].icon,
      clouds:d.clouds?d.clouds.all:null,
      wind_deg:d.wind?d.wind.deg:null,wind_speed:d.wind?d.wind.speed:null,
      country:d.sys?d.sys.country:'',name:d.name||''
    };
  }catch(e){console.error(e);return null;}
}

// --- Popups ---
function buildPopupHtml(label,meas,w){
  const pm=meas.find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const aqiMeas=meas.find(m=>m.parameter==='aqi');
  let aqiStr='';
  if(aqiMeas && aqiMeas.value!=null){
    // пріоритет готовому AQI від Weatherbit
    const val=aqiMeas.value;
    let cat='Good';
    if(val>50 && val<=100) cat='Moderate';
    else if(val>100 && val<=150) cat='Unhealthy for sensitive';
    else if(val>150 && val<=200) cat='Unhealthy';
    else if(val>200 && val<=300) cat='Very Unhealthy';
    else if(val>300) cat='Hazardous';
    aqiStr=`${val} — ${cat}`;
  }else if(pm){
    const aqiObj=pm25ToAQI(pm.value);
    aqiStr=`${aqiObj.aqi} — ${aqiObj.category}`;
  }

  let html=`<div class="weather-popup-title">${label||'Weather'}</div><table class="weather-popup-table">
  <tr><td>Country</td><td>${w?.country||'-'}</td></tr>
  <tr><td>Temp</td><td>${w?.temp?.toFixed(1)||'-'}°C</td></tr>
  <tr><td>Clouds</td><td>${w?.clouds??'-'}%</td></tr>
  <tr><td>Humidity</td><td>${w?.humidity??'-'}%</td></tr>
  <tr><td>Pressure</td><td>${w?.pressure??'-'} hPa</td></tr>
  <tr><td>Wind</td><td>${w?.wind_speed?.toFixed(1)||'-'} m/s</td></tr>
  ${aqiStr?`<tr><td>AQI</td><td>${aqiStr}</td></tr>`:''}
  <tr><td colspan="2" style="text-align:center;">${w?.icon?`<img class="weather-icon" src="${weatherIconUrl(w.icon)}"/>`:''} ${w?.description||''}</td></tr>
  </table>`;
  return html;
}

// --- Markers ---
function createOrUpdateSingleMarker(lat,lon,label,meas,w){
  if(singleMarker){map.removeLayer(singleMarker);singleMarker=null;}
  const pm=meas.find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const color=pm?chooseColorFromAQ(pm.value):'#999';
  singleMarker=L.marker([lat,lon],{icon:createCustomMarker(color)})
    .addTo(map)
    .bindPopup(buildPopupHtml(label,meas,w),{maxWidth:340,minWidth:240})
    .on("click",()=>map.flyTo([lat,lon],8,{duration:0.9}));
}
function createOrUpdateCityMarker(lat,lon,label,meas,w){
  const pm=meas.find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const color=pm?chooseColorFromAQ(pm.value):'#999';
  const marker=L.marker([lat,lon],{icon:createCustomMarker(color)})
    .addTo(map)
    .bindPopup(buildPopupHtml(label,meas,w),{maxWidth:340,minWidth:240})
    .on("click",()=>map.flyTo([lat,lon],8,{duration:0.9}));
  cityMarkers.push({marker});
}

// --- Fetchers ---
async function fetchAndShowSingle(lat,lon,label){
  setStatus('Loading...');
  const [m,w]=await Promise.all([fetchOpenAQ(lat,lon),fetchWeather(lat,lon)]);
  createOrUpdateSingleMarker(lat,lon,label,m,w);
  setStatus('Data updated');
}
async function fetchAndShowCity(lat,lon,label){
  const [m,w]=await Promise.all([fetchOpenAQ(lat,lon),fetchWeather(lat,lon)]);
  createOrUpdateCityMarker(lat,lon,label,m,w);
}

// --- Cities ---
const predefined = [
  // Східне узбережжя США
  {name:'New York', coords:[40.7128,-74.0060]},
  {name:'Boston', coords:[42.3601,-71.0589]},
  {name:'Philadelphia', coords:[39.9526,-75.1652]},
  {name:'Washington', coords:[38.9072,-77.0369]},
  {name:'Baltimore', coords:[39.2904,-76.6122]},
  {name:'Pittsburgh', coords:[40.4406,-79.9959]},
  {name:'Buffalo', coords:[42.8864,-78.8784]},
  {name:'Richmond', coords:[37.5407,-77.4360]},

  // Південний схід США
  {name:'Miami', coords:[25.7617,-80.1918]},
  {name:'Orlando', coords:[28.5383,-81.3792]},
  {name:'Tampa', coords:[27.9506,-82.4572]},
  {name:'Jacksonville', coords:[30.3322,-81.6557]},
  {name:'Atlanta', coords:[33.7490,-84.3880]},
  {name:'Charlotte', coords:[35.2271,-80.8431]},
  {name:'Raleigh', coords:[35.7796,-78.6382]},
  {name:'Nashville', coords:[36.1627,-86.7816]},
  {name:'New Orleans', coords:[29.9511,-90.0715]},

  // Центральні штати
  {name:'Chicago', coords:[41.8781,-87.6298]},
  {name:'Detroit', coords:[42.3314,-83.0458]},
  {name:'Cleveland', coords:[41.4993,-81.6944]},
  {name:'Columbus', coords:[39.9612,-82.9988]},
  {name:'Indianapolis', coords:[39.7684,-86.1581]},
  {name:'Minneapolis', coords:[44.9778,-93.2650]},
  {name:'St. Louis', coords:[38.6270,-90.1994]},
  {name:'Kansas City', coords:[39.0997,-94.5786]},
  {name:'Milwaukee', coords:[43.0389,-87.9065]},

  // Техас
  {name:'Dallas', coords:[32.7767,-96.7970]},
  {name:'Houston', coords:[29.7604,-95.3698]},
  {name:'San Antonio', coords:[29.4241,-98.4936]},
  {name:'Austin', coords:[30.2672,-97.7431]},
  {name:'El Paso', coords:[31.7619,-106.4850]},

  // Захід США
  {name:'Denver', coords:[39.7392,-104.9903]},
  {name:'Phoenix', coords:[33.4484,-112.0740]},
  {name:'Tucson', coords:[32.2226,-110.9747]},
  {name:'Salt Lake City', coords:[40.7608,-111.8910]},
  {name:'Las Vegas', coords:[36.1699,-115.1398]},
  {name:'Los Angeles', coords:[34.0522,-118.2437]},
  {name:'San Diego', coords:[32.7157,-117.1611]},
  {name:'San Francisco', coords:[37.7749,-122.4194]},
  {name:'San Jose', coords:[37.3382,-121.8863]},
  {name:'Portland', coords:[45.5051,-122.6750]},
  {name:'Seattle', coords:[47.6062,-122.3321]},

  // Канада
  {name:'Vancouver', coords:[49.2827,-123.1207]},
  {name:'Toronto', coords:[43.6532,-79.3832]},
  {name:'Ottawa', coords:[45.4215,-75.6992]},
  {name:'Montreal', coords:[45.5019,-73.5674]},
  {name:'Quebec City', coords:[46.8139,-71.2080]},
  {name:'Calgary', coords:[51.0447,-114.0719]},
  {name:'Edmonton', coords:[53.5461,-113.4938]},
  {name:'Winnipeg', coords:[49.8951,-97.1384]},
  {name:'Halifax', coords:[44.6488,-63.5752]},

  // Мексика
  {name:'Mexico City', coords:[19.4326,-99.1332]},
  {name:'Guadalajara', coords:[20.6597,-103.3496]},
  {name:'Monterrey', coords:[25.6866,-100.3161]},
  {name:'Tijuana', coords:[32.5149,-117.0382]},
  {name:'Cancun', coords:[21.1619,-86.8515]},
  {name:'Mérida', coords:[20.9674,-89.5926]},

  // Куба
  {name:'Havana', coords:[23.1136,-82.3666]},
  {name:'Santiago de Cuba', coords:[20.0169,-75.8302]}
];

(async()=>{
  setStatus('Loading cities...');
  for(const c of predefined){
    await new Promise(r=>setTimeout(r,180));
    fetchAndShowCity(c.coords[0],c.coords[1],c.name);
  }
  setStatus('All cities loaded');
})();

// --- Search ---
if(typeof L.Control.Geocoder!=='undefined'){
  L.Control.geocoder({
    defaultMarkGeocode:false,
    placeholder:'Search for city or address...'
  }).on('markgeocode',function(e){
    const latlng=e.geocode.center;
    const name=e.geocode.name||'Place';
    map.setView(latlng,10);
    fetchAndShowSingle(latlng.lat,latlng.lng,name);
  }).addTo(map);
}