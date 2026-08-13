import {NextResponse} from 'next/server'
import {publicStatus} from '../../../lib/public-vk'

export async function GET(){
 try{return NextResponse.json(await publicStatus(),{headers:{'Cache-Control':'no-store'}})}
 catch(error){return NextResponse.json({ok:false,mode:'public-web',tokenRequired:false,error:error instanceof Error?error.message:'Diagnostic indisponible'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
