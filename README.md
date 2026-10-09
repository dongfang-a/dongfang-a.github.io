# GPS Weather Forecast

Live website: https://dongfang-a.github.io/weather/

Static HTML, CSS and JavaScript for a ten-day weather forecast chart, with address, ZIP code and GPS coordinate search.

The `weather/` directory contains the application. No build step, server or API key is required. GitHub Pages publishes the `main` branch from the repository root, and `.nojekyll` disables Jekyll processing.

Weather data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
Address data: [Photon](https://github.com/komoot/photon) / [OpenStreetMap](https://www.openstreetmap.org/copyright), and [GeoNames](https://www.geonames.org/) via Open-Meteo.

Public APIs have usage limits and availability constraints. Open-Meteo's free endpoint is for non-commercial use. Location matches identify an address, street or regional representative point; ZIP codes do not identify individual buildings.
