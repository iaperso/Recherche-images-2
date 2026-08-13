export type VKObj=Record<string,any>
const VERSION=process.env.VK_API_VERSION||'5.199'

export function getVkToken(){
 return process.env.VK_SERVICE_TOKEN||process.env.VK_ACCESS_TOKEN||process.env.VK_TOKEN||''
}

export function getVkTokenSource(){
 if(process.env.VK_SERVICE_TOKEN)return 'VK_SERVICE_TOKEN'
 if(process.env.VK_ACCESS_TOKEN)return 'VK_ACCESS_TOKEN'
 if(process.env.VK_TOKEN)return 'VK_TOKEN'
 return null
}

export async function vk(method:string,params:Record<string,string|number|boolean|undefined>){
 const token=getVkToken()
 if(!token)throw new Error('Jeton VK manquant. Configure VK_SERVICE_TOKEN ou VK_ACCESS_TOKEN dans Vercel.')
 const body=new URLSearchParams()
 for(const [k,v] of Object.entries(params))if(v!==undefined)body.set(k,String(v))
 body.set('access_token',token);body.set('v',VERSION)
 const r=await fetch(`https://api.vk.com/method/${method}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,cache:'no-store'})
 let data:any
 try{data=await r.json()}catch{throw new Error(`VK HTTP ${r.status}: réponse invalide`)}
 if(!r.ok)throw new Error(`VK HTTP ${r.status}`)
 if(data.error){
  const code=data.error.error_code
  const message=data.error.error_msg||`VK error ${code}`
  throw new Error(code?`VK ${code}: ${message}`:message)
 }
 return data.response
}

export function cursorEncode(value:any){return Buffer.from(JSON.stringify(value),'utf8').toString('base64url')}
export function cursorDecode<T>(value:string|null,fallback:T):T{if(!value)return fallback;try{return JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as T}catch{return fallback}}
export function ownerHandle(ownerId:number){return ownerId<0?`club${Math.abs(ownerId)}`:`id${ownerId}`}
export function bestPhoto(photo:VKObj){const sizes=Array.isArray(photo?.sizes)?photo.sizes.filter((x:VKObj)=>x?.url):[];if(!sizes.length)return null;const sorted=[...sizes].sort((a:VKObj,b:VKObj)=>(a.width||0)*(a.height||0)-(b.width||0)*(b.height||0));const full=sorted[sorted.length-1];const thumb=sorted[Math.max(0,Math.floor(sorted.length/2)-1)]||sorted[0];return{thumb:thumb.url,fullsize:full.url,alt:typeof photo.text==='string'?photo.text:''}}
export function poster(video:VKObj){const imgs=Array.isArray(video?.image)?video.image.filter((x:VKObj)=>x?.url):[];if(!imgs.length)return null;return [...imgs].sort((a:VKObj,b:VKObj)=>(b.width||0)-(a.width||0))[0].url}
export function videoSource(video:VKObj){const f=video?.files||{};const hls=f.hls||f.hls_1080||f.hls_720||f.hls_480;if(hls)return String(hls);for(const key of ['mp4_2160','mp4_1440','mp4_1080','mp4_720','mp4_480','mp4_360','mp4_240'])if(f[key])return String(f[key]);return null}
export function normalizedVideo(video:VKObj){const src=videoSource(video);const image=poster(video);return{playlist:src,player:typeof video.player==='string'?video.player:null,thumbnail:image,alt:video.title||'',aspectRatio:video.width&&video.height?{width:video.width,height:video.height}:null}}
export function postBase(ownerId:number,id:number,date:number,text:string,likeCount=0,repostCount=0){return{uri:`vk:${ownerId}_${id}`,cid:`${ownerId}_${id}`,text:text||'',createdAt:new Date((date||0)*1000).toISOString(),author:{handle:ownerHandle(ownerId),displayName:ownerHandle(ownerId),avatar:null},likeCount,repostCount}}
