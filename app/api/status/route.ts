import {NextResponse} from 'next/server'

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
async function get(url:string,timeout=8000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/javascript,*/*','accept-language':'ru-RU,ru;q=0.9,en;q=0.7'},cache:'no-store',redirect:'follow',signal:c.signal});if(!r.ok)return null;return{url:r.url,text:await r.text(),status:r.status}}catch{return null}finally{clearTimeout(t)}}
function uniq<T>(xs:T[]){return [...new Set(xs)]}
export async function GET(){
 const page=await get('https://live.vkvideo.ru/search/records')
 if(!page)return NextResponse.json({ok:false,error:'VK Video Live inaccessible'},{status:502})
 const srcs=uniq([...page.text.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1],page.url).toString()}catch{return''}}).filter(Boolean)).slice(-18)
 const files=(await Promise.all(srcs.map(u=>get(u,10000)))).filter(Boolean) as {url:string;text:string;status:number}[]
 const hits:any[]=[]
 for(const f of files){
  const paths=uniq((f.text.match(/(?:https:\/\/api\.live\.vkvideo\.ru)?\/v\d+\/[A-Za-z0-9_?&=./:${}%,-]{2,220}/g)||[]).filter(x=>/search|record|stream|category|catalog|video/i.test(x))).slice(0,30)
  const strings=uniq((f.text.match(/["'`]([^"'`]{0,100}(?:search|records)[^"'`]{0,120})["'`]/gi)||[]).map(x=>x.slice(1,-1)).filter(x=>/api|v1|v2|search|record/i.test(x))).slice(0,30)
  if(paths.length||strings.length)hits.push({script:f.url,paths,strings})
 }
 return NextResponse.json({ok:true,scriptCount:srcs.length,scripts:srcs,hits},{headers:{'Cache-Control':'no-store'}})
}
