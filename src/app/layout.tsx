import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaalTaar — Learn Tamil & Malayalam Songs on Guitar',
  description: 'Interactive guitar learning app for Tamil and Malayalam film songs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#09090b] text-white min-h-screen flex flex-col`}>
        <nav className="sticky top-0 z-40 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm shadow-lg shadow-amber-500/20">
                🎸
              </div>
              <span className="font-bold text-lg tracking-tight group-hover:text-amber-400 transition-colors">
                TaalTaar
              </span>
            </Link>
            <div className="text-xs text-zinc-500 hidden sm:flex items-center gap-1.5">
              <span>Tamil</span>
              <span className="text-zinc-700">·</span>
              <span>Malayalam</span>
              <span className="text-zinc-700">·</span>
              <span>Guitar</span>
            </div>
          </div>
        </nav>

        <main className="flex-1 flex w-full justify-center">
          {children}
        </main>

        <footer className="mt-20 border-t border-zinc-800/40 bg-zinc-900/20">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs shadow-sm shadow-amber-500/20">
                🎸
              </div>
              <span className="text-sm font-semibold text-zinc-400">TaalTaar</span>
            </div>
            <p className="text-xs text-zinc-600">Learn Indian film songs on guitar</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
