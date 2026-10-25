import type { CSSProperties, ReactNode } from 'react'
const paths: Record<string,ReactNode> = {
  home:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  book:<><path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z"/><path d="M12 5v15"/></>,
  chart:<path d="M4 3v17h17M7 14l4-5 4 3 6-8"/>,
  spark:<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>,
  progress:<><path d="M9 3h6v7a3 3 0 0 1-6 0V3Z"/><path d="M9 5H5v3a4 4 0 0 0 4 4m6-7h4v3a4 4 0 0 1-4 4m-3 1v6m-4 2h8"/></>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>, up:<path d="M6 18 18 6M6 6h12v12"/>,
  chevron:<path d="m9 5 7 7-7 7"/>, search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  close:<path d="m6 6 12 12M6 18 18 6"/>, menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
  check:<path d="m5 12 4 4L19 6"/>, clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  shield:<><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 2 4 3-1 1-3 4-1 1-3-3-2 1-4-3-1-2 1-2-3Z"/></>,
  play:<path d="m9 5 11 7-11 7V5Z"/>, download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01"/></>,
}
export function Icon({name,size=20,className='',style}:{name:string,size?:number,className?:string,style?:CSSProperties}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name] || paths.spark}</svg> }
export function Brand({compact=false}:{compact?:boolean}) {return <span className="brand"><svg width="31" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 25V7h8.5c10 0 10 13 0 13H9m1-13v18m5-18v13" stroke="currentColor" strokeWidth="2.7"/><path d="M22 7h5M24.5 4.5v5" stroke="currentColor" strokeWidth="1.5"/></svg>{!compact&&<span>perbillion<span className="brand-period">.</span></span>}</span>}
