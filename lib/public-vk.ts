export type MediaKind='image'|'video'
export type PublicPhoto={thumb:string;fullsize:string;alt:string}
export type PublicVideo={playlist:string|null;player:string|null;thumbnail:string|null;alt:string;aspectRatio:{width:number;height:number}|null}
export type PublicPost={uri:string;cid:string;text:string;createdAt:string;author:{handle:string;displayName:string;avatar:string|null};images?:PublicPhoto[];video?:PublicVideo;likeCount:number;repostCount:number}

const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const TIMEOUT=6500
const MAX_PAGES=18

function unescapeHtml(value:string){return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x2F;/gi,'/').replace(/\\u0026/g,'&').replace(/\\\//g,'/')}
function cleanUrl(value:string){return unescapeHtml(value).replace(/[),.;]+$/,'')}
function allowedHost(host:string){const h=host.toLowerCase();return h==='vk.com'||h==='m.vk.com'||h.endsWith('.vk.com')||h==='vkvideo.ru'||h.endsWith('.vkvideo.ru')}
function isVkUrl(value:string){try{return allowedHost(new URL(value).hostname)}catch{return false}}
function mediaPath(value:string,kind:MediaKind){try{const u=new URL(value);const p=(u.pathname+u.search).toLowerCase();return kind==='video'?u.hostname.includes('vkvideo.ru')||/video|clip/.test(p):/photo|album/.test(p)}catch{return false}}

function decodeSearchHref(href:string){
 try{
  const absolute=new URL(unescapeHtml(href),'https://www.bing.com')
  if(allowedHost(absolute.hostname))return absolute.toString()
  if(absolute.hostname.includes('duckduckgo.com')){const target=absolute.searchParams.get('uddg');if(target&&isVkUrl(target))return target}
  if(absolute.hostname.endsWith('bing.com')&&absolute.pathname.startsWith('/ck/a')){
   const raw=absolute.searchParams.get('u')
   if(raw){
    if(/^https?:/i.test(raw)&&isVkUrl(raw))return raw
    if(raw.startsWith('a1')){try{const decoded=Buffer.from(raw.slice(2),'base64url').toString('utf8');if(isVkUrl(decoded))return decoded}catch{}}
   }
  }
 }catch{}
 return null
}

