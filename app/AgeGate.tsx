'use client'

export default function AgeGate({onAccept}:{onAccept:()=>void}){
 return <div className="gate"><div className="gateCard"><b>18+</b><h1>Accès réservé aux adultes</h1><p>Je certifie avoir au moins 18 ans et être autorisé à consulter ce contenu dans mon pays.</p><button onClick={onAccept}>J’ai 18 ans ou plus</button></div></div>
}
