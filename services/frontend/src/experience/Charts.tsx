import { useId, useState } from 'react'
export function LineChart({values,secondary,lower,upper,labels,height=210,label='Illustrative growth',prefix='$'}:{values:number[],secondary?:number[],lower?:number[],upper?:number[],labels?:string[],height?:number,label?:string,prefix?:string}) {
  const id=useId().replace(/:/g,''),[hover,setHover]=useState<number|null>(null)
  const width=700,pad=25,all=[...values,...(secondary||[]),...(lower||[]),...(upper||[])].filter(Number.isFinite)
  const min=Math.min(...all)*.95,max=Math.max(...all)*1.05,range=Math.max(max-min,1)
  const x=(i:number)=>pad+i/Math.max(values.length-1,1)*(width-pad*2),y=(v:number)=>height-pad-(v-min)/range*(height-pad*2)
  const path=(data:number[])=>data.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const line=path(values),area=`${line} L ${x(values.length-1)},${height-pad} L ${pad},${height-pad}Z`
  return <div className="line-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onMouseLeave={()=>setHover(null)} onMouseMove={e=>{const box=e.currentTarget.getBoundingClientRect();setHover(Math.min(values.length-1,Math.max(0,Math.round(((e.clientX-box.left)/box.width*width-pad)/(width-pad*2)*(values.length-1)))))}}>
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d6b879" stopOpacity=".2"/><stop offset="100%" stopColor="#d6b879" stopOpacity="0"/></linearGradient></defs>
    {[0,1,2,3].map(n=><line key={n} x1={pad} x2={width-pad} y1={pad+n*(height-pad*2)/3} y2={pad+n*(height-pad*2)/3} stroke="#ffffff" strokeOpacity=".055" strokeDasharray="3 5"/>)}
    {upper&&lower&&<path d={`${path(upper)} ${lower.map((_,i)=>`L${x(lower.length-1-i)},${y(lower[lower.length-1-i])}`).join(' ')} Z`} fill="#d6b879" fillOpacity=".12"/>}
    <path d={area} fill={`url(#${id})`}/>{secondary&&<path d={path(secondary)} fill="none" stroke="#686e68" strokeWidth="1.5" strokeDasharray="5 5"/>}<path d={line} fill="none" stroke="#d6b879" strokeWidth="2.5" strokeLinejoin="round"/>
    <circle cx={x(values.length-1)} cy={y(values[values.length-1])} r="4" fill="#d6b879" stroke="#151815" strokeWidth="3"/>
    {hover!==null&&<g><line x1={x(hover)} x2={x(hover)} y1={pad} y2={height-pad} stroke="#d6b879" strokeOpacity=".4" strokeDasharray="3 4"/><circle cx={x(hover)} cy={y(values[hover])} r="4" fill="#eee2c1"/><rect x={Math.max(0,Math.min(width-130,x(hover)-65))} y="2" width="130" height="27" rx="5" fill="#272d27"/><text x={Math.max(65,Math.min(width-65,x(hover)))} y="20" textAnchor="middle" fill="#e9e7df" fontSize="12">{prefix}{values[hover].toLocaleString(undefined,{maximumFractionDigits:0})}{labels?.[hover]?` · ${labels[hover]}`:''}</text></g>}
  </svg>{labels&&<div className="chart-axis"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length/2)]}</span><span>{labels[labels.length-1]}</span></div>}</div>
}
export function MiniBars(){return <svg viewBox="0 0 300 110" aria-hidden="true"><defs><linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d6b879" stopOpacity=".9"/><stop offset="1" stopColor="#665537" stopOpacity=".2"/></linearGradient></defs>{[15,22,18,30,26,38,32,40,50,45,60,56,73,65,82,94,85,103].map((v,i)=><rect key={i} x={i*16+8} y={110-v} width="7" height={v} rx="2" fill="url(#bar-gradient)"/>)}</svg>}
