import {NextRequest,NextResponse} from 'next/server'
import {searchVkDirect} from '../../../lib/vk-direct'

const photoTerms=['portrait','fashion','photography','art','summer','night','travel','music','cinema','beauty','studio','street']
const videoTerms=['music','dance','fashion','art','cinema','travel','night','live','short film','performance','beauty','studio']

export async function GET(req:NextRequest){
 const kind=req.nextUrl.searchParams.get('kind')==='video'?'video':'image'
 const batch=Math.max(0,Number(req.nextUrl.searchParams.get('batch')||0)||0)
 const terms=kind==='video'?videoTerms:photoTerms
 const q=terms[(batch+Math.floor(Date.now()/60000))%terms.length]
 try{
  const result=await searchVkDirect(q,kind,batch%4)
  return NextResponse.json({...result,query:q},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Découverte VK indisponible'},{status:502})}
}
