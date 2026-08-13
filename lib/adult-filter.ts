export type AdultPost={
 uri?:string
 text?:string
 author?:{handle?:string;displayName?:string}
 images?:Array<{alt?:string;thumb?:string;fullsize?:string}>
 video?:{alt?:string;pageUrl?:string|null;thumbnail?:string|null}
}

const ADULT=/\b(?:18\+|21\+|adult|nsfw|xxx|porn|porno|sex|sexy|erotic|erotica|nude|nudity|naked|fetish|bdsm|strip|striptease|lingerie|boudoir|onlyfans|camgirl|webcam|hentai)\b|(?:эрот|секс|порно|обнаж|голая|голый|голые|стрип|фетиш|бдсм|интим|для\s+взрослых)/i
const MINOR=/\b(?:minor|underage|child|children|kid|kids|preteen|teen|teens|schoolgirl|schoolboy|loli|lolicon|shota|shotacon)\b|(?:несовершеннолет|реб[её]нок|детск|дети|школьниц|школьник|подрост)/i
const UNDER_18=/\b(?:[1-9]|1[0-7])\s*(?:yo|y\/o|years?\s*old|лет)\b/i

function postText(post:AdultPost){
 return [
  post.text||'',
  post.author?.handle||'',
  post.author?.displayName||'',
  ...(post.images||[]).map(x=>x.alt||''),
  post.video?.alt||'',
  post.video?.pageUrl||''
 ].join(' ')
}

export function hasMinorRisk(value:string){return MINOR.test(value)||UNDER_18.test(value)}
export function hasAdultSignal(value:string){return ADULT.test(value)&&!hasMinorRisk(value)}

export function adultSearchQuery(query:string){
 const q=query.trim()
 if(!q)return q
 if(hasMinorRisk(q))return '__BLOCKED_MINOR_QUERY__'
 return hasAdultSignal(q)?q:`${q} 18+`
}

export function filterAdultPosts<T extends AdultPost>(posts:T[],options:{constrainedSearch?:boolean}={}){
 return posts.filter(post=>{
  const text=postText(post)
  if(hasMinorRisk(text))return false
  if(hasAdultSignal(text))return true
  // Les résultats CDN sans métadonnées détaillées sont tolérés uniquement
  // lorsqu'ils proviennent d'une recherche explicitement contrainte en 18+.
  if(options.constrainedSearch&&String(post.uri||'').startsWith('vk-search:'))return true
  return false
 })
}

export function mergeAdultResults<T extends AdultPost>(result:{posts?:T[];[key:string]:any},options:{constrainedSearch?:boolean}={}){
 const posts=filterAdultPosts(Array.isArray(result?.posts)?result.posts:[],options)
 return {...result,posts,adultOnly:true,filterMode:'strict-adult-query+metadata',blockedMinorSignals:true}
}
