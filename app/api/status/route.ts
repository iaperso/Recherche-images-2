import {NextResponse} from 'next/server'
import {getVkTokenSource,vk} from '../../../lib/vk'

export async function GET(){
 const source=getVkTokenSource()
 if(!source)return NextResponse.json({ok:true,configured:false,source:null,message:'Configure VK_SERVICE_TOKEN ou VK_ACCESS_TOKEN dans Vercel.'},{headers:{'Cache-Control':'no-store'}})
 try{
  const response=await vk('users.get',{})
  return NextResponse.json({ok:true,configured:true,source,validated:true,identity:Array.isArray(response)&&response[0]?{id:response[0].id,first_name:response[0].first_name,last_name:response[0].last_name}:null},{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  return NextResponse.json({ok:false,configured:true,source,validated:false,error:error instanceof Error?error.message:'Erreur VK'},{status:502,headers:{'Cache-Control':'no-store'}})
 }
}
