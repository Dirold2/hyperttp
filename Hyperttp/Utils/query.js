"use strict";export function appendQueryToUrl(o,n){try{const e=new URL(o);for(const r in n)if(Object.prototype.hasOwnProperty.call(n,r)){const t=n[r];if(t==null)continue;if(Array.isArray(t))for(const a of t)a!=null&&e.searchParams.append(r,String(a));else e.searchParams.set(r,String(t))}return e.toString()}catch{return o}}
//# sourceMappingURL=query.js.map
