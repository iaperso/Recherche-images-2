import {NextRequest,NextResponse} from 'next/server'
import {cursorDecode,cursorEncode,normalizedVideo,postBase,vk,VKObj} from '../../../lib/vk'

export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim();if(!q)return NextResponse.json({error:'Recherche vide.'},{status:400})
 const offset=cursorDecode<number>(req.nextUrl.searchParams.get('cursor'),0)
 try{
  const search=await vk('video.search',{q,sort:2,adult:1,offset,count:40,extended:1})
  const raw:Array<VKObj>=Array.isArray(search?.items)?search.items:[]
  const ids=raw.map(v=>`${v.owner_id}_${v.id}${v.access_key?`_${v.access_key}`:''}`).join(',')
  let detailed:Array<VKObj>=raw
  if(ids){try{const more=await vk('video.get',{videos:ids,extended:1});if(Array.isArray(more?.items)&&more.items.length)detailed=more.items}catch{}}
  const posts=detailed.map(v=>({...postBase(Number(v.owner_id),Number(v.id),Number(v.date||v.adding_date),v.description||v.title||'',v.likes?.count||0,v.reposts?.count||0),video:normalizedVideo(v)}))
  const next=raw.length?offset+raw.length:null
  return NextResponse.json({posts,cursor:next===null?null:cursorEncode(next)},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erreur VK'},{status:502})}
}
