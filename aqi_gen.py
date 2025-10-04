"""
pip3 install json
pip3 install json
pip3 install random
pip3 install math

python3 aqi_get.py
"""
import json, random, math

# EPA breakpoints  (μg/m³ except O₃/NO₂/SO₂ ppm, CO mg/m³)
BREAKS = json.loads("""
{
  "PM2.5": {
    "conc": [0, 12.1, 35.5, 55.5, 150.5, 250.5],
    "aqi" : [0, 50, 100, 150, 200, 300]
  },
  "PM10": {
    "conc": [0, 55, 155, 255, 355, 425],
    "aqi" : [0, 50, 100, 150, 200, 300]
  },
  "O3": {
    "conc": [0, 0.055, 0.071, 0.086, 0.106, 0.201],
    "aqi" : [0, 50, 100, 150, 200, 300]
  },
  "NO2": {
    "conc": [0, 0.054, 0.101, 0.361, 0.65, 1.25],
    "aqi" : [0, 50, 100, 150, 200, 300]
  },
  "SO2": {
    "conc": [0, 36, 76, 186, 305, 605],
    "aqi" : [0, 50, 100, 150, 200, 300]
  },
  "CO": {
    "conc": [0, 4.5, 9.5, 12.5, 15.5, 30.5],
    "aqi" : [0, 50, 100, 150, 200, 300]
  }
}
""")

CATEGORIES = json.loads("""
[
  {"lo": 0,   "hi": 50,  "name": "Good",       "colour": "#00e400"},
  {"lo": 51,  "hi": 100, "name": "Moderate",   "colour": "#ffff00"},
  {"lo": 101, "hi": 150, "name": "Unhealthy for Sensitive Groups", "colour": "#ff7e00"},
  {"lo": 151, "hi": 200, "name": "Unhealthy",  "colour": "#ff0000"},
  {"lo": 201, "hi": 300, "name": "Very Unhealthy", "colour": "#8f3f97"},
  {"lo": 301, "hi": 999, "name": "Hazardous",  "colour": "#7e0023"}
]
""")

# ---------- core math ----------
def _linear_aqi(conc, conc_breaks, aqi_breaks):
    """Conc → AQI using piece-wise linear interpolation."""
    for lo_c, hi_c, lo_a, hi_a in zip(conc_breaks, conc_breaks[1:],
                                      aqi_breaks, aqi_breaks[1:]):
        if lo_c <= conc <= hi_c:
            return round(((hi_a - lo_a)/(hi_c - lo_c)) * (conc - lo_c) + lo_a)
    return 500   # off-chart

def _aqi_from_pollutants(conc_dict):
    """Return dict with per-pollutant AQI and overall AQI."""
    aqi_per = {}
    for pol, conc in conc_dict.items():
        breaks = BREAKS[pol]
        aqi_per[pol] = _linear_aqi(conc, breaks["conc"], breaks["aqi"])
    dominant = max(aqi_per, key=aqi_per.get)
    overall  = aqi_per[dominant]
    return overall, dominant, aqi_per

def _category(aqi):
    for cat in CATEGORIES:
        if cat["lo"] <= aqi <= cat["hi"]:
            return cat["name"], cat["colour"]
    return "Hazardous", "#7e0023"

# ---------- pseudo-random generator ----------
def fake_conc():
    """Invent realistic-ish concentrations."""
    return {
      "PM2.5": random.uniform(5, 250),
      "PM10":  random.uniform(10, 400),
      "O3":    random.uniform(0.02, 0.20),
      "NO2":   random.uniform(0.01, 0.50),
      "SO2":   random.uniform(5, 300),
      "CO":    random.uniform(0.5, 15)
    }

def fake_aqi():
    """Return full fake report."""
    conc = fake_conc()
    aqi_val, dom, _ = _aqi_from_pollutants(conc)
    name, colour = _category(aqi_val)
    return {"AQI": aqi_val,
            "category": name,
            "colour": colour,
            "dominant": dom,
            "conc": conc}


# ---------- demo ----------
if __name__ == "__main__":
    for _ in range(100):
        print(fake_aqi())
