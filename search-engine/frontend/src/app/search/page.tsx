'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense, FormEvent } from 'react'
import Link from 'next/link'

interface SearchHit {
  title: string
  url: string
  domain: string
  snippet: string
  score: number
}

interface SearchResponse {
  query: string
  total: number
  page: number
  size: number
  time_ms: number
  results: SearchHit[]
}

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputVal, setInputVal] = useState(query)
  const [domainFilter, setDomainFilter] = useState<string>('')

  const domains = data ? [...new Set(data.results.map(h => h.domain))] : []

  useEffect(() => {
    setInputVal(query)
    if (!query) return
    setLoading(true)
    setError('')
    const body: any = { q: query, page: 0, size: 20 }
    if (domainFilter) body.domain = domainFilter
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json() })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [query, domainFilter])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (inputVal.trim()) router.push(`/search?q=${encodeURIComponent(inputVal.trim())}`)
  }

  function formatUrl(url: string) {
    try { const u = new URL(url); return u.hostname + (u.pathname !== '/' ? u.pathname : '') }
    catch { return url }
  }

  function domainFavicon(url: string) {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` }
    catch { return '' }
  }

  function stripHtml(s: string) { return s.replace(/<[^>]+>/g, '') }

  function truncateSnippet(s: string, maxLen = 400) {
    const text = stripHtml(s)
    if (text.length <= maxLen) return s
    return s.substring(0, maxLen) + '...'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-base-background)' }}>
      {/* Header */}
      <header style={{ background: 'var(--color-header-background)', borderBottom: '1px solid var(--color-header-border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3050ff"
                   strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
            <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                     style={{ color: 'var(--color-search-border)' }} fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  className="search-input w-full h-10 pl-9 pr-4 text-sm rounded-full border focus:outline-none"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-6 flex-1">
        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="space-y-4 mt-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="animate-pulse rounded-lg p-4 result-card">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-8 text-center">
              <p className="text-lg mb-2" style={{ color: 'var(--color-url-font)' }}>Search unavailable</p>
              <p className="text-sm" style={{ color: 'var(--color-search-border)' }}>{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--color-search-border)' }}>
                {data.total > 0 ? `About ${data.total} results` : 'No results'} ({data.time_ms} ms)
              </p>

              {/* Domain filter */}
              {domains.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs self-center mr-1" style={{ color: 'var(--color-search-border)' }}>Site:</span>
                  <button onClick={() => setDomainFilter('')}
                    className={`text-xs px-2 py-1 rounded-full border ${!domainFilter ? 'font-bold' : ''}`}
                    style={{ borderColor: 'var(--color-search-border)', color: 'var(--color-base-font)' }}>
                    All
                  </button>
                  {domains.map(d => (
                    <button key={d} onClick={() => setDomainFilter(d)}
                      className={`text-xs px-2 py-1 rounded-full border ${domainFilter === d ? 'font-bold' : ''}`}
                      style={{ borderColor: 'var(--color-search-border)', color: 'var(--color-base-font)' }}>
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Did you mean / suggestions */}
              {data.results.length === 0 && query && (
                <div className="mb-6 p-4 rounded-lg sidebar-box">
                  <p className="text-sm">Your search - <b>{query}</b> - did not match any documents.</p>
                  <ul className="text-xs mt-2 list-disc list-inside" style={{ color: 'var(--color-search-border)' }}>
                    <li>Make sure all words are spelled correctly</li>
                    <li>Try different keywords</li>
                    <li>Run the crawler first to populate the index</li>
                  </ul>
                </div>
              )}

              {/* Results */}
              <div className="space-y-4">
                {data.results.map((hit, i) => (
                  <div key={i} className="result-card rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <img src={domainFavicon(hit.url)} alt=""
                           className="w-5 h-5 mt-1 rounded-sm flex-shrink-0"
                           onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="min-w-0 flex-1">
                        <a href={hit.url} target="_blank" rel="noopener noreferrer"
                           className="text-base font-medium hover:underline leading-6"
                           style={{ color: 'var(--color-url-font)' }}>
                          {hit.title || formatUrl(hit.url)}
                        </a>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-green-url)' }}>
                          {formatUrl(hit.url)}
                        </p>
                        <p className="text-sm mt-1 leading-6"
                           style={{ color: 'var(--color-base-font)' }}
                           dangerouslySetInnerHTML={{ __html: truncateSnippet(hit.snippet) }} />
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-xs opacity-50" style={{ color: 'var(--color-base-font)' }}>
                            Score: {(hit.score * 100).toFixed(0)}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--color-sidebar-background)', color: 'var(--color-search-border)' }}>
                            {hit.domain}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.total > data.size && (
                <nav className="mt-8 mb-12 flex items-center justify-center gap-2 text-sm">
                  <button disabled className="px-3 py-1 rounded opacity-40"
                          style={{ border: '1px solid var(--color-search-border)' }}>Prev</button>
                  <span className="px-3 py-1 rounded font-medium"
                        style={{ background: 'var(--color-btn-background)', color: 'var(--color-btn-font)' }}>1</span>
                  <button className="px-3 py-1 rounded"
                          style={{ border: '1px solid var(--color-search-border)' }}>2</button>
                  <button className="px-3 py-1 rounded"
                          style={{ border: '1px solid var(--color-search-border)' }}>3</button>
                  <span style={{ color: 'var(--color-search-border)' }}>...</span>
                  <button className="px-3 py-1 rounded"
                          style={{ border: '1px solid var(--color-search-border)' }}>Next</button>
                </nav>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-72 hidden lg:block flex-shrink-0">
          <div className="sidebar-box rounded-lg p-4 sticky" style={{ top: '1rem' }}>
            <h3 className="text-sm font-semibold mb-2">Search Engine</h3>
            <p className="text-xs leading-5" style={{ color: 'var(--color-search-border)' }}>
              Full-text search engine powered by Rust + Tantivy. Indexed web pages with BM25 ranking.
            </p>
            {data && !loading && (
              <div className="mt-3 pt-3 text-xs"
                   style={{ borderTop: '1px solid var(--color-sidebar-border)', color: 'var(--color-search-border)' }}>
                <p>Results: <span className="font-medium" style={{ color: 'var(--color-base-font)' }}>{data.total}</span></p>
                <p className="mt-1">Time: <span className="font-medium" style={{ color: 'var(--color-base-font)' }}>{data.time_ms} ms</span></p>
                <p className="mt-1">Domains: <span className="font-medium" style={{ color: 'var(--color-base-font)' }}>{domains.length}</span></p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--color-footer-background)', borderTop: '1px solid var(--color-footer-border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 text-xs text-center"
             style={{ color: 'var(--color-search-border)' }}>
          Powered by Rust · Tantivy · Next.js
        </div>
      </footer>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen"
           style={{ background: 'var(--color-base-background)' }}>
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full"
             style={{ borderColor: 'var(--color-btn-background)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}
