import {NextRequest,NextResponse} from 'next/server'
import {decodePage,searchVkDirect} from '../../../lib/vk-direct'

function genericTitle(v:any){const t=String(v||'').trim();return !t||/^(?:vk|vk video)$/i.test(t)}

export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim()
 if(!q)return NextResponse.json({error:'Recherche vide.'},{status:400})
 const page=decodePage(req.nextUrl.searchParams.get('cursor'))
 try{
  const result=await searchVkDirect(q,'video',page)
  const posts=(Array.isArray(result?.posts)?result.posts:[]).map((p:any)=>genericTitle(p?.video?.alt)||genericTitle(p?.text)?{...p,text:genericTitle(p?.text)?q:p.text,video:p?.video?{...p.video,alt:genericTitle(p.video.alt)?q:p.video.alt}:p?.video}:p)
  return NextResponse.json({...result,posts},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Recherche VK indisponible'},{status:502})}
}
