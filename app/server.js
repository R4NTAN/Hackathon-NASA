import path from 'path';
import express from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';

const OPENWEATHER_API_KEY = 'f96276a10ff40c3e256ba7991d7df571';
const WEATHERBIT_API_KEY = '805f6b750ee44623aaff33c34ff0eef4';

const app = express();
const __dirname = path.resolve();
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const weatherbit_data = new Map();
const openweather_data = new Map();
const openweather2_data = new Map();
const weatherbit_forecast_data = new Map();

app.get('/getWeatherbit', async (req, res) => {
  const { lat, lon } = req.query;
  const key = `${lat},${lon}`;
  try {
    if (!weatherbit_data.has(key)) {
      const response = await axios.get(
        `https://api.weatherbit.io/v2.0/current/airquality?lat=${lat}&lon=${lon}&key=${WEATHERBIT_API_KEY}`
      );
      weatherbit_data.set(key, response.data);
    }
    res.json(weatherbit_data.get(key));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Weatherbit data' });
  }
});

app.get('/getWeatherbit2', async (req, res) => {
  const { lat, lon } = req.query;
  const key = `${lat},${lon}`;
  try {
    if (!weatherbit_forecast_data.has(key)) {
      const response = await axios.get(
        `https://api.weatherbit.io/v2.0/forecast/airquality?lat=${lat}&lon=${lon}&key=${WEATHERBIT_API_KEY}`
      );
      weatherbit_forecast_data.set(key, response.data);
    }
    res.json(weatherbit_forecast_data.get(key));
  } catch (err) {
    console.error('Weatherbit forecast error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to fetch Weatherbit forecast data' });
  }
});

app.get('/getOpenweather', async (req, res) => {
  const { lat, lon } = req.query;
  const key = `${lat},${lon}`;
  try {
    if (!openweather_data.has(key)) {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=en`
      );
      openweather_data.set(key, response.data);
    }
    res.json(openweather_data.get(key));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OpenWeather data' });
  }
});

app.get('/getOpenweather2', async (req, res) => {
  const { lat, lon } = req.query;
  const key = `${lat},${lon}`;
  try {
    if (!openweather2_data.has(key)) {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=en`
      );
      openweather2_data.set(key, response.data);
    }
    res.json(openweather2_data.get(key));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OpenWeather forecast data' });
  }
});

const privateKey = fs.readFileSync('./certs/privatekey.key', 'utf8');
const certificate = fs.readFileSync('./certs/otpdayz_store.crt', 'utf8');
const ca = fs.readFileSync('./certs/otpdayz_store.ca-bundle', 'utf8');
const credentials = { key: privateKey, cert: certificate, ca };

const httpsServer = https.createServer(credentials, app);

try {
  httpsServer.listen(3001, () => {
    console.log("\x1b[32m", 'Server running on port 3001');
  });
} catch (e) {
  console.error(e);
}
