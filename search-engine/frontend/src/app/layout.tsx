import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Search Engine',
  description: 'Full-text search engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
