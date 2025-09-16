'use client';

import SiroParserTab from '@/components/SiroParserTab';
import SiroLogo from '@/components/SiroLogo';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--siro-light-gray)] to-white">
      {/* Header */}
      <header className="bg-[var(--siro-green)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <SiroLogo width={140} height={46} className="mr-8" />
              
              {/* Navigation Menu */}
              <nav className="flex space-x-8">
                <a 
                  href="#" 
                  className="text-[var(--siro-light-gray)] hover:text-white px-3 py-2 text-sm font-medium border-b-2 border-[var(--siro-light-gray)]"
                >
                  Validador Base de Deuda
                </a>
                <a 
                  href="#" 
                  className="text-[var(--siro-light-gray)] hover:text-white px-3 py-2 text-sm font-medium opacity-60 cursor-not-allowed"
                >
                  Reportes
                </a>
                <a 
                  href="#" 
                  className="text-[var(--siro-light-gray)] hover:text-white px-3 py-2 text-sm font-medium opacity-60 cursor-not-allowed"
                >
                  Configuración
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SiroParserTab />
      </main>

    </div>
  );
}
