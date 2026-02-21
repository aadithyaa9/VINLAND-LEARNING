import type { Metadata } from 'next'
import { Cinzel, Crimson_Text } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700', '900'],
})

const crimson = Crimson_Text({
  subsets: ['latin'],
  variable: '--font-crimson',
  weight: ['400', '600'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Vinland Saga Learning — The Path of Knowledge',
  description: 'An AI-powered learning companion forged in the spirit of Vinland Saga',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${crimson.variable} font-body`}>
        {children}
      </body>
    </html>
  )
}
