import {NextResponse} from 'next/server'
import {publicStatus} from '../../../lib/public-vk'

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'

async function probe(name:string,url:string){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500)
 try{
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8'},redirect:'follow',cache:'no-store',signal:controller.signal})
  const text=await r.text()
  const vkUrls=(text.match(/https?:\/\/(?:[\w.-]+\.)?(?:vk\.com|vkvideo\.ru)\/[^\s"'<>\]]+/gi)||[]).length
  const rssItems=(text.match(/<item\b/gi)||[]).length
  return{name,status:r.status,ok:r.ok,length:text.length,vkUrls,rssItems,finalUrl:r.url}
 }catch(e){return{name,ok:false,status:0,length:0,vkUrls:0,rssItems:0,error:e instanceof Error?e.message:'probe failed'}}
 finally{clearTimeout(timer)}
}

export async function GET(){
 try{
  const base=await publicStatus()
  const q='site:vk.com nature photo'
  const probes=await Promise.all([
   probe('bing-rss',`https://www.bing.com/search?format=rss&q=${encodeURIComponent(q)}`),
   probe('bing-html',`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&adlt=off`),
   probe('duckduckgo-html',`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kp=-2`),
   probe('vk-search',`https://vk.com/search?c%5Bq%5D=${encodeURIComponent('nature')}&c%5Bsection%5D=photos`)
  ])
  return NextResponse.json({...base,probes},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return NextResponse.json({ok:false,mode:'public-web',tokenRequired:false,error:error instanceof Error?error.message:'Diagnostic indisponible'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
