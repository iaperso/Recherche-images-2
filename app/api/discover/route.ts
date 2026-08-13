import {NextRequest,NextResponse} from 'next/server'
import {searchPublicMedia} from '../../../lib/public-vk'

const photoTerms=['portrait','fashion','photography','art','summer','night','travel','music','cinema','beauty','studio','street']
const videoTerms=['music','dance','fashion','art','cinema','travel','night','live','short film','performance','beauty','studio']

export async function GET(req:NextRequest){
 const kind=req.nextUrl.searchParams.get('kind')==='video'?'video':'image'
 const batch=Math.max(0,Number(req.nextUrl.searchParams.get('batch')||0)||0)
 const terms=kind==='video'?videoTerms:photoTerms
 const q=terms[(batch+Math.floor(Date.now()/60000))%terms.length]
 try{
  const result=await searchPublicMedia(q,kind,batch%4)
  return NextResponse.json({...result,source:'public-web',query:q},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Découverte publique indisponible'},{status:502})}
}
