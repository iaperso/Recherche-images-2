import type { Metadata } from 'next'
import './globals.css'
import './books.css'

export const metadata: Metadata={title:'VISUAL SEARCH',description:'VISUAL SEARCH'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
