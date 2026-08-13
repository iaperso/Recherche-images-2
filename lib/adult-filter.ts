export type AdultPost={
 uri?:string
 text?:string
 author?:{handle?:string;displayName?:string}
 images?:Array<{alt?:string;thumb?:string;fullsize?:string}>
 video?:{alt?:string;pageUrl?:string|null;thumbnail?:string|null}
}

const AGE_RESTRICTED=/\b(?:18\+|21\+|adult|mature|age[- ]?restricted|restricted\s*18\+|18\s*plus)\b|(?:для\s+взрослых|только\s+для\s+взрослых|возрастн(?:ое|ые)\s+ограничени)/i
const MINOR=/\b(?:minor|underage|child|children|kid|kids|preteen|teen|teens|schoolgirl|schoolboy)\b|(?:несовершеннолет|реб[её]нок|детск|дети|школьниц|школьник|подрост)/i
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
export function hasAgeRestrictedSignal(value:string){return AGE_RESTRICTED.test(value)&&!hasMinorRisk(value)}

export function filterAgeRestrictedPosts<T extends AdultPost>(posts:T[]){
 return posts.filter(post=>{
  const text=postText(post)
  return !hasMinorRisk(text)&&hasAgeRestrictedSignal(text)
 })
}

export function mergeAgeRestrictedResults<T extends AdultPost>(result:{posts?:T[];[key:string]:any}){
 const posts=filterAgeRestrictedPosts(Array.isArray(result?.posts)?result.posts:[])
 return {...result,posts,adultOnly:true,filterMode:'18+-verified-metadata',blockedMinorSignals:true}
}
