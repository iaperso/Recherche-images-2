import {NextResponse} from 'next/server'
export async function GET(){return NextResponse.json({ok:true,configured:Boolean(process.env.VK_SERVICE_TOKEN)},{headers:{'Cache-Control':'no-store'}})}
