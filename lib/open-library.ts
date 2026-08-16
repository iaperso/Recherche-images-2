export type OpenLibraryMeta={
 title:string
 authors:string[]
 firstPublishYear:number|null
 coverUrl:string|null
 workUrl:string|null
 editionCount:number|null
 source:'Open Library'
}

type OpenLibraryDoc={
 key?:string
 title?:string
 author_name?:string[]
 first_publish_year?:number
 cover_i?:number
 edition_count?:number
 language?:string[]
}

const TIMEOUT=5500
const USER_AGENT='Recherche-images-2/1.0 (https://github.com/iaperso/Recherche-images-2)'

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function score(title:string,doc:OpenLibraryDoc){const q=normalize(title),candidate=normalize(doc.title||'');if(!candidate)return-1;let s=0;if(candidate===q)s+=120;if(candidate.startsWith(q)||q.startsWith(candidate))s+=45;const tokens=q.split(' ').filter(x=>x.length>1);for(const token of tokens){if(candidate.includes(token))s+=12;else s-=10}if(doc.language?.includes('fre'))s+=10;if(doc.cover_i)s+=6;if(doc.author_name?.length)s+=4;if(doc.first_publish_year)s+=2;return s}

export async function findOpenLibraryBook(title:string):Promise<OpenLibraryMeta|null>{
 const clean=title.trim().slice(0,180)
 if(clean.length<2)return null
 const url=new URL('https://openlibrary.org/search.json')
 url.searchParams.set('title',clean)
 url.searchParams.set('lang','fr')
 url.searchParams.set('limit','8')
 url.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,edition_count,language')
 const controller=new AbortController()
 const timer=setTimeout(()=>controller.abort(),TIMEOUT)
 try{
  const response=await fetch(url,{headers:{accept:'application/json','user-agent':USER_AGENT},next:{revalidate:86400},signal:controller.signal})
  if(!response.ok)return null
  const data=await response.json() as {docs?:OpenLibraryDoc[]}
  const docs=Array.isArray(data.docs)?data.docs:[]
  const best=docs.map(doc=>({doc,score:score(clean,doc)})).sort((a,b)=>b.score-a.score)[0]
  if(!best||best.score<20)return null
  const doc=best.doc
  const key=typeof doc.key==='string'&&doc.key.startsWith('/')?doc.key:null
  return{
   title:doc.title||clean,
   authors:Array.isArray(doc.author_name)?doc.author_name.slice(0,4):[],
   firstPublishYear:Number.isInteger(doc.first_publish_year)?doc.first_publish_year!:null,
   coverUrl:Number.isInteger(doc.cover_i)?`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`:null,
   workUrl:key?`https://openlibrary.org${key}`:null,
   editionCount:Number.isInteger(doc.edition_count)?doc.edition_count!:null,
   source:'Open Library'
  }
 }catch{return null}finally{clearTimeout(timer)}
}
