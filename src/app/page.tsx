'use client';

import { useState } from 'react';
import SiroParserTab from '@/components/SiroParserTab';
import DebtBaseGeneratorTab from '@/components/DebtBaseGeneratorTab';
import SiroLogo from '@/components/SiroLogo';

type Tab = 'validator' | 'generator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('validator');

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
                <button
                  onClick={() => setActiveTab('validator')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'validator'
                      ? 'text-white border-b-2 border-white'
                      : 'text-[var(--siro-light-gray)] hover:text-white'
                  }`}
                >
                  Validador Base de Deuda
                </button>
                <button
                  onClick={() => setActiveTab('generator')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'generator'
                      ? 'text-white border-b-2 border-white'
                      : 'text-[var(--siro-light-gray)] hover:text-white'
                  }`}
                >
                  Generador de Base de Deuda
                </button>
                <button
                  disabled
                  className="px-3 py-2 text-sm font-medium text-[var(--siro-light-gray)] opacity-60 cursor-not-allowed"
                >
                  Reportes
                </button>
                <button
                  disabled
                  className="px-3 py-2 text-sm font-medium text-[var(--siro-light-gray)] opacity-60 cursor-not-allowed"
                >
                  Configuración
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'validator' ? <SiroParserTab /> : <DebtBaseGeneratorTab />}
      </main>
    </div>
  );
}
