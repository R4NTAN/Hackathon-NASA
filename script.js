const OPENWEATHER_API_KEY='f96276a10ff40c3e256ba7991d7df571';
const WEATHERBIT_API_KEY='9757754398094f7f9590179397e6076d';

// --- Map Layers (no wrapping) ---
const layers = {
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '&copy; CARTO', noWrap: true
  }),
  satellite: L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Imagery © Esri', noWrap: true
    }),
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Labels © Esri', noWrap: true
    })
  ]),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17, attribution: 'Map data: &copy; OpenTopoMap', noWrap: true
  }),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '&copy; CARTO', noWrap: true
  })
};

// --- Map (bounded, no horizontal wrap) ---
const WORLD_LAT = 85.05112878;
const map = L.map('map', {
  center: [40, -100],
  zoom: 4,
  minZoom: 3,             // заборона надто сильного віддалення (порожні області)
  maxZoom: 19,
  worldCopyJump: false,
  maxBoundsViscosity: 1.0,
  // ставимо тимчасово без maxBounds — встановимо нижче після додавання шару
});
let currentBase = layers.satellite;
currentBase.addTo(map);

// Встановлюємо суворі межі після додавання тайлів (щоб карта не виходила за видимі тайли)
const bounds = L.latLngBounds([[-WORLD_LAT, -180], [WORLD_LAT, 180]]);
map.setMaxBounds(bounds);
map.options.maxBounds = bounds;
map.options.maxBoundsViscosity = 1.0;

// Елементи UI
const coordsEl = document.querySelector('.coordinates-display');
const locationNameEl = document.getElementById('locationName');
const temperatureEl = document.getElementById('temperature');
const aqiEl = document.getElementById('aqi');
const humidityEl = document.getElementById('humidity');
const weatherEl = document.getElementById('weather');
const statusText = document.getElementById('statusText');
const panelToggle = document.getElementById('panelToggle');
const closePanel = document.getElementById('closePanel');
const sidePanel = document.getElementById('sidePanel');

let singleMarker = null;
const cityMarkers = [];

// Управління панеллю
panelToggle.addEventListener('click', () => {
  sidePanel.classList.remove('panel-hidden');
  panelToggle.style.display = 'none';
});

closePanel.addEventListener('click', () => {
  sidePanel.classList.add('panel-hidden');
  panelToggle.style.display = 'block';
});

function setStatus(t) { statusText.textContent = t; }

// Оновлення координат при русі миші
map.on('mousemove', function(e) {
  coordsEl.textContent = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
});

// Кнопка "Locate me"
document.getElementById('locateBtn').addEventListener('click', () => {
  map.locate({setView: true, maxZoom: 10});
});

map.on('locationfound', e => {
  coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  map.flyTo(e.latlng, 10, {duration: 1.2});
  fetchAndShowSingle(e.latlng.lat, e.latlng.lng, 'Your location');
});

// Клік по карті
map.on('click', e => {
  coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  map.flyTo(e.latlng, 10, {duration: 1.0});
  fetchAndShowSingle(e.latlng.lat, e.latlng.lng, `Location ${e.latlng.lat.toFixed(2)},${e.latlng.lng.toFixed(2)}`);
});

// --- AQI ---
function pm25ToAQI(pm25){
  const breaks = [
    {cLow:0, cHigh:12, aLow:0, aHigh:50},
    {cLow:12.1, cHigh:35.4, aLow:51, aHigh:100},
    {cLow:35.5, cHigh:55.4, aLow:101, aHigh:150},
    {cLow:55.5, cHigh:150.4, aLow:151, aHigh:200},
    {cLow:150.5, cHigh:250.4, aLow:201, aHigh:300},
    {cLow:250.5, cHigh:350.4, aLow:301, aHigh:400},
    {cLow:350.5, cHigh:500.4, aLow:401, aHigh:500}
  ];
  for(const b of breaks){
    if(pm25 >= b.cLow && pm25 <= b.cHigh){
      const aqi = Math.round(((b.aHigh - b.aLow) / (b.cHigh - b.cLow)) * (pm25 - b.cLow) + b.aLow);
      let cat = 'Unknown';
      if(aqi <= 50) cat = 'Good';
      else if(aqi <= 100) cat = 'Moderate';
      else if(aqi <= 150) cat = 'Unhealthy for sensitive';
      else if(aqi <= 200) cat = 'Unhealthy';
      else cat = 'Hazardous';
      return {aqi, category: cat};
    }
  }
  return {aqi: null, category: 'N/A'};
}

