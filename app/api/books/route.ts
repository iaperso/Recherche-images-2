import {NextRequest,NextResponse} from 'next/server'
import {booksPage} from '../../../lib/vk-books'

export async function GET(req:NextRequest){const page=Math.max(0,Number(req.nextUrl.searchParams.get('page')||0)||0);try{const result=await booksPage(page);return NextResponse.json({...result,group:{id:203785966,name:'Au Phil Des Bulles',url:'https://vk.com/club203785966'},rights:{directPdfLinks:false,note:'Les liens directs vers des fichiers ne sont exposés que lorsqu’une diffusion autorisée peut être vérifiée.'}},{headers:{'Cache-Control':'private, max-age=300'}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Catalogue indisponible'},{status:502})}}
