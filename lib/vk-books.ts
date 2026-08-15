export type BookItem={topicId:number;title:string;description:string;genres:string[];publication:string|null;tomes:string|null;origin:string|null;language:string|null;sourceUrl:string;integratedAt:string|null;integrationOrder:number;isCategory:boolean}

const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
const TIMEOUT=9000
const MAX_INDEX_PAGE=12
const topic=(topicId:number,title:string,genres:string[],publication:string|null,tomes:string|null,origin:string|null,integratedAt:string|null=null):BookItem=>({topicId,title,description:[genres.length?`Genre : ${genres.join(', ')}`:'',publication?`Parution : ${publication}`:'',tomes?`Tomes : ${tomes}`:'',origin?`Origine : ${origin}`:'','Langue : Français'].filter(Boolean).join(' '),genres,publication,tomes,origin,language:'Français',sourceUrl:`https://vk.com/topic-203785966_${topicId}`,integratedAt,integrationOrder:topicId,isCategory:false})
const VERIFIED:BookItem[]=[
 topic(51273578,'GUERRES & DRAGONS',['Aventure'],'Série en cours','3','Europe'),
 topic(49326070,'LE CHOUCAS',['Polar'],'Série finie','6','Europe'),
 topic(49315234,'YIN YANG',['Aventure'],'Série finie','7','Europe'),
 topic(49151502,'PASCAL BRUTAL',['Humour'],'Série en cours','4','Europe'),
 topic(49139235,'LESTER COCKNEY',['Histoire'],'Série finie','9','Europe'),
 topic(49068668,'VISAGES - CEUX QUE NOUS SOMMES',['Histoire'],'Série en cours','1','Europe','2023-03-10T00:00:00.000Z'),
 topic(49052484,'TRAINS DE LÉGENDE',['Histoire'],'Série en cours','3','Europe','2023-03-01T00:00:00.000Z'),
 topic(49027504,'ADOSTARS',['Humour'],'Série en cours','3','Europe','2023-02-13T00:00:00.000Z'),
 topic(48984819,'FEMMES EN RÉSISTANCE',['Histoire'],'Série finie','4','Europe'),
 topic(48976921,'NARCOS',['Polar','Thriller'],'Série finie','3','Europe'),
 topic(48734260,'NOWAN',['Humour','Jeunesse'],'Série en cours','2','Europe'),
 topic(48162404,'APRÈS-GUERRE',['Histoire'],null,null,'Europe'),
 topic(48148684,'LES GRANDES GRANDES VACANCES',["Adaptation d'anime"],'Série en cours','4','Europe','2022-01-06T00:00:00.000Z'),
 topic(48007323,'LA GRANDE GUERRE DE CHARLIE',['Guerre'],'Série finie','10','Autre'),
 topic(47991385,'GREEN CLASS',['Anticipation','Thriller'],'Série en cours','3','Europe'),
 topic(47976262,'LES BEAUX ÉTÉS',['Chronique sociale','Humour'],'Série en cours','6','Europe'),
 topic(47605189,'SAMURAI',['Aventure','Histoire'],'Série en cours','18','Europe'),
 topic(47482556,'GARULFO',['Aventure','Humour'],'Série finie','6','Europe'),
 topic(47436767,'LES PETITES FEMMES (Adulte)',['Érotique'],'Série finie','6','Europe'),
 topic(47423657,'SECTION R',['Aventure'],'Série finie','8','Europe')
]

