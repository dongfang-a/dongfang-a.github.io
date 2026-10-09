import {validCoordinates} from './weather-core.js';
const numeric='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const decimalPair=new RegExp(`^(${numeric})\\s*[,;|/\\s]\\s*(${numeric})$`);
const coordinateNumber=v=>typeof v==='number'||(typeof v==='string'&&v.trim())?Number(v):NaN;
function result(lat,lon,format,swap=false){
  if(swap&&Math.abs(lat)>90&&Math.abs(lat)<=180&&Math.abs(lon)<=90){[lat,lon]=[lon,lat];format+=' · 自动识别经度在前';}
  if(!validCoordinates(lat,lon))throw new Error('坐标超出范围：纬度须在 −90～90，经度须在 −180～180。');
  return {kind:'coordinates',lat,lon,format};
}
function angle(text,hemisphere=''){
  text=text.trim();
  if(!/^[+\-\d.\s°'":]+$/.test(text))throw new Error('坐标格式不完整，请检查度、分、秒及方向。');
  const parts=text.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)?.map(Number);
  if(!parts||parts.length>3)throw new Error('每个坐标应为十进制度、度分或度分秒。');
  const [d,m=0,s=0]=parts;
  if(m<0||m>=60||s<0||s>=60||(parts.length>1&&!Number.isInteger(d))||(parts.length===3&&!Number.isInteger(m)))throw new Error('坐标分、秒须小于 60，度分秒中的度和分须为整数。');
  const negative=d<0||text.startsWith('-'),southWest=/[SW]/.test(hemisphere);
  if((negative&&/[NE]/.test(hemisphere))||(text.startsWith('+')&&southWest))throw new Error('坐标符号与方向冲突。');
  return (Math.abs(d)+m/60+s/3600)*(negative||southWest?-1:1);
}
function directionPair(s){
  for(const [pattern,prefix] of [[/^([NS])\s*(.+?)\s*[,;/]?\s*([EW])\s*(.+)$/i,true],[/^([EW])\s*(.+?)\s*[,;/]?\s*([NS])\s*(.+)$/i,true],[/^(.+?)\s*([NS])\s*[,;/]?\s*(.+?)\s*([EW])$/i,false],[/^(.+?)\s*([EW])\s*[,;/]?\s*(.+?)\s*([NS])$/i,false]]){
    const m=s.match(pattern);if(!m)continue;
    const first=(prefix?m[1]:m[2]).toUpperCase(),second=(prefix?m[3]:m[4]).toUpperCase();
    const a=angle(prefix?m[2]:m[1],first),b=angle(prefix?m[4]:m[3],second);
    return /[NS]/.test(first)?result(a,b,'方向坐标 / 度分秒'):result(b,a,'方向坐标 / 度分秒');
  }
  return null;
}
function fromUrl(s){
  const url=new URL(s);
  // Only interpret known location parameters; never fetch a pasted URL.
  const pinned=s.match(/!3d([+-]?[\d.]+)!4d([+-]?[\d.]+)/);if(pinned)return result(Number(pinned[1]),Number(pinned[2]),'地图地点坐标');
  for(const key of ['query','q','ll','center']){const value=url.searchParams.get(key);if(value){const pair=value.trim().match(decimalPair);if(pair)return result(Number(pair[1]),Number(pair[2]),'地图链接坐标');}}
  if(url.searchParams.has('mlat')&&url.searchParams.has('mlon'))return result(coordinateNumber(url.searchParams.get('mlat')),coordinateNumber(url.searchParams.get('mlon')),'OpenStreetMap 坐标');
  const view=s.match(/@([+-]?[\d.]+),([+-]?[\d.]+)/)||url.hash.match(/map=\d+\/([+-]?[\d.]+)\/([+-]?[\d.]+)/);if(view)return result(Number(view[1]),Number(view[2]),'地图中心坐标');
  const address=url.searchParams.get('query')||url.searchParams.get('q');if(address)return {kind:'search',query:address};
  throw new Error('这个地图链接未包含坐标，请复制完整地点链接或地址；短链接暂不支持。');
}
export function parseLocation(input){
  const original=String(input).normalize('NFKC').trim();if(!original)throw new Error('请输入地址、邮编或坐标。');if(original.length>1000)throw new Error('位置输入过长，请输入地址或坐标。');
  if(/^https?:\/\//i.test(original))return fromUrl(original);
  if(/^[\[{]/.test(original)){try{const value=JSON.parse(original);if(value?.type==='Point'&&Array.isArray(value.coordinates))return result(coordinateNumber(value.coordinates[1]),coordinateNumber(value.coordinates[0]),'GeoJSON Point（经度在前）');if(value?.lat!==undefined&&(value.lon!==undefined||value.lng!==undefined))return result(coordinateNumber(value.lat),coordinateNumber(value.lon??value.lng),'带标签坐标');if(Array.isArray(value)&&value.length===2)return result(coordinateNumber(value[0]),coordinateNumber(value[1]),'十进制坐标',true);throw new Error('JSON 需要 lat/lon 或 GeoJSON Point 坐标。');}catch(e){if(e instanceof SyntaxError)throw new Error('JSON 坐标格式无效。');throw e;}}
  let s=original.replace(/^geo:/i,'').replace(/;u=.+$/i,'').replace(/[()[\]]/g,'').replace(/[−–]/g,'-').replace(/[′’‘]/g,"'").replace(/[″“”]/g,'"').replace(/度/g,'°').replace(/分/g,"'").replace(/秒/g,'"');
  const commaDecimals=s.match(/^([+-]?\d+,\d+)\s*(?:;|\s)\s*([+-]?\d+,\d+)$/);if(commaDecimals)return result(Number(commaDecimals[1].replace(',','.')),Number(commaDecimals[2].replace(',','.')),'十进制坐标（小数逗号）',true);
  let m=s.match(decimalPair);if(m)return result(Number(m[1]),Number(m[2]),'十进制坐标',true);
  const labelled=original.replace(/[−–]/g,'-');
  const latLabel=labelled.match(new RegExp(`(?:latitude|lat|纬度)\\s*[:=]?\\s*(${numeric})`,'i')),lonLabel=labelled.match(new RegExp(`(?:longitude|lng|lon|经度)\\s*[:=]?\\s*(${numeric})`,'i'));
  if(latLabel&&lonLabel)return result(Number(latLabel[1]),Number(lonLabel[1]),'带标签坐标');
  if(latLabel||lonLabel)throw new Error('需要同时提供纬度和经度。');
  m=s.match(/^([+-]\d{2}(?:\.\d+)?)([+-]\d{3}(?:\.\d+)?)\/?$/);if(m)return result(Number(m[1]),Number(m[2]),'ISO 6709 坐标');
  s=s.replace(/north|北纬|北/gi,'N').replace(/south|南纬|南/gi,'S').replace(/east|东经|东/gi,'E').replace(/west|西经|西/gi,'W');
  const directional=directionPair(s);if(directional)return directional;
  if(/^[\s+\-\d.°'":,;|/NSEW]+$/i.test(s)&&(/[NSEW°'":,;|/]/i.test(s))&&/\d/.test(s)){
    if(/[NSEW]/i.test(s)||s.endsWith(','))throw new Error('坐标格式不完整或方向有误，请提供纬度和经度。');
  }
  const components=s.split(/\s*[,;|/]\s*/);if(components.length===2&&components.every(t=>/^[+\-\d.\s°'":]+$/.test(t)))return result(angle(components[0]),angle(components[1]),'度分 / 度分秒',true);
  if(/^[+\-\d.\s°'":]+$/.test(s)){
    const chunks=s.trim().split(/\s+/);if(chunks.length===2&&chunks.some(t=>/[:°]/.test(t)))return result(angle(chunks[0]),angle(chunks[1]),'度 / 度分秒',true);
    const numbers=s.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g);if(numbers&&(numbers.length===4||numbers.length===6)){const half=numbers.length/2;return result(angle(numbers.slice(0,half).join(' ')),angle(numbers.slice(half).join(' ')),'度分 / 度分秒',true);}
    if(/[°'":,]/.test(s)||chunks.length>1)throw new Error('坐标格式不完整，请输入一对经纬度。');
  }
  return {kind:'search',query:original};
}
