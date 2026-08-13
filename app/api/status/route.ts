import {NextResponse} from 'next/server'

export async function GET(){
 return NextResponse.json({
  ok:true,
  mode:'public-web',
  tokenRequired:false,
  photos:'vk-cdn-multi-source',
  videos:'vk-video-live-api',
  accounts:'public-vk'
 },{headers:{'Cache-Control':'no-store'}})
}
