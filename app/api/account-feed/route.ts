import {NextRequest,NextResponse} from 'next/server'
import {accountPublicMedia,decodeCursor} from '../../../lib/public-vk'

function clean(v:string){return v.trim().replace(/^@+/,'').replace(/^https?:\/\/(?:m\.)?vk\.com\//i,'').split(/[?#/]/)[0]}

export async function GET(req:NextRequest){
 const actors=[...new Set((req.nextUrl.searchParams.get('q')||'').split(/[\s,;]+/).map(clean).filter(Boolean))].slice(0,20)
 if(!actors.length)return NextResponse.json({error:'Aucun compte.'},{status:400})
 const page=decodeCursor(req.nextUrl.searchParams.get('cursor'))
 try{
  const result=await accountPublicMedia(actors,page)
  return NextResponse.json({...result,source:'public-web'},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Flux public indisponible'},{status:502})}
}