function urlsFromSearchHtml(html:string,kind:MediaKind){
 const normalized=unescapeHtml(html)
 const out:string[]=[]
 const seen=new Set<string>()
 const add=(raw:string|null)=>{if(!raw)return;const u=cleanUrl(raw);if(!isVkUrl(u)||!mediaPath(u,kind)||seen.has(u))return;seen.add(u);out.push(u)}
 for(const match of normalized.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi))add(decodeSearchHref(match[1]))
 for(const match of normalized.matchAll(/https?:\/\/(?:[\w.-]+\.)?(?:vk\.com|vkvideo\.ru)\/[^\s"'<>]+/gi))add(match[0])
 return out
}

async function fetchText(url:string){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT)
 try{
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml','accept-language':'fr-FR,fr;q=0.9,en;q=0.7'},redirect:'follow',cache:'no-store',signal:controller.signal})
  if(!r.ok)return null
  return {html:await r.text(),url:r.url}
 }catch{return null}finally{clearTimeout(timer)}
}

async function publicSearch(query:string,kind:MediaKind,page:number){
 const scoped=kind==='video'?`${query} video`:`${query} photo`
 const q1=`site:vk.com ${scoped}`
 const q2=kind==='video'?`site:vkvideo.ru ${query}`:`site:vk.com ${query} album photo`
 const first=1+Math.max(0,page)*20
 const offset=Math.max(0,page)*25
 const urls=[
  `https://www.bing.com/search?q=${encodeURIComponent(q1)}&count=25&first=${first}&adlt=off`,
  `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q1)}&s=${offset}&kp=-2`,
  `https://www.bing.com/search?q=${encodeURIComponent(q2)}&count=20&first=${first}&adlt=off`
 ]
 const pages=await Promise.all(urls.map(fetchText))
 const result:string[]=[];const seen=new Set<string>()
 for(const p of pages){if(!p)continue;for(const u of urlsFromSearchHtml(p.html,kind)){if(!seen.has(u)){seen.add(u);result.push(u)}}}
 return result.slice(0,MAX_PAGES)
}

function attrs(tag:string){const m=new Map<string,string>();for(const x of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))m.set(x[1].toLowerCase(),unescapeHtml(x[2]));return m}
function metaValues(html:string,key:string){const out:string[]=[];for(const t of html.match(/<meta\b[^>]*>/gi)||[]){const a=attrs(t);if((a.get('property')||a.get('name')||'').toLowerCase()===key.toLowerCase()&&a.get('content'))out.push(a.get('content')!)}return out}
function canonical(html:string){for(const t of html.match(/<link\b[^>]*>/gi)||[]){const a=attrs(t);if((a.get('rel')||'').toLowerCase().includes('canonical')&&a.get('href'))return a.get('href')!}return null}
function firstMeta(html:string,...keys:string[]){for(const key of keys){const v=metaValues(html,key)[0];if(v)return v}return null}
function directMediaUrl(value:string|null){if(!value)return false;try{const u=new URL(value);return /\.(?:m3u8|mp4)(?:$|\?)/i.test(u.pathname+u.search)}catch{return false}}
function imageLike(value:string){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&(/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(u.pathname+u.search)||/userapi|vkuser|sun\d*-/.test(u.hostname))}catch{return false}}
function videoLike(value:string){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&/\.(?:m3u8|mp4)(?:$|\?)/i.test(u.pathname+u.search)}catch{return false}}
function inferAuthor(url:string){
 try{
  const u=new URL(url);const p=decodeURIComponent(u.pathname)
  const id=p.match(/(?:photo|video|clip)(-?\d+)_/i)?.[1]
  if(id){const n=Number(id);return n<0?`club${Math.abs(n)}`:`id${n}`}
  const seg=p.split('/').filter(Boolean)[0]||'public'
  if(!/^(?:photo|video|clip|album|search)$/i.test(seg))return seg.replace(/^@+/,'')
 }catch{}
 return 'public'
}
function extractTimestamp(html:string){const iso=firstMeta(html,'article:published_time','og:published_time');if(iso&&!Number.isNaN(Date.parse(iso)))return new Date(iso).toISOString();const m=html.match(/(?:"date"|"datePublished"|datePublished)\s*[:=]\s*["']?(\d{9,13})/i);if(m){let n=Number(m[1]);if(n>1e12)n=Math.floor(n/1000);const d=new Date(n*1000);if(!Number.isNaN(d.getTime()))return d.toISOString()}return new Date().toISOString()}
function extractImages(html:string){
 const candidates=[...metaValues(html,'og:image'),...metaValues(html,'twitter:image')]
 const normalized=unescapeHtml(html)
 for(const m of normalized.matchAll(/https?:\/\/[^\s"'<>\\]+/gi)){const u=cleanUrl(m[0]);if(imageLike(u)&&/userapi|vkuser|sun\d*-/.test(u))candidates.push(u);if(candidates.length>18)break}
 const seen=new Set<string>();return candidates.map(cleanUrl).filter(x=>imageLike(x)&&!seen.has(x)&&(seen.add(x),true)).slice(0,4)
}
function extractVideo(html:string){
 const candidates=[...metaValues(html,'og:video'),...metaValues(html,'og:video:url'),...metaValues(html,'og:video:secure_url')]
 const players=[...metaValues(html,'twitter:player')]
 const normalized=unescapeHtml(html)
 for(const m of normalized.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/gi))candidates.unshift(cleanUrl(m[0]))
 const direct=candidates.find(videoLike)||null
 const player=[...players,...candidates].find(x=>{try{const u=new URL(x);return allowedHost(u.hostname)&&!directMediaUrl(x)}catch{return false}})||null
 const thumbnail=firstMeta(html,'og:image','twitter:image')
 const w=Number(firstMeta(html,'og:video:width')||0),h=Number(firstMeta(html,'og:video:height')||0)
 return {playlist:direct,player,thumbnail:thumbnail&&imageLike(thumbnail)?thumbnail:null,aspectRatio:w>0&&h>0?{width:w,height:h}:null}
}

async function normalizePage(pageUrl:string,kind:MediaKind):Promise<PublicPost|null>{
 const fetched=await fetchText(pageUrl);if(!fetched||!isVkUrl(fetched.url))return null
 const html=fetched.html;const canon=canonical(html);const url=canon&&isVkUrl(canon)?canon:fetched.url
 const title=firstMeta(html,'og:title','twitter:title')||'';const desc=firstMeta(html,'og:description','description','twitter:description')||title
 const author=inferAuthor(url)
 const base={uri:url,cid:Buffer.from(url).toString('base64url').slice(0,80),text:desc,createdAt:extractTimestamp(html),author:{handle:author,displayName:author,avatar:null},likeCount:0,repostCount:0}
 if(kind==='image'){
  const imgs=extractImages(html);if(!imgs.length)return null
  return {...base,images:imgs.map(x=>({thumb:x,fullsize:x,alt:desc}))}
 }
 const v=extractVideo(html);if(!v.playlist&&!v.player)return null
 return {...base,video:{playlist:v.playlist,player:v.player,thumbnail:v.thumbnail,alt:title,aspectRatio:v.aspectRatio}}
}

export async function searchPublicMedia(query:string,kind:MediaKind,page=0){
 const urls=await publicSearch(query,kind,page)
 const items=await Promise.all(urls.map(u=>normalizePage(u,kind)))
 const seen=new Set<string>();const posts=items.filter((x):x is PublicPost=>Boolean(x)).filter(x=>!seen.has(x.uri)&&(seen.add(x.uri),true))
 return {posts,cursor:posts.length?encodeCursor(page+1):null,scanned:urls.length}
}

function profileLinks(html:string,actor:string){
 const normalized=unescapeHtml(html);const out:{url:string;kind:MediaKind}[]=[];const seen=new Set<string>()
 for(const m of normalized.matchAll(/href=["']([^"']+)["']/gi)){
  try{
   const u=new URL(m[1],`https://vk.com/${actor}`);if(!allowedHost(u.hostname))continue
   const s=u.toString();const p=u.pathname+u.search
   const kind:MediaKind|null=/video|clip/i.test(p)?'video':/photo|album/i.test(p)?'image':null
   if(kind&&!seen.has(s)){seen.add(s);out.push({url:s,kind})}
  }catch{}
 }
 return out.slice(0,24)
}

export async function accountPublicMedia(actors:string[],page=0){
 const all:PublicPost[]=[]
 for(const actor of actors.slice(0,20)){
  const clean=actor.replace(/^@+/,'').replace(/^https?:\/\/(?:m\.)?vk\.com\//i,'').split(/[?#/]/)[0]
  if(!clean)continue
  const profile=page===0?await fetchText(`https://vk.com/${encodeURIComponent(clean)}`):null
  const direct=profile?profileLinks(profile.html,clean):[]
  const [photos,videos]=await Promise.all([publicSearch(clean,'image',page),publicSearch(clean,'video',page)])
  const targets=[...direct,...photos.map(url=>({url,kind:'image' as const})),...videos.map(url=>({url,kind:'video' as const}))]
  const unique=new Map<string,MediaKind>();for(const t of targets)if(!unique.has(t.url))unique.set(t.url,t.kind)
  const normalized=await Promise.all([...unique].slice(0,MAX_PAGES).map(([url,kind])=>normalizePage(url,kind)))
  for(const p of normalized)if(p)all.push({...p,author:{...p.author,handle:p.author.handle==='public'?clean:p.author.handle,displayName:p.author.displayName==='public'?clean:p.author.displayName}})
 }
 const seen=new Set<string>();const posts=all.filter(p=>!seen.has(p.uri)&&(seen.add(p.uri),true)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))
 return {posts,cursor:posts.length?encodeCursor(page+1):null}
}

export function encodeCursor(page:number){return Buffer.from(JSON.stringify({page}),'utf8').toString('base64url')}
export function decodeCursor(value:string|null){if(!value)return 0;try{const n=Number(JSON.parse(Buffer.from(value,'base64url').toString('utf8'))?.page||0);return Number.isFinite(n)&&n>=0?n:0}catch{return 0}}

export async function publicStatus(){const probe=await publicSearch('photography','image',0);return {ok:true,mode:'public-web',tokenRequired:false,searchReachable:probe.length>0,discovered:probe.length}}
