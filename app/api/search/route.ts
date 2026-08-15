import {NextRequest,NextResponse} from 'next/server'
import {decodePage,searchVkDirect} from '../../../lib/vk-direct'
import {screenPhotoResult} from '../../../lib/feed-screen'

export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim()
 if(!q)return NextResponse.json({error:'Recherche vide.'},{status:400})
 const page=decodePage(req.nextUrl.searchParams.get('cursor'))
 try{
  const result=await searchVkDirect(q,'image',page)
  return NextResponse.json(screenPhotoResult(result,q),{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Recherche VK indisponible'},{status:502})}
}
