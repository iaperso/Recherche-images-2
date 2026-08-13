import {NextRequest,NextResponse} from 'next/server'
import {decodeCursor,searchPublicMedia} from '../../../lib/public-vk'

export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim()
 if(!q)return NextResponse.json({error:'Recherche vide.'},{status:400})
 const page=decodeCursor(req.nextUrl.searchParams.get('cursor'))
 try{
  const result=await searchPublicMedia(q,'image',page)
  return NextResponse.json({...result,source:'public-web'},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Recherche publique indisponible'},{status:502})}
}
