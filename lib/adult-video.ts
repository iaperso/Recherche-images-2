import {hasAdultSignal,hasMinorRisk} from './adult-filter'

type VideoPost={
 uri:string;cid:string;text:string;createdAt:string
 author:{handle:string;displayName:string;avatar:string|null}
 video:{playlist:null;player:null;pageUrl:string;thumbnail:string|null;alt:string;aspectRatio:null}
 likeCount:number;repostCount:number
}

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
const TIMEOUT=7000

async function fetchJson(url:string){
 const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT)
 try{
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json,text/plain,*/*','origin':'https://live.vkvideo.ru','referer':'https://live.vkvideo.ru/search'},cache:'no-store',redirect:'follow',signal:c.signal})
  if(!r.ok)return null
  return await r.json()
 }catch{return null}finally{clearTimeout(t)}
}

function safeIso(seconds:any){
 const n=Number(seconds||0)
 if(Number.isFinite(n)&&n>0){const d=new Date(n*1000);if(!Number.isNaN(d.getTime()))return d.toISOString()}
 return new Date().toISOString()
}

function explicitAdultFlag(value:any,depth=0):boolean{
 if(!value||depth>3)return false
 if(Array.isArray(value))return value.some(v=>explicitAdultFlag(v,depth+1))
 if(typeof value!=='object')return false
 for(const [key,raw] of Object.entries(value)){
  const k=key.toLowerCase()
  if(/(?:adult|mature|nsfw|age.?restrict|age.?limit|18plus|is18)/i.test(k)){
   if(raw===true)return true
   if(typeof raw==='number'&&raw>=18)return true
   if(typeof raw==='string'&&/(?:true|adult|mature|nsfw|18\+|18|21\+)/i.test(raw))return true
  }
  if(raw&&typeof raw==='object'&&explicitAdultFlag(raw,depth+1))return true
 }
 return false
}

function textOf(channel:any,stream:any){
 return [channel?.nick,channel?.url,channel?.description,stream?.title,stream?.description,stream?.category?.title].filter(Boolean).join(' ')
}

function normalize(channel:any,stream:any,index:number):VideoPost{
 const handle=String(channel?.url||`channel-${channel?.id||index}`)
 const title=String(stream?.title||channel?.nick||'VK Video 18+')
 const thumb=String(stream?.previewUrl||channel?.coverUrl||channel?.avatarUrl||'')||null
 const streamId=String(channel?.streamId||stream?.id||channel?.id||index)
 return{
  uri:`vk-live:${handle}:${streamId}`,
  cid:`vklive-${streamId}`,
  text:title,
  createdAt:safeIso(stream?.startedAt||channel?.lastStreamAt),
  author:{handle,displayName:String(channel?.nick||handle),avatar:channel?.avatarUrl||null},
  video:{playlist:null,player:null,pageUrl:`https://live.vkvideo.ru/${encodeURIComponent(handle)}`,thumbnail:thumb,alt:title,aspectRatio:null},
  likeCount:Number(stream?.counters?.likes||0),
  repostCount:0
 }
}

export async function searchAdultVkVideo(query:string,page=0){
 const limit=20,offset=Math.max(0,page)*limit
 const variants=[`${query} 18+`,`${query} adult`,`${query} эротика`]
 const responses=await Promise.all(variants.map(q=>fetchJson(`https://api.live.vkvideo.ru/v8/search/channel?searchQuery=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)))
 const out:VideoPost[]=[];const seen=new Set<string>();let scanned=0
 for(const data of responses){
  if(!data)continue;scanned++
  const channels:Array<any>=Array.isArray(data?.data?.channels)?data.data.channels:[]
  const streams:Record<string,any>=data?.refs?.streams&&typeof data.refs.streams==='object'?data.refs.streams:{}
  for(let i=0;i<channels.length;i++){
   const channel=channels[i];const stream=channel?.streamId?streams[String(channel.streamId)]:null
   const text=textOf(channel,stream)
   if(hasMinorRisk(text))continue
   const adult=explicitAdultFlag(channel)||explicitAdultFlag(stream)||hasAdultSignal(text)
   if(!adult)continue
   const post=normalize(channel,stream,i)
   if(!seen.has(post.uri)){seen.add(post.uri);out.push(post)}
  }
 }
 return{posts:out.slice(0,30),cursor:scanned?Buffer.from(JSON.stringify({page:page+1}),'utf8').toString('base64url'):null,scanned,source:'vk-video-live-adult',adultOnly:true,filterMode:'vk-adult-flags+metadata',blockedMinorSignals:true}
}
