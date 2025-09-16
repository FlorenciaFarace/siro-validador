'use client';

import { useState } from 'react';
import { TabConfig } from '@/types';

interface TabsInterfaceProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export default function TabsInterface({ tabs, activeTab, onTabChange, children }: TabsInterfaceProps) {
  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-[var(--siro-green)] text-[var(--siro-green)]'
                  : 'border-transparent text-gray-500 hover:text-[var(--siro-green)] hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
