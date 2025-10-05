// --- Map Layers ---
const layers = {
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {maxZoom:19, attribution:'&copy; CARTO'}),
  satellite: L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'Imagery © Esri'}),
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'Labels © Esri'})
  ]),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {maxZoom:17, attribution:'Map data: &copy; OpenTopoMap'}),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom:19, attribution:'&copy; CARTO'}),
  temp: L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=f96276a10ff40c3e256ba7991d7df571', { maxZoom: 19, attribution: 'Map data &copy; OpenWeatherMap'}),
  precipitation: L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=f96276a10ff40c3e256ba7991d7df571', { maxZoom: 19, attribution: 'Map data &copy; OpenWeatherMap'}),
  clouds: L.tileLayer('https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=f96276a10ff40c3e256ba7991d7df571', { maxZoom: 19, attribution: 'Map data &copy; OpenWeatherMap'}),
  wind: L.tileLayer('https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=f96276a10ff40c3e256ba7991d7df571', { maxZoom: 19, attribution: 'Map data &copy; OpenWeatherMap'}),
  snow: L.tileLayer('https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=f96276a10ff40c3e256ba7991d7df571', { maxZoom: 19, attribution: 'Map data &copy; OpenWeatherMap'})
};


const map = L.map('map', {
  center:[40,-100],
  zoom:4,
  worldCopyJump:true
});

// Default base layer
let currentBase = layers.satellite;
currentBase.addTo(map);

// --- Layer Control ---
const baseMaps = {
  "Light": layers.light,
  "Satellite": layers.satellite,
  "Terrain": layers.terrain,
  "Dark": layers.dark
};

// --- Overlay Layers ---
const overlayMaps = {
  "Temperature": layers.temp,
  "Precipitation": layers.precipitation,
  "Clouds": layers.clouds,
  "Wind": layers.wind,
  "Snow": layers.snow
};

// Create the layer control as usual
const layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Wait for map to render
map.whenReady(() => {
  const lcEl = document.querySelector('.leaflet-control-layers');
  if (!lcEl) return;

  // Move out of default container
  document.body.appendChild(lcEl);

  // Base styles
  const baseStyle = {
    position: 'absolute',
    top: '50%',
    left: '10px',
    transform: 'translateY(-50%)',
    zIndex: '1000',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '8px 12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.3s ease',
    maxWidth: '180px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.85rem',
    overflow: 'hidden'
  };
  Object.assign(lcEl.style, baseStyle);

  // Labels
  const labels = lcEl.querySelectorAll('label');
  labels.forEach(label => {
    Object.assign(label.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 6px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    });
    label.onmouseover = () => label.style.background = 'rgba(14,165,233,0.1)';
    label.onmouseout = () => label.style.background = 'transparent';
  });

  // Collapse/expand arrow (mobile only)
  const collapseBtn = lcEl.querySelector('.leaflet-control-layers-toggle');
  const btnStyle = {
    width: '28px',
    height: '28px',
    background: 'var(--accent, #0ea5e9)',
    borderRadius: '50%',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    marginBottom: '8px'
  };
  if (collapseBtn) Object.assign(collapseBtn.style, btnStyle);

  // Responsive behavior
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  const updateForMobile = e => {
    if (e.matches) {
      // Mobile: show collapse button
      if (collapseBtn) {
        collapseBtn.style.display = 'flex';
        collapseBtn.innerHTML = '▶'; // initial arrow
        collapseBtn.onclick = () => {
          const collapsed = lcEl.classList.toggle('collapsed');
          collapseBtn.innerHTML = collapsed ? '▶' : '▼';
          labels.forEach(label => label.style.display = collapsed ? 'none' : 'flex');
        };
      }
      Object.assign(lcEl.style, {
        top: '50%',
        left: '10px',
        transform: 'translateY(-50%)',
        padding: '6px 8px',
        maxWidth: '140px',
        fontSize: '0.75rem',
      });
      labels.forEach(label => label.style.padding = '3px 5px');
    } else {
      // Desktop: always expanded, hide collapse button
      if (collapseBtn) collapseBtn.style.display = 'none';
      Object.assign(lcEl.style, baseStyle);
      labels.forEach(label => label.style.display = 'flex');
      labels.forEach(label => label.style.padding = '4px 6px');
    }
  };

  mediaQuery.addEventListener('change', updateForMobile);
  updateForMobile(mediaQuery); // initial check
});

