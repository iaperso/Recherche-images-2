import {NextRequest,NextResponse} from 'next/server'
import {bookDetail} from '../../../../lib/vk-books'

export async function GET(req:NextRequest){
 const topicId=Number(req.nextUrl.searchParams.get('topicId')||0)
 if(!Number.isInteger(topicId)||topicId<=0)return NextResponse.json({error:'Sujet VK invalide'},{status:400})
 try{
  const detail=await bookDetail(topicId)
  return NextResponse.json(detail,{headers:{'Cache-Control':'public, max-age=900, stale-while-revalidate=86400'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Détail indisponible'},{status:502})}
}
