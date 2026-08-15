import {NextRequest,NextResponse} from 'next/server'
import {bookDetail} from '../../../../lib/vk-books'

export async function GET(req:NextRequest){
 const topicId=Number(req.nextUrl.searchParams.get('topicId')||0)
 if(!Number.isInteger(topicId)||topicId<=0)return NextResponse.json({error:'Sujet VK invalide'},{status:400})
 try{
  const detail=await bookDetail(topicId)
  const confirmedFormat=detail.fileName?.toLowerCase().endsWith('.epub')?'epub':detail.fileName?.toLowerCase().endsWith('.pdf')?'pdf':detail.authorizedUrl?.toLowerCase().includes('.epub')?'epub':detail.authorizedUrl?.toLowerCase().includes('.pdf')?'pdf':null
  const confirmedDetected=!!confirmedFormat||!!detail.fileName||!!detail.authorizedUrl
  return NextResponse.json({...detail,format:confirmedFormat,fileDetected:confirmedDetected},{headers:{'Cache-Control':'public, max-age=900, stale-while-revalidate=86400'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Détail indisponible'},{status:502})}
}