const southWest = L.latLng(-60, -220); // bottom-left
const northEast = L.latLng(85, 10);   // top-right
const bounds = L.latLngBounds(southWest, northEast);

map.setMaxBounds(bounds);        // prevent panning outside
map.setMinZoom(3);               // don't zoom out too far
map.setMaxZoom(18);              // optional: max zoom in

// --- UI Elements ---
const coordsEl = document.querySelector('.coordinates-display');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

let singleMarker = null;
const cityMarkers = [];
let currentPopupData = {};

const geocoder = L.Control.Geocoder.nominatim();

// --- Search ---
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });

async function performSearch(){
  const q = (searchInput.value || '').trim();
  if (!q) return;
  try {
    const results = await new Promise((res, rej) => geocoder.geocode(q, r => (r && r.length ? res(r) : rej())));
    const r = results[0];
    map.flyTo(r.center, 10, {duration:1.0});
    fetchAndShowSingle(r.center.lat, r.center.lng, r.name || 'Searched Location');
    searchInput.value = '';
  } catch {
    alert('Location not found. Please try a different search term.');
  }
}

// --- Cursor coordinates + click handling ---
map.on('mousemove', e => { coordsEl.textContent = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`; });
map.on('click', e => {
  coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  map.flyTo(e.latlng, map.getZoom(), {duration:1.0});
  fetchAndShowSingle(e.latlng.lat, e.latlng.lng, `Location ${e.latlng.lat.toFixed(2)},${e.latlng.lng.toFixed(2)}`);
});

// --- AQI Helpers ---
function pm25ToAQI(pm25){
  const breaks = [
    {cLow:0,cHigh:12,aLow:0,aHigh:50},
    {cLow:12.1,cHigh:35.4,aLow:51,aHigh:100},
    {cLow:35.5,cHigh:55.4,aLow:101,aHigh:150},
    {cLow:55.5,cHigh:150.4,aLow:151,aHigh:200},
    {cLow:150.5,cHigh:250.4,aLow:201,aHigh:300},
    {cLow:250.5,cHigh:350.4,aLow:301,aHigh:400},
    {cLow:350.5,cHigh:500.4,aLow:401,aHigh:500}
  ];
  for (const b of breaks) {
    if (pm25 >= b.cLow && pm25 <= b.cHigh) {
      const aqi = Math.round(((b.aHigh - b.aLow) / (b.cHigh - b.cLow)) * (pm25 - b.cLow) + b.aLow);
      let category = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for sensitive' : aqi <= 200 ? 'Unhealthy' : 'Hazardous';
      return {aqi, category};
    }
  }
  return {aqi:null, category:'N/A'};
}
function chooseColorFromAQ(pm25){ if (pm25 <= 12) return '#00e400'; if (pm25 <= 35.4) return '#ffff00'; if (pm25 <= 55.4) return '#ff7e00'; return '#ff0000'; }
function getAQIColor(aqi){ if (aqi <= 50) return '#00e400'; if (aqi <= 100) return '#ffff00'; if (aqi <= 150) return '#ff7e00'; return '#ff0000'; }
const weatherIconUrl = icon => `https://openweathermap.org/img/wn/${icon}.png`;

// --- Custom marker ---
function createCustomMarker(color){
  return L.divIcon({className:"custom-marker", html:`<span class="marker-dot" style="background:${color};"></span>`, iconSize:[16,16], iconAnchor:[8,8], popupAnchor:[0,-8]});
}

async function fetchWeatherbit(lat, lon){
  try {
    const r = await fetch(`https://otpdayz.store:3001/getWeatherbit?lat=${lat}&lon=${lon}`);
    if (!r.ok) throw new Error();
    const j = await r.json();
    const d = (j && j.data && j.data[0]) ? j.data[0] : null;
    if (!d) return [{parameter:'pm25', value:15, unit:'µg/m³'}];
    return [
      {parameter:'pm25', value:d.pm25 ?? 15, unit:'µg/m³'},
      {parameter:'pm10', value:d.pm10, unit:'µg/m³'},
      {parameter:'o3', value:d.o3, unit:'µg/m³'},
      {parameter:'no2', value:d.no2, unit:'µg/m³'},
      {parameter:'so2', value:d.so2, unit:'µg/m³'},
      {parameter:'co', value:d.co, unit:'µg/m³'},
      {parameter:'aqi', value:d.aqi, unit:'US AQI'}
    ].filter(m => m.value !== undefined && m.value !== null);
  } catch {
    return [{parameter:'pm25', value:Math.random()*100+10, unit:'µg/m³'},{parameter:'aqi', value:Math.floor(Math.random()*200)+20, unit:'US AQI'}];
  }
}
async function fetchWeatherbitForecast(lat, lon){
  try {
    const r = await fetch(`https://otpdayz.store:3001/getWeatherbit2?lat=${lat}&lon=${lon}`);
    if (!r.ok) throw new Error();
    const j = await r.json();
    if (!j || !j.data || !Array.isArray(j.data) || j.data.length === 0) throw new Error();
    const data = j.data;
    const pick = idx => {
      const e = data[idx]; if (!e) return null;
      const dt = e.timestamp_local || e.timestamp_utc || e.datetime || new Date().toISOString();
      const pm25 = e.pm25 ?? e.pm2_5 ?? null;
      const pollutants = { pm25, pm10: e.pm10 ?? null, o3: e.o3 ?? null, no2: e.no2 ?? null, so2: e.so2 ?? null, co: e.co ?? null, aqi: e.aqius ?? e.aqi ?? null };
      const humidity = e.rh ?? e.humidity ?? null;
      const wind_speed = e.wind_spd ?? e.wind_speed ?? null;
      let aqi = pollutants.aqi;
      if (aqi == null && pm25 != null) aqi = pm25ToAQI(pm25).aqi;
      return {dt_txt:dt, pollutants, aqi, humidity, wind_speed};
    };
    return {'1h':pick(0)||null,'6h':pick(2)||null,'24h':pick(8)||null};
  } catch {
    const mock = h => {
      const dt = new Date(Date.now()+h*3600000).toISOString();
      const pm25 = Math.round(Math.random()*80+5);
      const humidity = Math.round(Math.random()*50+30);
      const wind_speed = Math.random()*10;
      return {dt_txt:dt, pollutants:{pm25,pm10:null,o3:null,no2:null,so2:null,co:null}, aqi:pm25ToAQI(pm25).aqi, humidity, wind_speed};
    };
    return {'1h':mock(1),'6h':mock(6),'24h':mock(24)};
  }
}
async function fetchWeather(lat, lon){
  try {
    const r = await fetch(`https://otpdayz.store:3001/getOpenweather?lat=${lat}&lon=${lon}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    if (!d || !d.main) return null;
    return {
      temp: d.main.temp,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      description: d.weather?.[0]?.description || '',
      icon: d.weather?.[0]?.icon || '',
      clouds: d.clouds?.all ?? null,
      wind_deg: d.wind?.deg ?? null,
      wind_speed: d.wind?.speed ?? null,
      country: d.sys?.country ?? '',
      name: d.name || ''
    };
  } catch {
    return {temp:Math.random()*30+5, humidity:Math.random()*50+30, pressure:1013, description:'clear sky', icon:'01d', clouds:20, wind_speed:Math.random()*10, country:'US', name:'Test Location'};
  }
}
async function fetchForecast(lat, lon){
  try {
    const r = await fetch(`https://otpdayz.store:3001/getOpenweather2?lat=${lat}&lon=${lon}`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    return {'1h':data.list?.[0]||null,'6h':data.list?.[2]||null,'24h':data.list?.[8]||null};
  } catch {
    const mk = (h,desc) => ({dt_txt:new Date(Date.now()+h*3600000).toISOString(), main:{temp:Math.random()*30+5, humidity:Math.random()*50+30}, weather:[{description:desc||'partly cloudy'}], wind:{speed:Math.random()*10}});
    return {'1h':mk(1,'partly cloudy'),'6h':mk(6,'clear sky'),'24h':mk(24,'light rain')};
  }
}

function buildPopupHtml(label, meas, w, headerColor='#3498db'){
  const pm = (meas||[]).find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const aqiMeas = (meas||[]).find(m=>m.parameter==='aqi');
  let aqiStr='No data', aqiValue=null;
  if (aqiMeas && aqiMeas.value != null) {
    aqiValue = aqiMeas.value;
    const cat = aqiValue<=50?'Good':aqiValue<=100?'Moderate':aqiValue<=150?'Unhealthy for sensitive':aqiValue<=200?'Unhealthy':aqiValue<=300?'Very Unhealthy':'Hazardous';
    aqiStr = `${aqiValue} — ${cat}`;
  } else if (pm && pm.value != null) {
    const o = pm25ToAQI(pm.value);
    aqiValue = o.aqi;
    aqiStr = `${o.aqi} — ${o.category}`;
  }

  const headerStyle = `background:linear-gradient(135deg,${headerColor},${headerColor}dd);`;
  return `
    <div class="weather-popup-header" style="${headerStyle}">${label||'Weather'}</div>
    <table class="weather-popup-table">
      <tr><td>Country</td><td>${w?.country||'-'}</td></tr>
      <tr><td>Temperature</td><td>${w?.temp?.toFixed(1)||'-'}°C</td></tr>
      <tr><td>Clouds</td><td>${w?.clouds ?? '-' }%</td></tr>
      <tr><td>Humidity</td><td>${w?.humidity ?? '-' }%</td></tr>
      <tr><td>Wind</td><td>${w?.wind_speed?.toFixed(1) || '-'} m/s</td></tr>
      <tr><td>AQI</td><td>${aqiStr}</td></tr>
      <tr><td colspan="2" style="text-align:center;">${w?.icon?`<img class="weather-icon" src="${weatherIconUrl(w.icon)}"/>`:''} ${w?.description||''}</td></tr>
      <td colspan="2" style="text-align:center">======== Recommendation ========</td>
      <tr><td>${(() => {
        if (aqiValue == null) return 'No data';
        if (aqiValue <= 50) return 'Air quality is good. Normal outdoor activity.';
        if (aqiValue <= 100) return 'Moderate air quality. Sensitive groups should limit prolonged exertion.';
        if (aqiValue <= 150) return 'Unhealthy for sensitive groups. Consider wearing a mask outdoors.';
        if (aqiValue <= 200) return 'Unhealthy. Limit outdoor activity.';
        if (aqiValue <= 300) return 'Very unhealthy. Stay indoors if possible.';
        return 'Hazardous. Avoid outdoor exposure.';
      })()}</td></tr>
    </table>
    <div class="forecast-nav">
      <button class="forecast-btn active" data-period="current">Now</button>
      <button class="forecast-btn" data-period="1h">1H</button>
      <button class="forecast-btn" data-period="6h">6H</button>
      <button class="forecast-btn" data-period="24h">24H</button>
    </div>
    <div id="forecast-data" class="forecast-data" style="display:none;"></div>
  `;
}
function showForecastData(period, wbForecast, owForecast){
  const forecast = wbForecast[period];
  if (!forecast) return '<div>No forecast data available</div>';

  console.log(owForecast)

  // Weatherbit/AQ shape
  if (forecast.pollutants) {
    const time = new Date(forecast.dt_txt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
    const pm25 = forecast.pollutants.pm25;
    const aqiVal = forecast.aqi != null ? forecast.aqi : (pm25 != null ? pm25ToAQI(pm25).aqi : null);
    const aqiColor = aqiVal != null ? getAQIColor(aqiVal) : '#999';
    const humidity = owForecast[period].main.humidity != null ? `${owForecast[period].main.humidity}%` : '-';
    const wind = owForecast[period].wind.speed != null ? `${(owForecast[period].wind.speed * 3.6).toFixed(1)} km/h` : '-';
    return `
      <div class="forecast-item"><div class="forecast-time">${time}</div><div class="forecast-temp">${pm25!=null?pm25.toFixed(1)+' µg/m³':'-'}</div><div class="forecast-aqi" style="background:${aqiColor};">${aqiVal!=null?aqiVal:'-'}</div></div>
      <div class="forecast-item"><div>Humidity</div><div>${humidity}</div></div>
      <div class="forecast-item"><div>Wind</div><div>${wind}</div></div>
    `;
  }

  // OpenWeather shape
  if (forecast.main) {
    const time = new Date(forecast.dt_txt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
    const mockAQI = Math.floor(Math.random()*150)+20;
    const aqiColor = getAQIColor(mockAQI);
    return `
      <div class="forecast-item"><div class="forecast-time">${time}</div><div class="forecast-temp">${forecast.main.temp.toFixed(1)}°C</div><div class="forecast-aqi" style="background:${aqiColor};">${mockAQI}</div></div>
      <div class="forecast-item"><div>Humidity</div><div>${forecast.main.humidity}%</div></div>
      <div class="forecast-item"><div>Wind</div><div>${forecast.wind?.speed?.toFixed(1) || '-'} m/s</div></div>
      <div class="forecast-item"><div>Conditions</div><div>${forecast.weather?.[0]?.description || '-'}</div></div>
    `;
  }

  return '<div>No forecast data available</div>';
}

function bindPopupHandlers(popup, wbForecast, owForecast, headerColor){
  const container = popup.getElement();
  if (!container) return;
  if (container._forecastClickHandler) container.removeEventListener('click', container._forecastClickHandler);
  container._forecastClickHandler = function(evt){
    const btn = evt.target.closest('.forecast-btn'); if (!btn) return;
    const period = btn.dataset.period;
    const forecastData = container.querySelector('#forecast-data');
    container.querySelectorAll('.forecast-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if (period === 'current') { if (forecastData) forecastData.style.display = 'none'; }
    else { if (forecastData) { forecastData.style.display = 'block'; forecastData.innerHTML = showForecastData(period, wbForecast, owForecast, headerColor); } }
  };
  container.addEventListener('click', container._forecastClickHandler);
  popup.on('popupclose', () => {
    if (container && container._forecastClickHandler) { container.removeEventListener('click', container._forecastClickHandler); container._forecastClickHandler = null; }
  });
}
function createOrUpdateSingleMarker(lat, lon, label, meas, w, wbForecast, owForecast){
  if (singleMarker) { map.removeLayer(singleMarker); singleMarker = null; }
  const pm = (meas||[]).find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const aqiMeas = (meas||[]).find(m=>m.parameter==='aqi');
  let color = '#999', aqiValue = null;
  if (aqiMeas && aqiMeas.value != null) { aqiValue = aqiMeas.value; color = getAQIColor(aqiValue); }
  else if (pm && pm.value != null) { color = chooseColorFromAQ(pm.value); aqiValue = pm25ToAQI(pm.value).aqi; }
  const popupHeaderColor = color;
  currentPopupData = {lat, lon, label, meas, w, wbForecast, owForecast, headerColor:popupHeaderColor};
  singleMarker = L.marker([lat, lon], {icon:createCustomMarker(color)}).addTo(map)
    .bindPopup(buildPopupHtml(label, meas, w, popupHeaderColor), {maxWidth:340, minWidth:280})
    .on('click', ()=>map.flyTo([lat, lon],8,{duration:0.9}))
    .on('popupopen', e => bindPopupHandlers(e.popup, wbForecast, owForecast, popupHeaderColor));
}
function createOrUpdateCityMarker(lat, lon, label, meas, w, wbForecast, owForecast){
  const pm = (meas||[]).find(m=>m.parameter==='pm25'||m.parameter==='pm2.5');
  const aqiMeas = (meas||[]).find(m=>m.parameter==='aqi');
  let color = '#999';
  if (aqiMeas && aqiMeas.value != null) color = aqiMeas.value <= 50 ? '#00e400' : aqiMeas.value <= 100 ? '#ffff00' : aqiMeas.value <= 150 ? '#ff7e00' : '#ff0000';
  else if (pm && pm.value != null) color = chooseColorFromAQ(pm.value);
  const popupHeaderColor = color;
  currentPopupData = {lat, lon, label, meas, w, headerColor:popupHeaderColor};
  const marker = L.marker([lat, lon], {icon:createCustomMarker(color)}).addTo(map)
    .bindPopup(buildPopupHtml(label, meas, w, wbForecast, owForecast, popupHeaderColor), {maxWidth:340, minWidth:280})
    .on('click', ()=>map.flyTo([lat, lon],8,{duration:0.9}))
    .on('popupopen', e => bindPopupHandlers(e.popup, wbForecast, owForecast, popupHeaderColor));
  cityMarkers.push({marker});
}

async function fetchAndShowSingle(lat, lon, label){
  try {
    const [air, wbForecast, weather, owForecast] = await Promise.all([fetchWeatherbit(lat, lon), fetchWeatherbitForecast(lat, lon), fetchWeather(lat, lon), fetchForecast(lat, lon)]);
    createOrUpdateSingleMarker(lat, lon, label, air||[], weather||{}, wbForecast, owForecast);
  } catch {}
}
async function fetchAndShowCity(lat, lon, label){
  try {
    const [air, wbForecast, weather, owForecast] = await Promise.all([fetchWeatherbit(lat, lon), fetchWeatherbitForecast(lat, lon), fetchWeather(lat, lon), fetchForecast(lat, lon)]);
    createOrUpdateCityMarker(lat, lon, label, air||[], weather||{}, wbForecast, owForecast);
  } catch {}
}

const predefined = [
  // US
  {name:'New York',coords:[40.7128,-74.0060]},{name:'Los Angeles',coords:[34.0522,-118.2437]},{name:'Chicago',coords:[41.8781,-87.6298]},{name:'Houston',coords:[29.7604,-95.3698]},{name:'Phoenix',coords:[33.4484,-112.0740]},{name:'Philadelphia',coords:[39.9526,-75.1652]},{name:'San Antonio',coords:[29.4241,-98.4936]},{name:'San Diego',coords:[32.7157,-117.1611]},{name:'Dallas',coords:[32.7767,-96.7970]},{name:'San Jose',coords:[37.3382,-121.8863]},{name:'Austin',coords:[30.2672,-97.7431]},{name:'Jacksonville',coords:[30.3322,-81.6557]},{name:'San Francisco',coords:[37.7749,-122.4194]},{name:'Columbus',coords:[39.9612,-82.9988]},{name:'Indianapolis',coords:[39.7684,-86.1581]},{name:'Seattle',coords:[47.6062,-122.3321]},{name:'Denver',coords:[39.7392,-104.9903]},{name:'Washington',coords:[38.9072,-77.0369]},{name:'Boston',coords:[42.3601,-71.0589]},{name:'Detroit',coords:[42.3314,-83.0458]},{name:'Nashville',coords:[36.1627,-86.7816]},{name:'Memphis',coords:[35.1495,-90.0490]},{name:'Portland',coords:[45.5051,-122.6750]},{name:'Las Vegas',coords:[36.1699,-115.1398]},{name:'Baltimore',coords:[39.2904,-76.6122]},{name:'Milwaukee',coords:[43.0389,-87.9065]},{name:'Albuquerque',coords:[35.0844,-106.6504]},{name:'Tucson',coords:[32.2226,-110.9747]},{name:'Fresno',coords:[36.7378,-119.7871]},{name:'Sacramento',coords:[38.5816,-121.4944]},
  // Canada
  {name:'Toronto',coords:[43.6532,-79.3832]},{name:'Montreal',coords:[45.5019,-73.5674]},{name:'Vancouver',coords:[49.2827,-123.1207]},{name:'Calgary',coords:[51.0447,-114.0719]},{name:'Edmonton',coords:[53.5461,-113.4938]},{name:'Ottawa',coords:[45.4215,-75.6992]},{name:'Winnipeg',coords:[49.8951,-97.1384]},{name:'Quebec City',coords:[46.8139,-71.2080]},{name:'Hamilton',coords:[43.2557,-79.8711]},{name:'Kitchener',coords:[43.4516,-80.4925]},
  // Mexico
  {name:'Mexico City',coords:[19.4326,-99.1332]},{name:'Guadalajara',coords:[20.6597,-103.3496]},{name:'Monterrey',coords:[25.6866,-100.3161]},{name:'Puebla',coords:[19.0414,-98.2063]},{name:'Tijuana',coords:[32.5149,-117.0382]},{name:'Leon',coords:[21.1250,-101.6860]},{name:'Zapopan',coords:[20.6718,-103.4165]}
];

(async () => {
  for (const c of predefined) {
    await fetchAndShowCity(c.coords[0], c.coords[1], c.name);
  }
})();
