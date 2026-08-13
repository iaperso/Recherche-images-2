export type DirectKind='image'|'video'

type Post={
 uri:string
 cid:string
 text:string
 createdAt:string
 author:{handle:string;displayName:string;avatar:string|null}
 images?:{thumb:string;fullsize:string;alt:string}[]
 video?:{playlist:string|null;player:string|null;thumbnail:string|null;alt:string;aspectRatio:{width:number;height:number}|null}
 likeCount:number
 repostCount:number
}

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
const TIMEOUT=7000

function decode(v:string){return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\\u0026/g,'&').replace(/\\\//g,'/')}
function clean(v:string){return decode(v).replace(/[),.;]+$/,'')}

async function fetchText(url:string){
 const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT)
 try{const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml','accept-language':'ru-RU,ru;q=0.9,en;q=0.7'},redirect:'follow',cache:'no-store',signal:c.signal});if(!r.ok)return null;return{html:await r.text(),url:r.url}}
 catch{return null}finally{clearTimeout(t)}
}

function attrs(tag:string){const out=new Map<string,string>();for(const m of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))out.set(m[1].toLowerCase(),decode(m[2]));return out}
function meta(html:string,key:string){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=attrs(tag);if((a.get('property')||a.get('name')||'').toLowerCase()===key.toLowerCase()&&a.get('content'))return a.get('content')!}return null}
function cdnImage(url:string){try{const h=new URL(url).hostname.toLowerCase();return /userapi|vkuser|vkcdn|sun\d*[-.]/.test(h)}catch{return false}}
function mediaImage(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&(cdnImage(url)||/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(u.pathname+u.search))}catch{return false}}
function directVideo(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&/\.(?:m3u8|mp4)(?:$|\?)/i.test(u.pathname+u.search)}catch{return false}}
function idFromUrl(url:string){const m=url.match(/(?:photo|video|clip)(-?\d+)_([0-9]+)/i);return m?`${m[1]}_${m[2]}`:null}
function authorFromUrl(url:string){const id=idFromUrl(url);if(!id)return'vk';const owner=Number(id.split('_')[0]);return owner<0?`club${Math.abs(owner)}`:`id${owner}`}

function searchPageUrls(q:string,kind:DirectKind,page:number){
 const section=kind==='image'?'photos':'videos'
 const offset=Math.max(0,page)*40
 return [
  `https://vk.com/search?c%5Bq%5D=${encodeURIComponent(q)}&c%5Bsection%5D=${section}&c%5Boffset%5D=${offset}`,
  ...(kind==='video'?[`https://vk.com/search?c%5Bq%5D=${encodeURIComponent(q)}&c%5Bsection%5D=video&c%5Boffset%5D=${offset}`]:[])
 ]
}

function extractImageUrls(html:string){
 const text=decode(html);const out:string[]=[];const seen=new Set<string>()
 for(const m of text.matchAll(/https?:\/\/[^\s"'<>\\]+/gi)){const u=clean(m[0]);if(mediaImage(u)&&cdnImage(u)&&!seen.has(u)){seen.add(u);out.push(u)}if(out.length>=48)break}
 return out
}

function extractMediaLinks(html:string,kind:DirectKind){
 const text=decode(html);const out:string[]=[];const seen=new Set<string>()
 const add=(raw:string)=>{try{const u=new URL(raw,'https://vk.com');const s=u.toString();const ok=kind==='image'?/(?:\/|=)photo-?\d+_\d+/i.test(s):/(?:\/|=)(?:video|clip)-?\d+_\d+/i.test(s);if(ok&&!seen.has(s)){seen.add(s);out.push(s)}}catch{}}
 for(const m of text.matchAll(/href=["']([^"']+)["']/gi))add(m[1])
 const rawRe=kind==='image'?/(?:https?:\/\/vk\.com)?\/photo-?\d+_\d+/gi:/(?:https?:\/\/vk\.com)?\/(?:video|clip)-?\d+_\d+/gi
 for(const m of text.matchAll(rawRe))add(m[0])
 return out.slice(0,24)
}

async function normalizeVideoPage(url:string):Promise<Post|null>{
 const f=await fetchText(url);if(!f)return null
 const html=decode(f.html)
 const title=meta(html,'og:title')||''
 const desc=meta(html,'og:description')||title
 const thumb=meta(html,'og:image')||meta(html,'twitter:image')
 const candidates=[meta(html,'og:video'),meta(html,'og:video:url'),meta(html,'og:video:secure_url'),meta(html,'twitter:player')].filter(Boolean) as string[]
 for(const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/gi))candidates.unshift(clean(m[0]))
 const playlist=candidates.find(directVideo)||null
 const player=candidates.find(x=>{try{const u=new URL(x);return (u.hostname.includes('vk.com')||u.hostname.includes('vkvideo.ru'))&&!directVideo(x)}catch{return false}})||null
 if(!playlist&&!player)return null
 const a=authorFromUrl(f.url)
 return{uri:f.url,cid:Buffer.from(f.url).toString('base64url').slice(0,80),text:desc,createdAt:new Date().toISOString(),author:{handle:a,displayName:a,avatar:null},video:{playlist,player,thumbnail:thumb&&mediaImage(thumb)?thumb:null,alt:title,aspectRatio:null},likeCount:0,repostCount:0}
}

export async function searchVkDirect(q:string,kind:DirectKind,page=0){
 const pages=(await Promise.all(searchPageUrls(q,kind,page).map(fetchText))).filter(Boolean) as {html:string;url:string}[]
 if(kind==='image'){
  const seen=new Set<string>();const images:string[]=[]
  for(const p of pages)for(const u of extractImageUrls(p.html))if(!seen.has(u)){seen.add(u);images.push(u)}
  const posts:Post[]=images.slice(0,36).map((u,i)=>({uri:`vk-search:${encodeURIComponent(q)}:${page}:${i}`,cid:`vkimg-${page}-${i}`,text:q,createdAt:new Date().toISOString(),author:{handle:'vk',displayName:'VK',avatar:null},images:[{thumb:u,fullsize:u,alt:q}],likeCount:0,repostCount:0}))
  return{posts,cursor:posts.length?encodePage(page+1):null,scanned:pages.length,source:'vk-public-search'}
 }
 const links:string[]=[];const seen=new Set<string>()
 for(const p of pages)for(const u of extractMediaLinks(p.html,'video'))if(!seen.has(u)){seen.add(u);links.push(u)}
 const items=await Promise.all(links.slice(0,14).map(normalizeVideoPage))
 const posts=items.filter((x):x is Post=>Boolean(x))
 return{posts,cursor:links.length?encodePage(page+1):null,scanned:pages.length,source:'vk-public-search'}
}

export function encodePage(page:number){return Buffer.from(JSON.stringify({page}),'utf8').toString('base64url')}
export function decodePage(value:string|null){if(!value)return 0;try{const p=Number(JSON.parse(Buffer.from(value,'base64url').toString('utf8'))?.page||0);return Number.isFinite(p)&&p>=0?p:0}catch{return 0}}
