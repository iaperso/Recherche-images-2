import {NextRequest,NextResponse} from 'next/server'
import {bestPhoto,normalizedVideo,postBase,vk,VKObj} from '../../../lib/vk'

const photoTerms=['portrait','fashion','photography','art','summer','night','travel','music','cinema','beauty','studio','street']
const videoTerms=['music','dance','fashion','art','cinema','travel','night','live','short film','performance','beauty','studio']
export async function GET(req:NextRequest){
 const kind=req.nextUrl.searchParams.get('kind')==='video'?'video':'image';const batch=Number(req.nextUrl.searchParams.get('batch')||0);const terms=kind==='video'?videoTerms:photoTerms;const q=terms[Math.abs(batch+Date.now()/60000|0)%terms.length]
 try{
  if(kind==='image'){
   const r=await vk('photos.search',{q,sort:0,count:70,offset:(batch%5)*40});const items:Array<VKObj>=Array.isArray(r?.items)?r.items:[]
   const posts=items.flatMap(p=>{const image=bestPhoto(p);return image?[{...postBase(Number(p.owner_id),Number(p.id),Number(p.date),p.text||'',p.likes?.count||0,0),images:[image]}]:[]})
   return NextResponse.json({posts,cursor:null})
  }
  const r=await vk('video.search',{q,sort:2,adult:1,count:35,offset:(batch%5)*25,extended:1});const raw:Array<VKObj>=Array.isArray(r?.items)?r.items:[];const ids=raw.map(v=>`${v.owner_id}_${v.id}${v.access_key?`_${v.access_key}`:''}`).join(',');let detailed=raw
  if(ids){try{const d=await vk('video.get',{videos:ids,extended:1});if(Array.isArray(d?.items))detailed=d.items}catch{}}
  const posts=detailed.map(v=>({...postBase(Number(v.owner_id),Number(v.id),Number(v.date||v.adding_date),v.description||v.title||'',v.likes?.count||0,0),video:normalizedVideo(v)}))
  return NextResponse.json({posts,cursor:null})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erreur VK'},{status:502})}
}
