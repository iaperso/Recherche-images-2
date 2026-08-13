import {NextRequest,NextResponse} from 'next/server'
import {bestPhoto,cursorDecode,cursorEncode,normalizedVideo,postBase,vk,VKObj} from '../../../lib/vk'

type Cursors=Record<string,number>
function clean(v:string){return v.trim().replace(/^@+/,'').replace(/^https?:\/\/(?:m\.)?vk\.com\//i,'').split(/[?#/]/)[0]}
function attachments(post:VKObj){const list:Array<VKObj>=[];if(Array.isArray(post.attachments))list.push(...post.attachments);for(const copy of Array.isArray(post.copy_history)?post.copy_history:[])if(Array.isArray(copy.attachments))list.push(...copy.attachments);return list}

export async function GET(req:NextRequest){
 const actors=[...new Set((req.nextUrl.searchParams.get('q')||'').split(/[\s,;]+/).map(clean).filter(Boolean))].slice(0,20)
 if(!actors.length)return NextResponse.json({error:'Aucun compte.'},{status:400})
 const cursors=cursorDecode<Cursors>(req.nextUrl.searchParams.get('cursor'),{})
 try{
  const code=`var d=${JSON.stringify(actors)};var o=${JSON.stringify(actors.map(a=>cursors[a]||0))};var r=[];var i=0;while(i<d.length){r.push(API.wall.get({\"domain\":d[i],\"count\":35,\"offset\":o[i],\"extended\":0}));i=i+1;}return r;`
  const feeds=await vk('execute',{code}) as Array<VKObj>
  const rawPosts:Array<{actor:string;post:VKObj}>=[];const next:Cursors={}
  actors.forEach((actor,i)=>{const feed=feeds?.[i];const items=Array.isArray(feed?.items)?feed.items:[];for(const post of items)rawPosts.push({actor,post});if(items.length)next[actor]=(cursors[actor]||0)+items.length})
  const videoIds:string[]=[]
  for(const {post} of rawPosts)for(const a of attachments(post))if(a.type==='video'&&a.video)videoIds.push(`${a.video.owner_id}_${a.video.id}${a.video.access_key?`_${a.video.access_key}`:''}`)
  const videoMap=new Map<string,VKObj>()
  if(videoIds.length){try{const d=await vk('video.get',{videos:[...new Set(videoIds)].slice(0,200).join(','),extended:1});for(const v of Array.isArray(d?.items)?d.items:[])videoMap.set(`${v.owner_id}_${v.id}`,v)}catch{}}
  const posts=rawPosts.flatMap(({post})=>{const base=postBase(Number(post.owner_id),Number(post.id),Number(post.date),post.text||'',post.likes?.count||0,post.reposts?.count||0);const images=[] as any[];let video:any=null;for(const a of attachments(post)){if(a.type==='photo'&&a.photo){const p=bestPhoto(a.photo);if(p)images.push(p)}if(!video&&a.type==='video'&&a.video){const v=videoMap.get(`${a.video.owner_id}_${a.video.id}`)||a.video;video=normalizedVideo(v)}}if(!images.length&&!video)return[];return[{...base,images,video}]})
  posts.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))
  return NextResponse.json({posts,cursor:Object.keys(next).length?cursorEncode(next):null},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erreur VK'},{status:502})}
}
