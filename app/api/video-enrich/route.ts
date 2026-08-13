import {NextRequest,NextResponse} from 'next/server'

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
const ALLOWED=new Set(['vk.com','m.vk.com','vkvideo.ru','live.vkvideo.ru'])

function decode(v:string){return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\\u0026/g,'&').replace(/\\u002F/gi,'/').replace(/\\u003A/gi,':').replace(/\\x2F/gi,'/').replace(/\\x3A/gi,':').replace(/\\\//g,'/')}
function attrs(tag:string){const out=new Map<string,string>();for(const m of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))out.set(m[1].toLowerCase(),decode(m[2]));return out}
function meta(html:string,key:string){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=attrs(tag);if((a.get('property')||a.get('name')||'').toLowerCase()===key.toLowerCase()&&a.get('content'))return a.get('content')!}return null}
function cleanTitle(v:string|null){if(!v)return null;const t=decode(v).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/\s*[|–—-]\s*(?:VK|ВКонтакте|VK Video).*$/i,'').trim();if(!t||/^(?:vk|vk video|вконтакте)$/i.test(t))return null;return t.slice(0,220)}
function pageTitle(html:string){const og=cleanTitle(meta(html,'og:title')||meta(html,'twitter:title'));if(og)return og;const tm=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);const fromTag=cleanTitle(tm?.[1]||null);if(fromTag)return fromTag;for(const m of html.matchAll(/["']title["']\s*:\s*["']([^"'<>]{3,220})["']/gi)){const t=cleanTitle(m[1]);if(t)return t}return null}
function directVideo(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&/\.(?:m3u8|mp4)(?:$|\?)/i.test(u.pathname+u.search)}catch{return false}}
function absolute(raw:string,base:string){try{return new URL(decode(raw),base).toString()}catch{return null}}
function findPlayer(html:string,base:string){const candidates:string[]=[];for(const tag of html.match(/<iframe\b[^>]*>/gi)||[]){const a=attrs(tag);if(a.get('src'))candidates.push(a.get('src')!)}for(const m of decode(html).matchAll(/(?:https?:\/\/(?:m\.)?vk\.com)?\/video_ext\.php\?[^\s"'<>]+/gi))candidates.push(m[0]);for(const v of [meta(html,'twitter:player'),meta(html,'og:video'),meta(html,'og:video:url'),meta(html,'og:video:secure_url')])if(v)candidates.push(v);for(const raw of candidates){const u=absolute(raw,base);if(!u||directVideo(u))continue;try{const x=new URL(u);if((x.hostname==='vk.com'||x.hostname==='m.vk.com')&&x.pathname.includes('video_ext.php'))return u;if((x.hostname==='vkvideo.ru'||x.hostname==='live.vkvideo.ru')&&/embed|player/i.test(x.pathname+x.search))return u}catch{}}return null}
function findPlaylist(html:string){const text=decode(html);const candidates:string[]=[];for(const v of [meta(text,'og:video'),meta(text,'og:video:url'),meta(text,'og:video:secure_url')])if(v)candidates.push(v);for(const m of text.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/gi))candidates.push(m[0]);return candidates.find(directVideo)||null}

export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get('url')||''
 let target:URL
 try{target=new URL(raw)}catch{return NextResponse.json({error:'URL vidéo invalide.'},{status:400})}
 if(target.protocol!=='https:'||!ALLOWED.has(target.hostname.toLowerCase()))return NextResponse.json({error:'Source vidéo refusée.'},{status:400})
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000)
 try{
  const r=await fetch(target.toString(),{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml','accept-language':'ru-RU,ru;q=0.9,en;q=0.7'},redirect:'follow',cache:'no-store',signal:controller.signal})
  if(!r.ok)return NextResponse.json({ok:true,title:null,player:null,playlist:null,thumbnail:null},{headers:{'Cache-Control':'no-store'}})
  const html=decode(await r.text());const base=r.url||target.toString()
  const title=pageTitle(html);const player=findPlayer(html,base);const playlist=findPlaylist(html);const thumbnail=meta(html,'og:image')||meta(html,'twitter:image')||null
  return NextResponse.json({ok:true,title,player,playlist,thumbnail},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({ok:true,title:null,player:null,playlist:null,thumbnail:null},{headers:{'Cache-Control':'no-store'}})}finally{clearTimeout(timer)}
}
