import {NextRequest,NextResponse} from 'next/server'
import {bestPhoto,cursorDecode,cursorEncode,postBase,vk,VKObj} from '../../../lib/vk'

export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim();if(!q)return NextResponse.json({error:'Recherche vide.'},{status:400})
 const offset=cursorDecode<number>(req.nextUrl.searchParams.get('cursor'),0)
 try{
  const r=await vk('photos.search',{q,sort:0,offset,count:80,radius:0})
  const items:Array<VKObj>=Array.isArray(r?.items)?r.items:[]
  const posts=items.flatMap(p=>{const image=bestPhoto(p);if(!image)return[];return[{...postBase(Number(p.owner_id),Number(p.id),Number(p.date),p.text||'',p.likes?.count||0,p.reposts?.count||0),images:[image]}]})
  const next=items.length?offset+items.length:null
  return NextResponse.json({posts,cursor:next===null?null:cursorEncode(next)},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erreur VK'},{status:502})}
}
