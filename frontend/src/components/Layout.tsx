import { Navbar } from './Navbar'
import { Spotlight } from './ui/spotlight'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <Spotlight className="min-h-[calc(100vh-4rem)]">
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </Spotlight>
    </div>
  )
}
