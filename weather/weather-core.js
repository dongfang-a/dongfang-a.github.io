export const validNumber = n => typeof n === 'number' && Number.isFinite(n);
export const number = (n,digits=0) => validNumber(n) ? n.toFixed(digits) : '—';
export const convertTemperature = (n,unit) => validNumber(n) ? unit==='F'?n*9/5+32:n : null;
export const validCoordinates = (lat,lon) => Number.isFinite(lat)&&lat>=-90&&lat<=90&&Number.isFinite(lon)&&lon>=-180&&lon<=180;
export function cumulative(values) {
  let sum=0,complete=true;
  return values.map(n=>{if(!validNumber(n))complete=false;if(!complete)return null;sum+=n;return Math.round(sum*1000)/1000;});
}
export function liquidPrecipitation(rain,showers) {return rain.map((n,i)=>validNumber(n)&&validNumber(showers[i])?n+showers[i]:null);}
export function linePath(values,x,y) {
  let path='',previous=false;
  values.forEach((v,i)=>{if(validNumber(v)){path+=`${previous?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)} `;previous=true;}else previous=false;});
  return path;
}
export function condition(code) {
  if(code===0)return ['sun','晴'];if(code===1||code===2)return ['partly','局部多云'];if(code===3)return ['cloud','阴'];if([45,48].includes(code))return ['fog','雾'];if([51,53,55].includes(code))return ['rain','毛毛雨'];if([56,57,66,67].includes(code))return ['rain','冻雨'];if([61,63,65,80,81,82].includes(code))return ['rain','降雨'];if([71,73,75,77,85,86].includes(code))return ['snow','降雪'];if([95,96,97,99].includes(code))return ['storm','雷暴'];return ['unknown','暂无数据'];
}
export function axisRange(values,base=false){
  const data=values.filter(validNumber);if(!data.length)return {min:0,max:1,step:.25};
  const low=base?0:Math.min(...data),high=Math.max(...data),span=Math.max(high-low,base?.2:2),raw=span/4,power=10**Math.floor(Math.log10(raw));
  const step=[1,2,2.5,5,10].find(n=>n*power>=raw)*power;
  const min=base?0:Math.floor(low/step)*step,max=Math.max(min+step,Math.ceil(high/step)*step);
  return {min,max,step};
}
