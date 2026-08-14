'use client'

import {useEffect,useMemo,useState} from 'react'

type Book={topicId:number;title:string;description:string;genres:string[];publication:string|null;tomes:string|null;origin:string|null;language:string|null;sourceUrl:string;integratedAt:string|null;integrationOrder:number}

function uniqBooks(items:Book[]){const m=new Map<number,Book>();for(const x of items)m.set(x.topicId,x);return [...m.values()].sort((a,b)=>b.integrationOrder-a.integrationOrder)}
function labelDate(b:Book){if(b.integratedAt)return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(b.integratedAt));return `ordre VK #${b.integrationOrder}`}

export default function BooksPanel({query}:{query:string}){
 const[books,setBooks]=useState<Book[]>([]);const[categories,setCategories]=useState<string[]>([]);const[category,setCategory]=useState('');const[page,setPage]=useState(0);const[loading,setLoading]=useState(false);const[error,setError]=useState('');const[hasMore,setHasMore]=useState(true)
 async function load(next:number,append:boolean){if(loading)return;setLoading(true);setError('');try{const r=await fetch(`/api/books?page=${next}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Catalogue indisponible');const incoming:Array<Book>=Array.isArray(d.books)?d.books:[];setBooks(prev=>uniqBooks(append?[...prev,...incoming]:incoming));setCategories(prev=>[...new Set([...(append?prev:[]),...(Array.isArray(d.categories)?d.categories:[])])].sort((a,b)=>a.localeCompare(b,'fr')));setPage(next);setHasMore(d.nextPage!==null&&incoming.length>0)}catch(e){setError(e instanceof Error?e.message:'Catalogue indisponible')}finally{setLoading(false)}}
 useEffect(()=>{void load(0,false)},[])
 const visible=useMemo(()=>{const q=query.trim().toLocaleLowerCase('fr');return books.filter(b=>(!category||b.genres.some(g=>g===category))&&(!q||(b.title+' '+b.description+' '+b.genres.join(' ')).toLocaleLowerCase('fr').includes(q)))},[books,category,query])
 return <section className="booksWrap">
  <div className="booksHead"><div><strong>Au Phil Des Bulles</strong><small>Bandes dessinées en français · ordre d’intégration VK</small></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Toutes les classifications</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
  <div className="booksNotice">Les fiches et métadonnées viennent de l’index public du groupe VK. La date exacte est affichée lorsqu’elle est publiée dans l’index ; sinon l’ordre de création du sujet VK est conservé. Un PDF direct n’est affiché que si sa diffusion autorisée peut être vérifiée ; sinon la fiche VK reste accessible.</div>
  {error&&<div className="error">{error}</div>}
  <div className="bookGrid">{visible.map(b=><article className="bookCard" key={b.topicId}><div className="bookTop"><span>BD</span><small>{labelDate(b)}</small></div><h2>{b.title}</h2><div className="bookTags">{b.genres.map(g=><span key={g}>{g}</span>)}</div><dl>{b.publication&&<><dt>Parution</dt><dd>{b.publication}</dd></>}{b.tomes&&<><dt>Tomes</dt><dd>{b.tomes}</dd></>}{b.origin&&<><dt>Origine</dt><dd>{b.origin}</dd></>}{b.language&&<><dt>Langue</dt><dd>{b.language}</dd></>}</dl><button onClick={()=>window.open(b.sourceUrl,'_blank','noopener,noreferrer')}>Voir la fiche VK ↗</button></article>)}</div>
  {!loading&&!visible.length&&<div className="booksEmpty">Aucune BD trouvée pour ce filtre.</div>}
  {hasMore&&<button className="booksMore" disabled={loading} onClick={()=>void load(page+1,true)}>{loading?'Chargement…':'Charger plus'}</button>}
  {loading&&!books.length&&<div className="booksLoading">Indexation du catalogue…</div>}
 </section>
}
