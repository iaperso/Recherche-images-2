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
const STOP_WORDS=new Set(['le','la','les','l','de','du','des','d','un','une','et','the','a','an'])

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function meaningfulWords(value:string){return normalize(value).split(' ').filter(x=>x.length>1&&!STOP_WORDS.has(x))}
function score(title:string,doc:OpenLibraryDoc){
 const q=normalize(title),candidate=normalize(doc.title||'')
 if(!candidate)return-1
 if(candidate===q)return 180+(doc.language?.includes('fre')?10:0)+(doc.cover_i?6:0)+(doc.author_name?.length?4:0)+(doc.first_publish_year?2:0)
 const qWords=meaningfulWords(title),cWords=meaningfulWords(doc.title||'')
 if(!qWords.length||!cWords.length)return-1
 const qSet=new Set(qWords),cSet=new Set(cWords)
 let overlap=0
 for(const word of qSet)if(cSet.has(word))overlap++
 const qCoverage=overlap/qSet.size
 const cCoverage=overlap/cSet.size
 const lengthRatio=candidate.length/Math.max(1,q.length)
 // Une couverture erronée est pire qu'aucune couverture : on n'accepte que
 // les titres équivalents une fois articles/prépositions retirés, ou quasi identiques.
 if(qCoverage<1||cCoverage<0.75||lengthRatio<0.55||lengthRatio>1.8)return-1
 let s=100
 if(qWords.join(' ')===cWords.join(' '))s+=35
 if(doc.language?.includes('fre'))s+=10
 if(doc.cover_i)s+=6
 if(doc.author_name?.length)s+=4
 if(doc.first_publish_year)s+=2
 return s
}

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
  if(!best||best.score<100)return null
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
