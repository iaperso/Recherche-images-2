import {NextResponse} from 'next/server'
import {publicStatus} from '../../../lib/public-vk'

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'

function decodeHtml(v:string){return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\\u0026/g,'&').replace(/\\\//g,'/')}
function decodedBingVk(text:string){let n=0;for(const m of text.matchAll(/[?&]u=([^&"']+)/g)){try{const raw=decodeURIComponent(m[1]);const value=raw.startsWith('a1')?Buffer.from(raw.slice(2),'base64url').toString('utf8'):raw;if(/https?:\/\/(?:[\w.-]+\.)?(?:vk\.com|vkvideo\.ru)\//i.test(value))n++}catch{}}return n}

async function probe(name:string,url:string){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500)
 try{
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8','accept-language':'ru-RU,ru;q=0.9,en;q=0.7'},redirect:'follow',cache:'no-store',signal:controller.signal})
  const raw=await r.text();const text=decodeHtml(raw)
  return{
   name,status:r.status,ok:r.ok,length:text.length,finalUrl:r.url,
   directVk:(text.match(/https?:\/\/(?:[\w.-]+\.)?(?:vk\.com|vkvideo\.ru)\/[^\s"'<>\]]+/gi)||[]).length,
   bingDecodedVk:decodedBingVk(text),
   photoRefs:(text.match(/(?:\/|=)photo-?\d+_\d+/gi)||[]).length,
   videoRefs:(text.match(/(?:\/|=)(?:video|clip)-?\d+_\d+/gi)||[]).length,
   recordRefs:(text.match(/\/record\/[0-9a-f-]{16,}/gi)||[]).length,
   vkvideoRefs:(text.match(/https?:\/\/(?:[\w.-]+\.)?vkvideo\.ru\/[^\s"'<>\]]+/gi)||[]).length,
   cdnRefs:(text.match(/https?:\/\/[^\s"'<>\\]*(?:userapi|vkuser|vkcdn|sun\d*[-.])[^\s"'<>\\]*/gi)||[]).length,
   mp4Refs:(text.match(/https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi)||[]).length,
   hlsRefs:(text.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi)||[]).length,
   rssItems:(text.match(/<item\b/gi)||[]).length
  }
 }catch(e){return{name,ok:false,status:0,length:0,error:e instanceof Error?e.message:'probe failed'}}
 finally{clearTimeout(timer)}
}

export async function GET(){
 try{
  const base=await publicStatus();const photoQ='nature';const videoQ='music'
  const photoScoped=`site:vk.com ${photoQ} photo`
  const probes=await Promise.all([
   probe('vk-desktop-photo',`https://vk.com/search?c%5Bq%5D=${encodeURIComponent(photoQ)}&c%5Bsection%5D=photos`),
   probe('vk-mobile-photo',`https://m.vk.com/search?c%5Bq%5D=${encodeURIComponent(photoQ)}&c%5Bsection%5D=photos`),
   probe('brave-photo',`https://search.brave.com/search?q=${encodeURIComponent(photoScoped)}&source=web`),
   probe('vk-desktop-video',`https://vk.com/search?c%5Bq%5D=${encodeURIComponent(videoQ)}&c%5Bsection%5D=videos`),
   probe('vk-mobile-video',`https://m.vk.com/search?c%5Bq%5D=${encodeURIComponent(videoQ)}&c%5Bsection%5D=videos`),
   probe('brave-vk-video',`https://search.brave.com/search?q=${encodeURIComponent(`site:vk.com ${videoQ} video`)}&source=web`),
   probe('brave-vkvideo',`https://search.brave.com/search?q=${encodeURIComponent(`site:vkvideo.ru ${videoQ}`)}&source=web`),
   probe('brave-live-vkvideo',`https://search.brave.com/search?q=${encodeURIComponent(`site:live.vkvideo.ru ${videoQ}`)}&source=web`)
  ])
  return NextResponse.json({...base,probes},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return NextResponse.json({ok:false,mode:'public-web',tokenRequired:false,error:error instanceof Error?error.message:'Diagnostic indisponible'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
