import {validCoordinates} from './weather-core.js';
const cache=new Map();
export function photonCandidates(data){return (data.features??[]).map(feature=>{const p=feature.properties??{},[lon,lat]=feature.geometry?.coordinates??[];return {lat,lon,label:[p.name,p.housenumber&&p.street?`${p.housenumber} ${p.street}`:p.street,p.city||p.locality,p.state,p.postcode,p.country].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(', '),precision:p.housenumber?'门牌位置':p.type==='street'||p.osm_key==='highway'?'街道代表位置':p.osm_value==='postcode'?'邮编区域代表点':'地点／区域代表点',provider:'Photon / OpenStreetMap'};}).filter(c=>validCoordinates(c.lat,c.lon));}
export function meteoCandidates(data,postal=false){return (data.results??[]).map(p=>({lat:p.latitude,lon:p.longitude,label:[p.name,p.admin1,p.country].filter(Boolean).join(', '),precision:postal?'邮编区域代表点':'城镇代表位置',provider:'Open-Meteo / GeoNames'})).filter(c=>validCoordinates(c.lat,c.lon));}
export function dedupeCandidates(candidates){const seen=new Set();return candidates.filter(c=>{const key=`${c.lat.toFixed(4)},${c.lon.toFixed(4)},${c.label}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6);}
export async function geocode(query,signal,fetcher=fetch){
  const key=query.toLowerCase().trim();if(cache.has(key))return cache.get(key);
  const postal=/^(?:\d{4,6}(?:-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(query);
  const street=/\d+\s+[A-Za-z]|\b(street|road|avenue|ave|st|rd|blvd)\b|[路街巷号]/i.test(query);
  async function meteo(){const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:query.replace(/^(\d{5})-\d{4}$/,'$1'),count:'6',language:'zh',format:'json'});const r=await fetcher(url,{signal});if(!r.ok)throw new Error('地点查询服务暂时不可用。');return meteoCandidates(await r.json(),postal);}
  async function photon(){const url=new URL('https://photon.komoot.io/api/');url.search=new URLSearchParams({q:query,limit:'6'});const r=await fetcher(url,{signal});if(!r.ok)throw new Error('地址查询服务暂时不可用，请稍后重试。');return photonCandidates(await r.json());}
  let candidates;
  if(postal){candidates=await meteo();if(!candidates.length)candidates=await photon();}
  else {candidates=await photon();if(!candidates.length&&!street)candidates=await meteo();}
  candidates=dedupeCandidates(candidates);if(candidates.length)cache.set(key,candidates);return candidates;
}