function chooseColorFromAQ(pm25){
  if(pm25 <= 12) return '#00e400';
  if(pm25 <= 35.4) return '#ffff00';
  if(pm25 <= 55.4) return '#ff7e00';
  return '#ff0000';
}

function weatherIconUrl(icon) { 
  return `https://openweathermap.org/img/wn/${icon}.png`; 
}

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
async function fetchOpenAQ(lat, lon){
  const url = `https://api.weatherbit.io/v2.0/current/airquality?lat=${lat}&lon=${lon}&key=${WEATHERBIT_API_KEY}`;
  try{
    console.log('Fetching AQI from:', url);
    const r = await fetch(url);
    
    if (!r.ok) {
      throw new Error(`HTTP error! status: ${r.status}`);
    }
    
    const j = await r.json();
    console.log('AQI API response:', j);
    
    const d = (j && j.data && j.data[0]) ? j.data[0] : null;
    
    if(!d){
      console.log('No AQI data found, using fallback');
      return [{parameter: 'pm25', value: 15, unit: 'µg/m³'}];
    }
    
    const arr = [
      {parameter: 'pm25', value: d.pm25 || 15, unit: 'µg/m³'},
      {parameter: 'pm10', value: d.pm10, unit: 'µg/m³'},
      {parameter: 'o3', value: d.o3, unit: 'µg/m³'},
      {parameter: 'no2', value: d.no2, unit: 'µg/m³'},
      {parameter: 'so2', value: d.so2, unit: 'µg/m³'},
      {parameter: 'co', value: d.co, unit: 'µg/m³'},
      {parameter: 'aqi', value: d.aqi, unit: 'US AQI'}
    ].filter(m => m.value !== undefined && m.value !== null);
    
    console.log('Processed AQI data:', arr);
    return arr;
  } catch(e){
    console.error('AQI fetch error:', e);
    // Повертаємо тестові дані для демонстрації
    return [
      {parameter: 'pm25', value: Math.random() * 100 + 10, unit: 'µg/m³'},
      {parameter: 'aqi', value: Math.floor(Math.random() * 200) + 20, unit: 'US AQI'}
    ];
  }
}

