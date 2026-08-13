export type DirectKind='image'|'video'

type VideoData={playlist:string|null;player:string|null;pageUrl:string|null;thumbnail:string|null;alt:string;aspectRatio:{width:number;height:number}|null}
type Post={uri:string;cid:string;text:string;createdAt:string;author:{handle:string;displayName:string;avatar:string|null};images?:{thumb:string;fullsize:string;alt:string}[];video?:VideoData;likeCount:number;repostCount:number}

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
const TIMEOUT=8000

function decode(v:string){return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\\u0026/g,'&').replace(/\\\//g,'/')}
function clean(v:string){return decode(v).replace(/[),.;]+$/,'')}
function safeIso(seconds:any){const n=Number(seconds||0);if(Number.isFinite(n)&&n>0){const d=new Date(n*1000);if(!Number.isNaN(d.getTime()))return d.toISOString()}return new Date().toISOString()}

async function fetchText(url:string){
 const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT)
 try{const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml','accept-language':'ru-RU,ru;q=0.9,en;q=0.7'},redirect:'follow',cache:'no-store',signal:c.signal});if(!r.ok)return null;return{html:await r.text(),url:r.url}}
 catch{return null}finally{clearTimeout(t)}
}

async function fetchJson(url:string){
 const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT)
 try{const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json,text/plain,*/*','origin':'https://live.vkvideo.ru','referer':'https://live.vkvideo.ru/search'},redirect:'follow',cache:'no-store',signal:c.signal});if(!r.ok)return null;return await r.json()}
 catch{return null}finally{clearTimeout(t)}
}

function attrs(tag:string){const out=new Map<string,string>();for(const m of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))out.set(m[1].toLowerCase(),decode(m[2]));return out}
function meta(html:string,key:string){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=attrs(tag);if((a.get('property')||a.get('name')||'').toLowerCase()===key.toLowerCase()&&a.get('content'))return a.get('content')!}return null}
function cdnImage(url:string){try{const h=new URL(url).hostname.toLowerCase();return /userapi|vkuser|vkcdn|sun\d*[-.]/.test(h)}catch{return false}}
function contentImage(url:string){try{const u=new URL(url.replace(/^http:/i,'https:'));if(!/^https:$/.test(u.protocol)||!cdnImage(u.toString()))return false;const s=(u.pathname+u.search).toLowerCase();if(/\.png(?:$|\?)/i.test(s))return false;if(/[?&]ava=1(?:&|$)/i.test(s))return false;if(/(?:logo|icon|emoji|sprite|blank|camera)/i.test(s))return false;return /\.(?:jpe?g|webp)(?:$|\?)/i.test(s)||/\/ig\d?\//i.test(s)}catch{return false}}
function mediaImage(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&(cdnImage(url)||/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(u.pathname+u.search)||u.hostname==='images.live.vkvideo.ru')}catch{return false}}
function directVideo(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&/\.(?:m3u8|mp4)(?:$|\?)/i.test(u.pathname+u.search)}catch{return false}}
function vkHost(host:string){const h=host.toLowerCase();return h==='vk.com'||h==='m.vk.com'||h.endsWith('.vk.com')||h==='vkvideo.ru'||h.endsWith('.vkvideo.ru')}
function idFromUrl(url:string){const m=url.match(/(?:photo|video|clip)(-?\d+)_([0-9]+)/i);return m?`${m[1]}_${m[2]}`:null}
function authorFromUrl(url:string){const id=idFromUrl(url);if(!id){try{const seg=new URL(url).pathname.split('/').filter(Boolean)[0];if(seg&&!['app','record','clips','video','videos','watch'].includes(seg))return seg.replace(/^@/,'')}catch{}return'vk'}const owner=Number(id.split('_')[0]);return owner<0?`club${Math.abs(owner)}`:`id${owner}`}
function modernVideoUrl(u:URL){return u.hostname.endsWith('vkvideo.ru')&&(/\/record\/[0-9a-f-]{16,}/i.test(u.pathname)||/\/(?:video|videos|watch|clip|clips)\//i.test(u.pathname)||/(?:\/|=)(?:video|clip)-?\d+_\d+/i.test(u.toString()))}
function isVideoPage(value:string){try{const u=new URL(value);return vkHost(u.hostname)&&(/(?:\/|=)(?:video|clip)-?\d+_\d+/i.test(u.toString())||modernVideoUrl(u))}catch{return false}}
function decodeSearchUrl(raw:string){let v=decode(raw);try{v=decodeURIComponent(v)}catch{}return v}

async function searchVkVideoLive(q:string,page:number){
 const limit=20,offset=Math.max(0,page)*limit
 const url=`https://api.live.vkvideo.ru/v8/search/channel?searchQuery=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`
 const data:any=await fetchJson(url)
 const channels:Array<any>=Array.isArray(data?.data?.channels)?data.data.channels:[]
 const streams:Record<string,any>=data?.refs?.streams&&typeof data.refs.streams==='object'?data.refs.streams:{}
 if(!channels.length)return null
 const posts:Post[]=channels.map((channel:any,index:number)=>{
  const stream=channel?.streamId?streams[String(channel.streamId)]:null
  const handle=String(channel?.url||`channel-${channel?.id||index}`)
  const title=String(stream?.title||channel?.nick||q)
  const thumb=String(stream?.previewUrl||channel?.coverUrl||channel?.avatarUrl||'')||null
  const pageUrl=`https://live.vkvideo.ru/${encodeURIComponent(handle)}`
  const streamId=String(channel?.streamId||stream?.id||channel?.id||index)
  return{
   uri:`vk-live:${handle}:${streamId}`,
   cid:`vklive-${streamId}`,
   text:title,
   createdAt:safeIso(stream?.startedAt||channel?.lastStreamAt),
   author:{handle,displayName:String(channel?.nick||handle),avatar:channel?.avatarUrl||null},
   video:{playlist:null,player:null,pageUrl,thumbnail:thumb,alt:title,aspectRatio:null},
   likeCount:Number(stream?.counters?.likes||0),
   repostCount:0
  }
 })
 return{posts,cursor:posts.length?encodePage(page+1):null,scanned:1,source:'vk-video-live-api'}
}

function searchPageUrls(q:string,kind:DirectKind,page:number){const section=kind==='image'?'photos':'videos';const offset=Math.max(0,page)*40;const base=[`https://vk.com/search?c%5Bq%5D=${encodeURIComponent(q)}&c%5Bsection%5D=${section}&c%5Boffset%5D=${offset}`,`https://m.vk.com/search?c%5Bq%5D=${encodeURIComponent(q)}&c%5Bsection%5D=${section}&c%5Boffset%5D=${offset}`];if(kind==='image'){base.push(`https://www.bing.com/images/search?q=${encodeURIComponent(`site:vk.com ${q}`)}&first=${1+page*35}&safeSearch=Off`);base.push(`https://search.brave.com/search?q=${encodeURIComponent(`site:vk.com ${q} photo`)}&source=web&offset=${Math.max(0,page)}`)}else{base.push(`https://www.bing.com/videos/search?q=${encodeURIComponent(`site:vk.com ${q} video`)}&first=${1+page*35}&safeSearch=Off`);base.push(`https://www.bing.com/videos/search?q=${encodeURIComponent(`site:vkvideo.ru ${q}`)}&first=${1+page*35}&safeSearch=Off`);base.push(`https://search.brave.com/search?q=${encodeURIComponent(`site:vk.com ${q} video`)}&source=web&offset=${Math.max(0,page)}`);base.push(`https://search.brave.com/search?q=${encodeURIComponent(`site:vkvideo.ru ${q}`)}&source=web&offset=${Math.max(0,page)}`)}return base}
function extractImageUrls(html:string){const text=decode(html);const out:string[]=[];const seen=new Set<string>();const add=(raw:string)=>{const u=clean(decodeSearchUrl(raw)).replace(/^http:/i,'https:');if(contentImage(u)&&!seen.has(u)){seen.add(u);out.push(u)}};for(const m of text.matchAll(/(?:murl|mediaurl|contentUrl)["'=: ]+\s*["'](https?:\\?\/\\?\/[^"'<>]+)["']/gi))add(m[1]);for(const m of text.matchAll(/https?:\/\/[^\s"'<>\\]+/gi))add(m[0]);return out.slice(0,72)}
function extractMediaLinks(html:string,kind:DirectKind){const text=decode(html);const out:string[]=[];const seen=new Set<string>();const add=(raw:string)=>{try{const candidate=decodeSearchUrl(raw).replace(/\\\//g,'/');const u=new URL(candidate,'https://vk.com');const s=u.toString();if(!vkHost(u.hostname))return;const ok=kind==='image'?/(?:\/|=)photo-?\d+_\d+/i.test(s):isVideoPage(s);if(ok&&!seen.has(s)){seen.add(s);out.push(s)}}catch{}};for(const m of text.matchAll(/href=["']([^"']+)["']/gi))add(m[1]);for(const m of text.matchAll(/(?:purl|pageUrl|url)["'=: ]+\s*["'](https?:\\?\/\\?\/[^"'<>]+)["']/gi))add(m[1]);const legacy=kind==='image'?/(?:https?:\/\/(?:m\.)?vk\.com)?\/photo-?\d+_\d+/gi:/(?:https?:\/\/(?:(?:m\.)?vk\.com|(?:[\w.-]+\.)?vkvideo\.ru))?\/(?:video|clip)-?\d+_\d+/gi;for(const m of text.matchAll(legacy))add(m[0]);if(kind==='video')for(const m of text.matchAll(/https?:\/\/(?:[\w.-]+\.)?vkvideo\.ru\/[^\s"'<>]+/gi))add(m[0]);return out.slice(0,64)}
async function normalizePhotoPage(url:string):Promise<Post|null>{const f=await fetchText(url);if(!f)return null;const html=decode(f.html);const image=[meta(html,'og:image'),meta(html,'twitter:image')].find(x=>x&&contentImage(x))||null;if(!image)return null;const src=image.replace(/^http:/i,'https:');const title=meta(html,'og:title')||meta(html,'description')||'';const a=authorFromUrl(f.url);return{uri:f.url,cid:Buffer.from(f.url).toString('base64url').slice(0,80),text:title,createdAt:new Date().toISOString(),author:{handle:a,displayName:a,avatar:null},images:[{thumb:src,fullsize:src,alt:title}],likeCount:0,repostCount:0}}
async function normalizeVideoPage(url:string):Promise<Post|null>{if(!isVideoPage(url))return null;const f=await fetchText(url);const html=f?decode(f.html):'';const title=meta(html,'og:title')||meta(html,'twitter:title')||'VK Video';const desc=meta(html,'og:description')||meta(html,'description')||title;const thumb=meta(html,'og:image')||meta(html,'twitter:image');const candidates=[meta(html,'og:video'),meta(html,'og:video:url'),meta(html,'og:video:secure_url'),meta(html,'twitter:player')].filter(Boolean) as string[];for(const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/gi))candidates.unshift(clean(m[0]));const playlist=candidates.find(directVideo)||null;const player=candidates.find(x=>{try{return vkHost(new URL(x).hostname)&&!directVideo(x)}catch{return false}})||null;const a=authorFromUrl(url);return{uri:url,cid:Buffer.from(url).toString('base64url').slice(0,80),text:desc,createdAt:new Date().toISOString(),author:{handle:a,displayName:a,avatar:null},video:{playlist,player,pageUrl:url,thumbnail:thumb&&mediaImage(thumb)?thumb.replace(/^http:/i,'https:'):null,alt:title,aspectRatio:null},likeCount:0,repostCount:0}}

export async function searchVkDirect(q:string,kind:DirectKind,page=0){
 if(kind==='video'){
  const live=await searchVkVideoLive(q,page)
  if(live?.posts?.length)return live
 }
 const pages=(await Promise.all(searchPageUrls(q,kind,page).map(fetchText))).filter(Boolean) as {html:string;url:string}[]
 if(kind==='image'){
  const links:string[]=[];const seenLinks=new Set<string>();for(const p of pages)for(const u of extractMediaLinks(p.html,'image'))if(!seenLinks.has(u)){seenLinks.add(u);links.push(u)}
  const normalized=(await Promise.all(links.slice(0,24).map(normalizePhotoPage))).filter((x):x is Post=>Boolean(x));if(normalized.length)return{posts:normalized,cursor:encodePage(page+1),scanned:pages.length,source:'vk-public-search'}
  const seen=new Set<string>();const images:string[]=[];for(const p of pages)for(const u of extractImageUrls(p.html))if(!seen.has(u)){seen.add(u);images.push(u)}
  const posts:Post[]=images.slice(0,36).map((u,i)=>({uri:`vk-search:${encodeURIComponent(q)}:${page}:${i}`,cid:`vkimg-${page}-${i}`,text:q,createdAt:new Date().toISOString(),author:{handle:'vk',displayName:'VK',avatar:null},images:[{thumb:u,fullsize:u,alt:q}],likeCount:0,repostCount:0}))
  return{posts,cursor:posts.length?encodePage(page+1):null,scanned:pages.length,source:'vk-public-search'}
 }
 const links:string[]=[];const seen=new Set<string>();for(const p of pages)for(const u of extractMediaLinks(p.html,'video'))if(!seen.has(u)){seen.add(u);links.push(u)}
 const items=await Promise.all(links.slice(0,36).map(normalizeVideoPage));const posts=items.filter((x):x is Post=>Boolean(x))
 return{posts,cursor:links.length?encodePage(page+1):null,scanned:pages.length,source:'vk-public-search'}
}

export function encodePage(page:number){return Buffer.from(JSON.stringify({page}),'utf8').toString('base64url')}
export function decodePage(value:string|null){if(!value)return 0;try{const p=Number(JSON.parse(Buffer.from(value,'base64url').toString('utf8'))?.page||0);return Number.isFinite(p)&&p>=0?p:0}catch{return 0}}
