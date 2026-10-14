import {validNumber} from './weather-core.js?v=20261013';
export const models={auto:'自动（美国本土优先 NBM）',nbm:'NOAA NBM',gfs:'NOAA GFS Seamless',ecmwf:'ECMWF IFS 0.25°',best:'Open-Meteo Best Match'};
const ids={nbm:'ncep_nbm_conus',gfs:'gfs_seamless',ecmwf:'ecmwf_ifs025'};
const cache=new Map();
export const nbmCandidate=(lat,lon)=>lat>=24&&lat<=50&&lon>=-125&&lon<=-66;
export function forecastUrl(lat,lon,model){
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),timezone:'auto',forecast_days:'16',cell_selection:'land',hourly:'temperature_2m,apparent_temperature,dew_point_2m,cloud_cover,precipitation_probability,relative_humidity_2m,pressure_msl,rain,showers,precipitation,snowfall,weather_code,wind_speed_10m,wind_direction_10m,is_day',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset'}).toString();
  if(ids[model])url.searchParams.set('models',ids[model]);return url;
}
export function trimCoverage(data){
  const times=data.hourly?.time,temps=data.hourly?.temperature_2m;
  if(!times?.length||!temps?.some(validNumber)||!data.daily?.time?.length)throw new Error('此模型未提供该地点的有效预报。');
  const dates=new Set(times.filter((_,i)=>validNumber(temps[i])).map(t=>t.slice(0,10)));
  const keep=data.daily.time.map((t,i)=>dates.has(t)?i:-1).filter(i=>i>=0);
  return {...data,daily:Object.fromEntries(Object.entries(data.daily).map(([k,v])=>[k,keep.map(i=>v[i])]))};
}
async function json(url){
  const key=String(url),cached=cache.get(key);if(cached&&Date.now()-cached.at<600000)return cached;
  const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/geo+json, application/json'}});
  if(!r.ok)throw new Error(r.status===429?'查询频率过高，请稍后重试。':`接口返回 ${r.status}`);
  const entry={data:await r.json(),at:Date.now()};cache.set(key,entry);return entry;
}
export async function fetchForecast(lat,lon,requested='auto'){
  if(requested==='nbm'&&!nbmCandidate(lat,lon))throw new Error('NOAA NBM 仅覆盖美国本土，请选择自动、GFS 或 ECMWF。');
  const model=requested==='auto'?(nbmCandidate(lat,lon)?'nbm':'best'):requested;
  try{const entry=await json(forecastUrl(lat,lon,model));return {...entry,data:trimCoverage(entry.data),model};}
  catch(e){if(requested!=='auto'||model!=='nbm')throw e;
    const entry=await json(forecastUrl(lat,lon,'best'));return {...entry,data:trimCoverage(entry.data),model:'best',fallback:`NBM 不可用（${e.message}），已使用 Best Match`};}
}
export function nwsDays(periods){
  const days=new Map();
  for(const p of periods){let date=p.startTime.slice(0,10);if(!p.isDaytime&&Number(p.startTime.slice(11,13))<12)date=new Date(Date.parse(date+'T12:00Z')-86400000).toISOString().slice(0,10);
    if(!days.has(date))days.set(date,{date});const row=days.get(date),c=validNumber(p.temperature)?p.temperatureUnit==='F'?(p.temperature-32)*5/9:p.temperature:null;
    row[p.isDaytime?'high':'low']=c;row[p.isDaytime?'day':'night']=p.shortForecast;
    row[p.isDaytime?'dayPop':'nightPop']=p.probabilityOfPrecipitation?.value??null;
  }return [...days.values()];
}
export async function fetchNws(lat,lon){
  const point=(await json(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`)).data;
  const url=point.properties?.forecast;if(!url||new URL(url).origin!=='https://api.weather.gov')throw new Error('NWS 未覆盖此地点。');
  const entry=await json(url);if(!entry.data.properties?.periods?.length)throw new Error('NWS 暂未返回预报。');
  return {days:nwsDays(entry.data.properties.periods),updated:entry.data.properties.updateTime,url};
}
export async function fetchComparison(lat,lon){
  const keys=['nbm','gfs','ecmwf','nws'];const results=await Promise.allSettled(keys.map(k=>k==='nws'?fetchNws(lat,lon):k==='nbm'&&!nbmCandidate(lat,lon)?Promise.reject(new Error('美国本土覆盖范围之外')):fetchForecast(lat,lon,k)));
  return Object.fromEntries(keys.map((k,i)=>[k,results[i].status==='fulfilled'?{value:results[i].value}:{error:results[i].reason.message}]));
}
