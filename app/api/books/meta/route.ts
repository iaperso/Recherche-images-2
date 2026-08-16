import {NextRequest,NextResponse} from 'next/server'
import {findOpenLibraryBook} from '../../../../lib/open-library'

export async function GET(req:NextRequest){
 const title=(req.nextUrl.searchParams.get('title')||'').trim()
 if(title.length<2||title.length>180)return NextResponse.json({error:'Titre invalide'},{status:400})
 try{
  const meta=await findOpenLibraryBook(title)
  return NextResponse.json({meta},{headers:{'Cache-Control':'public, max-age=86400, stale-while-revalidate=604800'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Métadonnées indisponibles'},{status:502})}
}
