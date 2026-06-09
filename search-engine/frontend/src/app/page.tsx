'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4" style={{ marginTop: '-8vh' }}>
      <div className="mb-6 text-center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3050ff" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <h1 className="text-3xl font-light tracking-wide">Search Engine</h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
               style={{ color: 'var(--color-search-border)' }} fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the indexed web..."
            className="search-input w-full h-12 pl-11 pr-16 text-base rounded-full border focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ background: 'var(--color-btn-background)', color: 'var(--color-btn-font)' }}
          >
            Search
          </button>
        </div>
      </form>

      <p className="fixed bottom-6 text-xs" style={{ color: 'var(--color-search-border)' }}>
        Powered by Rust · Tantivy · Next.js
      </p>
    </main>
  )
}
