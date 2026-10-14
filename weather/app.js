import {validNumber,number,convertTemperature,validCoordinates,cumulative,liquidPrecipitation,linePath,daySummary,axisRange,precipitationRanges} from './weather-core.js?v=20261013';
import {models,fetchForecast,fetchComparison} from './forecast-data.js?v=20261013';
import {parseLocation} from './location-parser.js';
import {geocode} from './geocoding.js';
const $=id=>document.getElementById(id);
const state={data:null,lat:47.542,lon:-122.015,start:0,unit:'C',request:0,selected:0,series:[],hidden:new Set()};
state.model='auto';state.place=null;state.comparison=null;state.comparisonRequest=0;
let W=1000,PW=912;
const L=42,R=46,T=3,H=106,PH=100;
let searchSequence=0,searchAbort=null;
const colors={dew:'#519e42',feels:'#b84d9d',temp:'#f00836',cloud:'#a7a7a7',pop:'#14add7',humidity:'#7fca0b',pressure:'#202329',accum:'#159acb',liquid:'#247f15',wind:'#428ced'};
const temp=n=>validNumber(n)?`${Math.round(convertTemperature(n,state.unit))}°`:'—';
const tickNumber=(value,step)=>{let digits=0;while(digits<6&&Math.abs(step*10**digits-Math.round(step*10**digits))>1e-7)digits++;return number(value,digits);};
const dateLabel=date=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(date+'T12:00:00Z'))+' '+Number(date.slice(5,7))+'/'+Number(date.slice(8,10));
const windDirection=n=>validNumber(n)?['北','东北','东','东南','南','西南','西','西北'][Math.round(n/45)%8]:'—';
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function updateLocationBookmark(lat,lon,place){
    const url=new URL(location.href);url.searchParams.delete('q');url.searchParams.set('lat',lat);url.searchParams.set('lon',lon);
    if(state.model==='auto')url.searchParams.delete('model');else url.searchParams.set('model',state.model);
    const namedPlace=place.label&&place.kind!=='coordinates'&&!['GPS 坐标','输入坐标'].includes(place.label);
    if(namedPlace){url.searchParams.set('name',place.label);url.searchParams.set('precision',place.precision);}
    else{url.searchParams.delete('name');url.searchParams.delete('precision');}
    document.title=`${namedPlace?place.label:`${lat.toFixed(6)}, ${lon.toFixed(6)}`} · 十天天气预报`;
    history.replaceState(null,'',url);
}
async function load(lat,lon,place={label:'GPS 坐标',precision:'输入坐标'}){if(!validCoordinates(lat,lon)){status('经纬度无效：纬度 −90～90，经度 −180～180。',true);return;}
  const request=++state.request;state.lat=lat;state.lon=lon;state.place=place;state.comparison=null;state.comparisonRequest++;$('comparison').hidden=true;$('compare').disabled=false;updateLocationBookmark(lat,lon,place);status('正在获取预报…');$('search').disabled=true;$('weather').hidden=true;
  try{const entry=await fetchForecast(lat,lon,state.model);if(request!==state.request)return;state.data=entry.data;state.lat=lat;state.lon=lon;state.start=0;
    $('location-meta').textContent=`${place.label} · ${place.precision} · ${lat.toFixed(6)}, ${lon.toFixed(6)} · ${state.data.timezone}`;
    $('grid-info').textContent=`网格中心 ${number(state.data.latitude,4)}, ${number(state.data.longitude,4)} · 海拔 ${number(state.data.elevation)} m · 获取时间 ${new Intl.DateTimeFormat('zh-CN',{timeZone:state.data.timezone,hour:'2-digit',minute:'2-digit'}).format(entry.at)}`;
    const validHours=state.data.hourly.time.filter((_,i)=>validNumber(state.data.hourly.temperature_2m[i]));
    $('source-info').textContent=`数据源：${models[entry.model]} · 经 Open-Meteo 获取 · 有效时段截至 ${validHours.at(-1).replace('T',' ')}（当地时间）${state.data.hourly.pressure_msl?.some(validNumber)?'':' · 本模型未提供海平面气压'}${entry.fallback?' · '+entry.fallback:''}`;
    $('weather').hidden=false;render();status(`${Math.min(10,state.data.daily.time.length)} 天连续逐小时预报`);
  }catch(e){if(request===state.request)status(e.name==='TimeoutError'?'请求超时，请重试。':e instanceof TypeError?'连接失败，请检查网络后重试。':e.message,true);}finally{if(request===state.request)$('search').disabled=false;}
}
function icon(kind,dark=false){const moon='<path d="M40 7A18 18 0 1 0 44 39A18 18 0 0 1 40 7Z" fill="#bbc8df" stroke="#8799b6"/>';const sun='<g fill="#ff8a1f"><circle cx="31" cy="23" r="12" fill="#ffb439" stroke="white" stroke-width="2"/>'+Array.from({length:8},(_,i)=>`<path d="M28 8L31 0L34 8Z" transform="rotate(${i*45} 31 23)"/>`).join('')+'</g>';const cloud='<path d="M9 35C1 35 2 25 9 25C8 14 24 13 27 22C39 18 44 35 34 35Z" fill="#e8e9eb" stroke="#a5a7aa" stroke-width="1.8"/>';const rain='<g stroke="#10b4da" stroke-width="2.5"><path d="M14 39L10 47M25 39L21 47M36 39L32 47"/></g>';return `<svg class="day-icon" viewBox="0 0 56 52" aria-hidden="true">${kind==='sun'?(dark?moon:sun):kind==='partly'?(dark?moon:sun)+cloud:kind==='rain'?cloud+rain:kind==='snow'?cloud+'<text x="13" y="49" fill="#59a5cf" font-size="16">❄ ❄</text>':kind==='storm'?cloud+'<path d="M25 37L20 44H26L21 51" fill="none" stroke="#e6a224" stroke-width="3"/>':kind==='fog'?cloud+'<path d="M5 40H42M10 45H38" stroke="#b6b9bc" stroke-width="2"/>':kind==='unknown'?'<text x="23" y="33" fill="#8a949b">—</text>':cloud}</svg>`;}
function visibleIndices(){const dates=new Set(state.data.daily.time.slice(state.start,state.start+10));return state.data.hourly.time.reduce((a,t,i)=>{if(dates.has(t.slice(0,10)))a.push(i);return a;},[]);}
function render(preserve=false){W=document.querySelector('.forecast-chart').getBoundingClientRect().width||1000;PW=W-L-R;const d=state.data.daily,h=state.data.hourly;state.indices=visibleIndices();state.count=state.indices.length;const indices=state.indices;
  $('previous').disabled=state.start===0;$('next').disabled=state.start>=Math.max(0,d.time.length-10);$('range-label').textContent=`${dateLabel(d.time[state.start])} — ${dateLabel(d.time[Math.min(state.start+9,d.time.length-1)])}`;
  $('daily').style.gridTemplateColumns=`repeat(${Math.min(10,d.time.length-state.start)},minmax(0,1fr))`;
  $('daily').innerHTML=d.time.slice(state.start,state.start+10).map((date,k)=>{const i=k+state.start,summary=daySummary(state.data,i);return `<button class="day-card" data-day="${k}" aria-pressed="false" title="按白天逐小时天气汇总；全天最严重天气：${summary.worst}" aria-label="${dateLabel(date)}，${summary.text}，${summary.night}，最高 ${temp(d.temperature_2m_max[i])}，最低 ${temp(d.temperature_2m_min[i])}"><span class="day-date">${dateLabel(date)}</span><span class="day-high">${temp(d.temperature_2m_max[i])}<span class="day-low"> | ${temp(d.temperature_2m_min[i])}${state.unit}</span></span>${icon(summary.kind,summary.dark)}<span class="day-desc">${summary.text}</span><span class="day-night">${summary.night}</span><span class="day-rain"><i class="rain-drop"></i>${number(d.precipitation_sum[i],1)} mm</span><span class="sun-times"><span title="日出 ${d.sunrise[i]?.slice(11)||'—'}">◒</span><span title="日落 ${d.sunset[i]?.slice(11)||'—'}">◓</span></span></button>`;}).join('');
  const values=key=>indices.map(i=>h[key]?.[i]??null),temperatureValues=key=>values(key).map(n=>convertTemperature(n,state.unit));
  const liquid=liquidPrecipitation(values('rain'),values('showers')),unit=`°${state.unit}`;
  state.series=[{id:'dew',name:'Dew Point',unit,values:temperatureValues('dew_point_2m'),panel:0},{id:'feels',name:'Feels Like',unit,values:temperatureValues('apparent_temperature'),panel:0},{id:'temp',name:'Temperature',unit,values:temperatureValues('temperature_2m'),panel:0},{id:'cloud',name:'Cloud Cover',unit:'%',values:values('cloud_cover'),panel:1,area:true},{id:'pop',name:'Chance of Precip.',unit:'%',values:values('precipitation_probability'),panel:1,area:true},{id:'humidity',name:'Humidity',unit:'%',values:values('relative_humidity_2m'),panel:1},{id:'pressure',name:'Pressure',unit:'hPa',values:values('pressure_msl'),panel:1,right:true},{id:'accum',name:'Precip. Accum. Total',unit:'mm',values:cumulative(liquid),panel:2,right:true},{id:'liquid',name:'Hourly Liquid Precip.',unit:'mm',values:liquid,panel:2},{id:'wind',name:'Wind Speed',unit:'km/h',values:values('wind_speed_10m'),panel:3}];
  $('panels').innerHTML=[0,1,2,3].map(panel=>renderPanel(panel)).join('');$('hour-slider').max=String(state.count-1);
  const localNow=new Intl.DateTimeFormat('sv-SE',{timeZone:state.data.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T')+':00';
  const current=indices.findIndex(i=>h.time[i]>=localNow);selectHour(preserve?state.selected:current<0?0:current);
  if(state.comparison)renderComparison();
}
const x=i=>L+(i+.5)*PW/state.count;
function renderPanel(panel){const series=state.series.filter(s=>s.panel===panel),all=series.filter(s=>!s.right).flatMap(s=>s.values),range=panel===1?{min:0,max:100,step:25}:axisRange(all,panel>1),rightSeries=series.find(s=>s.right),rightRange=rightSeries?.values.some(validNumber)?(panel===2?precipitationRanges(series.find(s=>!s.right).values,rightSeries.values).right:axisRange(rightSeries.values)):null;
  if(panel===0){const values=all.filter(validNumber),step=state.unit==='C'?5:10;range.step=step;range.min=values.length?Math.floor(Math.min(...values)/step)*step:0;range.max=values.length?Math.max(range.min+step,Math.ceil(Math.max(...values)/step)*step):step;}
  const y=(v,r=range)=>T+PH-(v-r.min)/(r.max-r.min)*PH;series.forEach(s=>{s.range=s.right?(rightRange||axisRange([])):range;s.y=v=>y(v,s.range);});
  let background='',grid='';const h=state.data.hourly;
  state.indices.forEach((k,i)=>{if(h.is_day[k]===0)background+=`<rect x="${L+i*PW/state.count}" y="${T}" width="${PW/state.count+.1}" height="${PH}" fill="#f5f5f5"/>`;if(h.time[k].endsWith('T00:00')||i===0)grid+=`<line x1="${L+i*PW/state.count}" x2="${L+i*PW/state.count}" y1="${T}" y2="${T+PH}" stroke="#dedfe1"/>`;else if(i%6===0)grid+=`<line x1="${L+i*PW/state.count}" x2="${L+i*PW/state.count}" y1="${T}" y2="${T+PH}" stroke="#ebedef"/>`;});
  const ticks=Array.from({length:Math.round((range.max-range.min)/range.step)+1},(_,i)=>{const value=range.min+range.step*i,pos=y(value);return `<line x1="${L}" x2="${W-R}" y1="${pos}" y2="${pos}" stroke="#e6e7e9"/><text x="${L-6}" y="${Math.max(10,pos+3)}" text-anchor="end">${tickNumber(value,range.step)}${panel===0?` ${state.unit}`:panel===1?'%':''}</text>`;}).join('')+(rightRange?Array.from({length:Math.round((rightRange.max-rightRange.min)/rightRange.step)+1},(_,i)=>{const v=rightRange.min+rightRange.step*i;return `<text x="${W-R+5}" y="${Math.max(10,y(v,rightRange)+3)}">${tickNumber(v,rightRange.step)}</text>`;}).join(''):'');
  const curves=series.map(s=>{const path=linePath(s.values,x,s.y);let area='';if(s.area){let start=-1;const areas=[];for(let i=0;i<=s.values.length;i++){if(validNumber(s.values[i])&&start<0)start=i;if(!validNumber(s.values[i])&&start>=0){const end=i-1,segment=linePath(s.values.slice(start,i),j=>x(j+start),s.y);areas.push(`<path d="M${x(start)},${T+PH} ${segment.replace(/^M/,'L')} L${x(end)},${T+PH}Z" fill="${colors[s.id]}" fill-opacity="${s.id==='cloud'?'.32':'.27'}"/>`);start=-1;}}area=areas.join('');}
    let arrows='';if(s.id==='wind')arrows=s.values.map((v,i)=>validNumber(v)&&validNumber(h.wind_direction_10m[state.indices[i]])&&i%3===0?`<path d="M-4 3L0 -4L4 3L0 1Z" fill="#1268b0" transform="translate(${x(i)} ${s.y(v)}) rotate(${h.wind_direction_10m[state.indices[i]]+180})"/>`:'').join('');
    return `<g data-series="${s.id}" ${state.hidden.has(s.id)?'visibility="hidden"':''}>${area}<path d="${path}" fill="none" stroke="${colors[s.id]}" stroke-width="${s.id==='temp'?1.5:1.1}" stroke-linejoin="round"/>${arrows}<circle data-point="${s.id}" r="2" fill="${colors[s.id]}"/><text data-value-label="${s.id}" class="series-label" x="${W-R-7}" y="${T+13+series.indexOf(s)*14}" text-anchor="end"></text></g>`;}).join('');
  return `<div class="panel" data-panel="${panel}"><svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${['温度、体感与露点','云量、降水概率、湿度与海平面气压（右轴）','每小时液态降水（左轴）与累计液态降水（右轴）','风速及风向箭头'][panel]}；数值可通过下方时间滑块查看"><defs><clipPath id="clip-${panel}"><rect x="${L}" y="${T}" width="${PW}" height="${PH}"/></clipPath></defs>${background}${grid}${ticks}<g clip-path="url(#clip-${panel})">${curves}<line class="cursor" x1="${L}" x2="${L}" y1="${T}" y2="${T+PH}"/></g></svg><div class="legend">${series.map(s=>`<button data-toggle="${s.id}" ${s.values.some(validNumber)?'':'disabled'} aria-pressed="${!state.hidden.has(s.id)}" title="${s.name}${s.right?'，读取右侧坐标轴':''}"><i style="background:${colors[s.id]}"></i>${s.name} (${s.unit})${s.values.some(validNumber)?(s.right?' · 右轴':''):' · —'}</button>`).join('')}</div></div>`;
}
function selectHour(index){state.selected=Math.max(0,Math.min(state.count-1,index));const j=state.selected,k=state.indices[j],time=state.data.hourly.time[k],position=x(j);
  $('hover-time').textContent=time.replace('T',' ')+' · 当地时间';$('slider-time').textContent=time.replace('T',' ');$('hour-slider').value=j;
  document.querySelectorAll('.cursor').forEach(line=>{line.setAttribute('x1',position);line.setAttribute('x2',position);});
  state.series.forEach(s=>{const v=s.values[j],point=document.querySelector(`[data-point="${s.id}"]`),label=document.querySelector(`[data-value-label="${s.id}"]`);if(validNumber(v)){point.setAttribute('cx',position);point.setAttribute('cy',s.y(v));point.setAttribute('visibility','inherit');}else point.setAttribute('visibility','hidden');label.textContent=`${number(v,s.id==='pressure'||s.unit==='mm'?1:0)} ${s.unit}`;label.style.fill=colors[s.id];});
  for(let panel=0;panel<4;panel++){
    const labels=state.series.filter(s=>s.panel===panel&&!state.hidden.has(s.id)&&validNumber(s.values[j])).map(s=>({id:s.id,y:Math.max(T+12,Math.min(T+PH-3,s.y(s.values[j])-3))})).sort((a,b)=>a.y-b.y);
    labels.forEach((label,i)=>{if(i)label.y=Math.max(label.y,labels[i-1].y+12);});
    for(let i=labels.length-1;i>=0;i--){labels[i].y=Math.min(labels[i].y,i===labels.length-1?T+PH-3:labels[i+1].y-12);document.querySelector(`[data-value-label="${labels[i].id}"]`).setAttribute('y',labels[i].y);}
  }
  document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(state.data.daily.time[state.start+Number(b.dataset.day)]===time.slice(0,10))));
  $('readout').innerHTML=[0,1,2,3].map(panel=>`<p><strong>${['温度','水汽与气压','液态降水','风'][panel]}</strong>${state.series.filter(s=>s.panel===panel&&!state.hidden.has(s.id)).map(s=>`<span style="color:${colors[s.id]}">${s.name} ${number(s.values[j],s.unit==='mm'||s.id==='pressure'?1:0)} ${s.unit}</span>`).join('')}${panel===3?`<span>来自${windDirection(state.data.hourly.wind_direction_10m[k])}方</span>`:''}</p>`).join('');
}
function chooseLocation(candidate){searchSequence++;state.request++;searchAbort?.abort();$('candidates').hidden=true;return load(candidate.lat,candidate.lon,candidate);}
function showCandidates(candidates){
  $('candidate-list').replaceChildren();
  candidates.forEach(c=>{const button=document.createElement('button'),title=document.createElement('span'),detail=document.createElement('small');button.type='button';title.textContent=c.label;detail.textContent=`${c.precision} · ${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`;button.append(title,detail);button.addEventListener('click',()=>chooseLocation(c));$('candidate-list').append(button);});
  $('candidates').hidden=false;status(`找到 ${candidates.length} 个地点，请选择匹配项。`);
}
async function searchLocation(input){
  const sequence=++searchSequence;state.request++;searchAbort?.abort();searchAbort=new AbortController();$('candidates').hidden=true;
  try{const parsed=parseLocation(input);if(parsed.kind==='coordinates'){await chooseLocation({...parsed,label:parsed.format,precision:'WGS84 坐标'});return;}
    $('search').disabled=true;status('正在匹配地址或邮编…');
    const candidates=await geocode(parsed.query,AbortSignal.any([searchAbort.signal,AbortSignal.timeout(20000)]));if(sequence!==searchSequence)return;
    if(!candidates.length){status('未找到匹配地点。请补充城市、州／省或国家，或输入坐标。',true);return;}
    if(candidates.length===1)await chooseLocation(candidates[0]);else showCandidates(candidates);
  }catch(e){if(sequence===searchSequence)status(e.name==='TimeoutError'?'地点查询超时，请重试。':e.name==='AbortError'?'查询已取消。':e instanceof TypeError?'地点查询连接失败，请检查网络后重试。':e.message,true);}
  finally{if(sequence===searchSequence)$('search').disabled=false;}
}
$('location-form').addEventListener('submit',e=>{e.preventDefault();searchLocation($('location-input').value);});
$('close-candidates').addEventListener('click',()=>{$('candidates').hidden=true;status('可补充地址信息后重新查询。');});
$('previous').addEventListener('click',()=>{state.start=Math.max(0,state.start-1);render();});$('next').addEventListener('click',()=>{state.start=Math.min(Math.max(0,state.data.daily.time.length-10),state.start+1);render();});
$('daily').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;const date=state.data.daily.time[state.start+Number(b.dataset.day)];const j=state.indices.findIndex(k=>state.data.hourly.time[k]===date+'T12:00');selectHour(j<0?0:j);});
$('panels').addEventListener('click',e=>{const b=e.target.closest('[data-toggle]');if(!b)return;const id=b.dataset.toggle;if(state.hidden.has(id))state.hidden.delete(id);else state.hidden.add(id);document.querySelector(`[data-series="${id}"]`).setAttribute('visibility',state.hidden.has(id)?'hidden':'visible');b.setAttribute('aria-pressed',String(!state.hidden.has(id)));selectHour(state.selected);});
function inspectPointer(e){const svg=e.target.closest('.plot');if(!svg)return;const rect=svg.getBoundingClientRect(),relative=(e.clientX-rect.left)*W/rect.width;selectHour(Math.round((relative-L)/PW*state.count-.5));}
$('panels').addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)inspectPointer(e);});$('panels').addEventListener('pointerdown',inspectPointer);
$('hour-slider').addEventListener('input',()=>selectHour(Number($('hour-slider').value)));
$('model').addEventListener('change',()=>{state.model=$('model').value;load(state.lat,state.lon,state.place||undefined);});
$('compare').addEventListener('click',async()=>{
  const request=++state.comparisonRequest;$('compare').disabled=true;$('comparison').hidden=false;$('comparison').textContent='正在获取各模型及 NWS 预报…';
  const result=await fetchComparison(state.lat,state.lon);if(request!==state.comparisonRequest)return;state.comparison=result;$('compare').disabled=false;renderComparison();
});
function renderComparison(){
  const results=state.comparison,dates=state.data.daily.time.slice(state.start,state.start+10),section=$('comparison');section.replaceChildren();
  const note=document.createElement('p');note.textContent='模型：当地自然日最高 / 最低温，全天降水水当量。NWS：白天最高 / 当晚最低温；其日期和温度口径不同。— 表示未提供。模型间差异表示预报分歧，不能据此判断谁更准确。';section.append(note);
  const scroll=document.createElement('div');scroll.className='comparison-scroll';const table=document.createElement('table'),head=table.createTHead().insertRow();
  for(const text of ['日期','NOAA NBM','NOAA GFS','ECMWF IFS','NWS 官方预报']){const th=document.createElement('th');th.textContent=text;head.append(th);}
  const body=table.createTBody();for(const date of dates){const row=body.insertRow();row.insertCell().textContent=dateLabel(date);
    for(const key of ['nbm','gfs','ecmwf','nws']){const cell=row.insertCell(),value=results[key].value;if(!value){cell.textContent='不可用';cell.title=results[key].error;continue;}
      if(key==='nws'){const day=value.days.find(d=>d.date===date);cell.textContent=day?`${temp(day.high)} / ${temp(day.low)}${state.unit} · 白天 ${day.day||'—'}（${number(day.dayPop)}%）；夜间 ${day.night||'—'}（${number(day.nightPop)}%）`:'—';}
      else{const d=value.data.daily,i=d.time.indexOf(date);cell.textContent=i<0?'—':`${temp(d.temperature_2m_max[i])} / ${temp(d.temperature_2m_min[i])}${state.unit} · ${number(d.precipitation_sum[i],1)} mm`;}
    }
  }scroll.append(table);section.append(scroll);
  for(const key of ['nbm','gfs','ecmwf','nws']){const p=document.createElement('p'),result=results[key];p.textContent=`${key==='nws'?'NWS':models[key]}：${result.error|| (key==='nws'?`发布更新时间 ${result.value.updated}`:`获取时间 ${new Date(result.value.at).toLocaleString()}（此时间不是模型起报时间）`)}`;section.append(p);}
  if(results.nws.value){const a=document.createElement('a');a.href=results.nws.value.url;a.textContent='NWS 原始预报';a.target='_blank';a.rel='noopener noreferrer';section.append(a);}
}
function setUnit(unit){state.unit=unit;$('celsius').setAttribute('aria-pressed',String(unit==='C'));$('fahrenheit').setAttribute('aria-pressed',String(unit==='F'));try{localStorage.setItem('weather-unit',unit);}catch{}if(state.data)render(true);if(state.comparison)renderComparison();}
$('celsius').addEventListener('click',()=>setUnit('C'));$('fahrenheit').addEventListener('click',()=>setUnit('F'));try{if(localStorage.getItem('weather-unit')==='F')setUnit('F');}catch{}
const query=new URLSearchParams(location.search),lat=query.has('lat')?Number(query.get('lat')):47.542,lon=query.has('lon')?Number(query.get('lon')):-122.015;
state.model=['auto','nbm','gfs','ecmwf'].includes(query.get('model'))?query.get('model'):'auto';$('model').value=state.model;
const bookmarkName=query.get('name')?.trim().slice(0,500),bookmarkPlace=bookmarkName?{label:bookmarkName,precision:query.get('precision')?.slice(0,100)||'收藏地点'}:undefined;
if(bookmarkName)document.title=`${bookmarkName} · 十天天气预报`;
$('location-input').value=query.get('q')||`${lat}, ${lon}`;
if(query.has('q'))searchLocation(query.get('q'));else if(query.get('lat')===''||query.get('lon')==='')status('链接坐标为空，请输入地点。',true);else load(lat,lon,bookmarkPlace);
new ResizeObserver(()=>{if(state.data&&!$('weather').hidden){const width=document.querySelector('.forecast-chart').getBoundingClientRect().width;if(Math.abs(width-W)>1)render(true);}}).observe(document.querySelector('.forecast-chart'));
