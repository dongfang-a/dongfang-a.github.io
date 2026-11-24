# dongfang-a · 项目导航

Homepage: https://dongfang-a.github.io/

| Project | Public page |
| --- | --- |
| 十天天气预报 | https://dongfang-a.github.io/weather/ |
| MushroomMap 野外采菇地图 | https://dongfang-a.github.io/mushroom-map/ |
| Sunset Highway 历史地图 | https://dongfang-a.github.io/sunset-highway-map/ |
| America’s Byways 风景公路地图 | https://dongfang-a.github.io/americas_byways/ |
| Space Needle 三维建筑 | https://dongfang-a.github.io/space-needle/ |
| 东方明珠三维漫游 | https://dongfang-a.github.io/oriental-pearl/ |

The root `index.html` is a lightweight project directory, styled by `home.css`. Project cards use ordinary links and work without JavaScript. Add future public pages as cards in `index.html` and update the project count.

When publishing weather updates, first pull the latest `main` and sync only into `weather/`. Preserve the root homepage and its assets.

## GPS Weather Forecast

Live website: https://dongfang-a.github.io/weather/

Static HTML, CSS and JavaScript for a ten-day weather forecast chart, with address, ZIP code and GPS coordinate search.

The `weather/` directory contains the application. No build step, server or API key is required. GitHub Pages publishes the `main` branch from the repository root, and `.nojekyll` disables Jekyll processing.

Weather data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
Address data: [Photon](https://github.com/komoot/photon) / [OpenStreetMap](https://www.openstreetmap.org/copyright), and [GeoNames](https://www.geonames.org/) via Open-Meteo.

Public APIs have usage limits and availability constraints. Open-Meteo's free endpoint is for non-commercial use. Location matches identify an address, street or regional representative point; ZIP codes do not identify individual buildings.