function decode(v:string){return v.replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\x([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\u0026/g,'&').replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/\\n/g,' ').replace(/\\t/g,' ')}
function strip(v:string){return decode(v).replace(/__APOS__/g,"'").replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
async function fetchText(url:string){const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml','accept-language':'fr-FR,fr;q=0.9,en;q=0.6'},redirect:'follow',cache:'no-store',signal:c.signal});if(!r.ok)return null;return await r.text()}catch{return null}finally{clearTimeout(t)}}
function field(desc:string,name:string,next:string[]){const stop=next.map(x=>`${x}\\s*:`).join('|');const re=new RegExp(`${name}\\s*:\\s*(.*?)(?=\\s+(?:${stop})|$)`,'i');const m=desc.match(re);return m?m[1].trim():null}
function cleanTitle(v:string){return strip(v).replace(/\s*\|\s*Au Phil(?:\s+Des)?(?:\s+Bulles)?(?:\s*\.{3})?.*$/i,'').replace(/\s*[|–-]\s*VK\s*$/i,'').trim()}
function categoryTitle(title:string,desc:string){if(/Genre\s*:/i.test(desc))return false;return /^(?:TOUT EN BD|SCIENCE[- ]FICTION|ANTICIPATION|FANTASTIQUE|HEROIC FANTASY|HEROÏC FANTASY|HISTORIQUE|WESTERN|POLICIER|THRILLER|AVENTURE|HUMOUR|JEUNESSE|MANGA|COMICS|ROMAN GRAPHIQUE|ONE SHOT|AUTEURS?|DESSINATEURS?|SCÉNARISTES?)(?:\b|\s*[-–])/i.test(title)}
function sourceDate(desc:string){const m=desc.match(/Au Phil Des Bulles\s+(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})/i);if(!m)return null;const months:Record<string,number>={jan:0,janv:0,january:0,fev:1,fév:1,fevr:1,févr:1,feb:1,february:1,mar:2,mars:2,march:2,avr:3,apr:3,april:3,mai:4,may:4,juin:5,jun:5,june:5,juil:6,jul:6,july:6,aout:7,août:7,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,déc:11,december:11};const key=m[2].toLowerCase().replace(/\.$/,'');const month=months[key]??months[key.slice(0,3)];if(month===undefined)return null;const d=new Date(Date.UTC(Number(m[3]),month,Number(m[1])));return Number.isNaN(d.getTime())?null:d.toISOString()}
function makeItem(url:string,titleRaw:string,descRaw:string,_pageAge:string|null):BookItem|null{const m=url.match(/topic-203785966_(\d+)/);if(!m)return null;const topicId=Number(m[1]);const title=cleanTitle(titleRaw);if(!title)return null;const description=strip(descRaw);const genre=field(description,'Genre',['Parution','Tome(?:s)?','Origine','Langue']);const publication=field(description,'Parution',['Tome(?:s)?','Origine','Langue']);const tomes=field(description,'Tome(?:s)?',['Origine','Langue']);const origin=field(description,'Origine',['Langue']);const language=field(description,'Langue',[]);const integratedAt=sourceDate(description);return{topicId,title,description,genres:genre?genre.split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean):[],publication,tomes,origin,language,sourceUrl:`https://vk.com/topic-203785966_${topicId}`,integratedAt,integrationOrder:topicId,isCategory:categoryTitle(title,description)}}
function parsePage(html:string){const protectedHtml=html.replace(/(?:&#x27;|&#39;|&apos;)/gi,'__APOS__');const text=decode(protectedHtml);const found=new Map<number,BookItem>();const add=(url:string,title:string,desc:string,pageAge:string|null)=>{const item=makeItem(url,title,desc,pageAge);if(item&&!found.has(item.topicId))found.set(item.topicId,item)}
 for(const m of text.matchAll(/url:\s*["'](https?:\/\/(?:m\.)?vk\.com\/topic-203785966_\d+[^"']*)["']/gi)){const idx=m.index||0;const before=text.slice(Math.max(0,idx-900),idx);const after=text.slice(idx,idx+1800);const tm=[...before.matchAll(/title:\s*["']([^"']+)["']/gi)].pop();const dm=after.match(/description:\s*["']([^"']*)["']/i);const pm=after.match(/page_age:\s*(?:["']([^"']+)["']|(\d{9,13}))/i);add(m[1],tm?.[1]||'',dm?.[1]||'',pm?.[1]||pm?.[2]||null)}
 for(const m of text.matchAll(/<a\b[^>]*href=["']([^"']*topic-203785966_\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)){const idx=m.index||0;const around=text.slice(idx,idx+1500);add(new URL(decode(m[1]),'https://vk.com').toString(),m[2],strip(around),null)}
 return [...found.values()]}
function urls(page:number){const first=1+Math.max(0,page)*10;const offset=Math.max(0,page);const queries=[`site:vk.com/topic-203785966_ "Au Phil Des Bulles"`,`site:vk.com/topic-203785966_ "Au Phil Des Bulles" "Genre"`,`site:vk.com/topic-203785966_ "Au Phil Des Bulles" "Langue"`];return queries.flatMap(q=>[`https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web&offset=${offset}`,`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&first=${first}&adlt=off`,`https://yandex.com/search/?text=${encodeURIComponent(q)}&p=${offset}`])}
function score(x:BookItem){return x.genres.length*10+(x.language?8:0)+(x.publication?5:0)+(x.tomes?3:0)+(x.origin?2:0)+(x.integratedAt?2:0)+(/Genre\s*:/i.test(x.description)?4:0)}
function usable(items:BookItem[]){return items.filter(x=>!x.isCategory&&x.title.trim().length>2&&x.genres.length>0&&/fran[cç]ais/i.test(x.language||x.description))}
async function livePage(indexPage:number){const pages=(await Promise.all(urls(indexPage).map(fetchText))).filter(Boolean) as string[];const map=new Map<number,BookItem>();for(const html of pages)for(const item of parsePage(html)){const old=map.get(item.topicId);if(!old||score(item)>score(old)||(score(item)===score(old)&&item.description.length>old.description.length))map.set(item.topicId,item)}return{books:usable([...map.values()]).sort((a,b)=>b.integrationOrder-a.integrationOrder),sourcePages:pages.length}}
export async function booksPage(page=0){
 const start=Math.max(0,page);const map=new Map<number,BookItem>();if(start===0)for(const item of VERIFIED)map.set(item.topicId,item)
 let indexPage=start;let sourcePages=0;let liveFound=0
 for(let tries=0;tries<3&&indexPage<=MAX_INDEX_PAGE;tries++,indexPage++){
  const live=await livePage(indexPage);sourcePages+=live.sourcePages
  for(const item of live.books){liveFound++;const old=map.get(item.topicId);if(!old||score(item)>score(old)||(score(item)===score(old)&&item.description.length>old.description.length))map.set(item.topicId,item)}
  if(start===0||live.books.length)break
 }
 const books=usable([...map.values()]).sort((a,b)=>b.integrationOrder-a.integrationOrder);const categories=[...new Set(books.flatMap(x=>x.genres))].sort((a,b)=>a.localeCompare(b,'fr'));const nextPage=indexPage<=MAX_INDEX_PAGE&&(start===0||liveFound>0)?indexPage:null
 return{books,categories,sourcePages,nextPage,verifiedBase:start===0?VERIFIED.length:0}
}