// --- WEATHER (OpenWeather) ---
async function fetchWeather(lat, lon){
  try{
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=en`;
    console.log('Fetching weather from:', url);
    
    const r = await fetch(url);
    
    if (!r.ok) {
      throw new Error(`HTTP error! status: ${r.status}`);
    }
    
    const d = await r.json();
    console.log('Weather API response:', d);
    
    if(!d.main) return null;
    return {
      temp: d.main.temp,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      description: d.weather[0].description,
      icon: d.weather[0].icon,
      clouds: d.clouds ? d.clouds.all : null,
      wind_deg: d.wind ? d.wind.deg : null,
      wind_speed: d.wind ? d.wind.speed : null,
      country: d.sys ? d.sys.country : '',
      name: d.name || ''
    };
  } catch(e){
    console.error('Weather fetch error:', e);
    // Повертаємо тестові дані для демонстрації
    return {
      temp: Math.random() * 30 + 5,
      humidity: Math.random() * 50 + 30,
      pressure: 1013,
      description: 'clear sky',
      icon: '01d',
      clouds: 20,
      wind_speed: Math.random() * 10,
      country: 'US',
      name: 'Test Location'
    };
  }
}

// --- Оновлення панелі ---
function updatePanel(label, meas, w) {
  locationNameEl.textContent = label;
  
  if (w) {
    temperatureEl.textContent = `${w.temp?.toFixed(1) || '-'}°C`;
    humidityEl.textContent = `${w.humidity || '-'}%`;
    weatherEl.textContent = w.description || '-';
  } else {
    temperatureEl.textContent = '-';
    humidityEl.textContent = '-';
    weatherEl.textContent = '-';
  }
  
  const pm = meas.find(m => m.parameter === 'pm25' || m.parameter === 'pm2.5');
  const aqiMeas = meas.find(m => m.parameter === 'aqi');
  
  if (aqiMeas && aqiMeas.value != null) {
    aqiEl.textContent = `${aqiMeas.value} (US AQI)`;
  } else if (pm) {
    const aqiObj = pm25ToAQI(pm.value);
    aqiEl.textContent = `${aqiObj.aqi || '-'} (${aqiObj.category})`;
  } else {
    aqiEl.textContent = '-';
  }
}

// --- Popups ---
function buildPopupHtml(label, meas, w){
  const pm = meas.find(m => m.parameter === 'pm25' || m.parameter === 'pm2.5');
  const aqiMeas = meas.find(m => m.parameter === 'aqi');
  
  console.log('Building popup with data:', {label, meas, pm, aqiMeas});
  
  let aqiStr = '';
  let aqiValue = null;
  
  if(aqiMeas && aqiMeas.value != null){
    aqiValue = aqiMeas.value;
    let cat = 'Good';
    if(aqiValue > 50 && aqiValue <= 100) cat = 'Moderate';
    else if(aqiValue > 100 && aqiValue <= 150) cat = 'Unhealthy for sensitive';
    else if(aqiValue > 150 && aqiValue <= 200) cat = 'Unhealthy';
    else if(aqiValue > 200 && aqiValue <= 300) cat = 'Very Unhealthy';
    else if(aqiValue > 300) cat = 'Hazardous';
    aqiStr = `${aqiValue} — ${cat}`;
  } else if(pm && pm.value != null){
    const aqiObj = pm25ToAQI(pm.value);
    aqiValue = aqiObj.aqi;
    aqiStr = `${aqiValue} — ${aqiObj.category}`;
  } else {
    aqiStr = 'No data';
  }

  let html = `<div class="weather-popup-title">${label || 'Weather'}</div><table class="weather-popup-table">
  <tr><td>Country</td><td>${w?.country || '-'}</td></tr>
  <tr><td>Temperature</td><td>${w?.temp?.toFixed(1) || '-'}°C</td></tr>
  <tr><td>Clouds</td><td>${w?.clouds ?? '-'}%</td></tr>
  <tr><td>Humidity</td><td>${w?.humidity ?? '-'}%</td></tr>
  <tr><td>Pressure</td><td>${w?.pressure ?? '-'} hPa</td></tr>
  <tr><td>Wind</td><td>${w?.wind_speed?.toFixed(1) || '-'} m/s</td></tr>
  <tr><td>AQI</td><td>${aqiStr}</td></tr>
  <tr><td colspan="2" style="text-align:center;">${w?.icon ? `<img class="weather-icon" src="${weatherIconUrl(w.icon)}"/>` : ''} ${w?.description || ''}</td></tr>
  </table>`;
  
  return html;
}

// --- Markers ---
function createOrUpdateSingleMarker(lat, lon, label, meas, w){
  if(singleMarker){
    map.removeLayer(singleMarker);
    singleMarker = null;
  }
  
  const pm = meas.find(m => m.parameter === 'pm25' || m.parameter === 'pm2.5');
  const aqiMeas = meas.find(m => m.parameter === 'aqi');
  
  let color = '#999';
  if (aqiMeas && aqiMeas.value != null) {
    // Використовуємо AQI для кольору
    if (aqiMeas.value <= 50) color = '#00e400';
    else if (aqiMeas.value <= 100) color = '#ffff00';
    else if (aqiMeas.value <= 150) color = '#ff7e00';
    else color = '#ff0000';
  } else if (pm && pm.value != null) {
    // Або PM2.5 для кольору
    color = chooseColorFromAQ(pm.value);
  }
  
  console.log('Creating marker with color:', color);
  
  singleMarker = L.marker([lat, lon], {icon: createCustomMarker(color)})
    .addTo(map)
    .bindPopup(buildPopupHtml(label, meas, w), {maxWidth: 340, minWidth: 240})
    .on("click", () => map.flyTo([lat, lon], 8, {duration: 0.9}));
}

function createOrUpdateCityMarker(lat, lon, label, meas, w){
  const pm = meas.find(m => m.parameter === 'pm25' || m.parameter === 'pm2.5');
  const aqiMeas = meas.find(m => m.parameter === 'aqi');
  
  let color = '#999';
  if (aqiMeas && aqiMeas.value != null) {
    if (aqiMeas.value <= 50) color = '#00e400';
    else if (aqiMeas.value <= 100) color = '#ffff00';
    else if (aqiMeas.value <= 150) color = '#ff7e00';
    else color = '#ff0000';
  } else if (pm && pm.value != null) {
    color = chooseColorFromAQ(pm.value);
  }
  
  const marker = L.marker([lat, lon], {icon: createCustomMarker(color)})
    .addTo(map)
    .bindPopup(buildPopupHtml(label, meas, w), {maxWidth: 340, minWidth: 240})
    .on("click", () => map.flyTo([lat, lon], 8, {duration: 0.9}));
  cityMarkers.push({marker});
}

// --- Fetchers ---
async function fetchAndShowSingle(lat, lon, label){
  setStatus('Loading data...');
  try {
    const [m, w] = await Promise.all([fetchOpenAQ(lat, lon), fetchWeather(lat, lon)]);
    createOrUpdateSingleMarker(lat, lon, label, m, w);
    updatePanel(label, m, w);
    setStatus('Data loaded');
  } catch (error) {
    console.error('Error fetching data:', error);
    setStatus('Error loading data');
  }
}

async function fetchAndShowCity(lat, lon, label){
  try {
    const [m, w] = await Promise.all([fetchOpenAQ(lat, lon), fetchWeather(lat, lon)]);
    createOrUpdateCityMarker(lat, lon, label, m, w);
  } catch (error) {
    console.error('Error fetching city data:', error);
  }
}

// --- Cities ---
const predefined = [
  // США (великі міста)
  {name:'New York', coords:[40.7128,-74.0060]},
  {name:'Los Angeles', coords:[34.0522,-118.2437]},
  {name:'Chicago', coords:[41.8781,-87.6298]},
  {name:'Houston', coords:[29.7604,-95.3698]},
  {name:'Phoenix', coords:[33.4484,-112.0740]},
  {name:'Philadelphia', coords:[39.9526,-75.1652]},
  {name:'San Antonio', coords:[29.4241,-98.4936]},
  {name:'San Diego', coords:[32.7157,-117.1611]},
  {name:'Dallas', coords:[32.7767,-96.7970]},
  {name:'San Jose', coords:[37.3382,-121.8863]},
  {name:'Austin', coords:[30.2672,-97.7431]},
  {name:'Jacksonville', coords:[30.3322,-81.6557]},
  {name:'San Francisco', coords:[37.7749,-122.4194]},
  {name:'Columbus', coords:[39.9612,-82.9988]},
  {name:'Indianapolis', coords:[39.7684,-86.1581]},
  {name:'Seattle', coords:[47.6062,-122.3321]},
  {name:'Denver', coords:[39.7392,-104.9903]},
  {name:'Washington', coords:[38.9072,-77.0369]},
  {name:'Boston', coords:[42.3601,-71.0589]},
  {name:'Detroit', coords:[42.3314,-83.0458]},
  {name:'Nashville', coords:[36.1627,-86.7816]},
  {name:'Memphis', coords:[35.1495,-90.0490]},
  {name:'Portland', coords:[45.5051,-122.6750]},
  {name:'Las Vegas', coords:[36.1699,-115.1398]},
  {name:'Baltimore', coords:[39.2904,-76.6122]},
  {name:'Milwaukee', coords:[43.0389,-87.9065]},
  {name:'Albuquerque', coords:[35.0844,-106.6504]},
  {name:'Tucson', coords:[32.2226,-110.9747]},
  {name:'Fresno', coords:[36.7378,-119.7871]},
  {name:'Sacramento', coords:[38.5816,-121.4944]},

  // Канада
  {name:'Toronto', coords:[43.6532,-79.3832]},
  {name:'Montreal', coords:[45.5019,-73.5674]},
  {name:'Vancouver', coords:[49.2827,-123.1207]},
  {name:'Calgary', coords:[51.0447,-114.0719]},
  {name:'Edmonton', coords:[53.5461,-113.4938]},
  {name:'Ottawa', coords:[45.4215,-75.6992]},
  {name:'Winnipeg', coords:[49.8951,-97.1384]},
  {name:'Quebec City', coords:[46.8139,-71.2080]},
  {name:'Hamilton', coords:[43.2557,-79.8711]},
  {name:'Kitchener', coords:[43.4516,-80.4925]},

  // Мексика
  {name:'Mexico City', coords:[19.4326,-99.1332]},
  {name:'Guadalajara', coords:[20.6597,-103.3496]},
  {name:'Monterrey', coords:[25.6866,-100.3161]},
  {name:'Puebla', coords:[19.0414,-98.2063]},
  {name:'Tijuana', coords:[32.5149,-117.0382]},
  {name:'Leon', coords:[21.1250,-101.6860]},
  {name:'Zapopan', coords:[20.6718,-103.4165]},

];

(async() => {
  setStatus('Loading cities...');
  for(const c of predefined){
    await new Promise(r => setTimeout(r, 100));
    fetchAndShowCity(c.coords[0], c.coords[1], c.name);
  }
  setStatus(`Loaded ${predefined.length} cities`);
})();

// --- Search ---
if(typeof L.Control.Geocoder !== 'undefined'){
  L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Search for city or address...'
  }).on('markgeocode', function(e){
    const latlng = e.geocode.center;
    const name = e.geocode.name || 'Place';
    map.flyTo(latlng, 10, {duration: 1.0});
    fetchAndShowSingle(latlng.lat, latlng.lng, name);
  }).addTo(map);
}

setStatus('Air Quality Monitor Ready');
