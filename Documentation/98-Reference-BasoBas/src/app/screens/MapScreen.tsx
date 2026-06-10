import { ArrowLeft, Layers, Locate } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { PropertyCard } from '../components/PropertyCard';
import { PROPERTIES } from '../data/properties';
import { useState } from 'react';

export function MapScreen({
  onBack,
  onPropertySelect,
}: {
  onBack: () => void;
  onPropertySelect: (id: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  const pins: { left: string; top: string }[] = [
    { left: '22%', top: '28%' },
    { left: '58%', top: '38%' },
    { left: '36%', top: '58%' },
    { left: '72%', top: '64%' },
  ];

  return (
    <div className="h-full flex flex-col relative" style={{ background: '#E9ECEF' }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #EDEFF2 0%, #E2E5EA 100%)',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(15,17,20,0.04) 0, transparent 35%), radial-gradient(circle at 80% 70%, rgba(15,17,20,0.05) 0, transparent 40%)',
        }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 390 844" preserveAspectRatio="none">
          <path d="M0,200 C100,180 180,260 260,240 C320,225 370,260 390,250" stroke="#CFD4DB" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M0,420 C80,400 160,460 220,440 C300,420 360,470 390,450" stroke="#CFD4DB" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M40,0 C60,140 90,260 70,420 C50,560 120,720 100,844" stroke="#CFD4DB" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M260,0 C280,160 240,320 280,480 C310,620 280,760 300,844" stroke="#CFD4DB" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="120" y="280" width="60" height="40" rx="6" fill="#DFE3E8" />
          <rect x="220" y="180" width="80" height="50" rx="6" fill="#DFE3E8" />
          <rect x="60" y="500" width="70" height="50" rx="6" fill="#DFE3E8" />
          <rect x="240" y="540" width="90" height="60" rx="6" fill="#DFE3E8" />
        </svg>
      </div>

      <StatusBar />

      <div className="px-6 pt-2 pb-4 flex items-center justify-between relative">
        <button
          onClick={onBack}
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#FFFFFF',
            boxShadow: '0 6px 16px rgba(15,17,20,0.1)',
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.4} color="#0F1114" />
        </button>
        <div
          className="px-4 py-2"
          style={{
            background: '#FFFFFF',
            borderRadius: 999,
            boxShadow: '0 6px 16px rgba(15,17,20,0.1)',
            fontSize: 13,
            fontWeight: 700,
            color: '#0F1114',
          }}
        >
          New York City
        </div>
        <button
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#FFFFFF',
            boxShadow: '0 6px 16px rgba(15,17,20,0.1)',
          }}
        >
          <Layers size={18} strokeWidth={2.4} color="#0F1114" />
        </button>
      </div>

      <div className="relative flex-1">
        {PROPERTIES.map((p, i) => {
          const active = i === activeIdx;
          return (
            <button
              key={p.id}
              onClick={() => setActiveIdx(i)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pins[i].left, top: pins[i].top }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  paddingInline: 14,
                  height: 36,
                  borderRadius: 999,
                  background: active ? '#0F1114' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#0F1114',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: '0 10px 24px rgba(15,17,20,0.18)',
                  border: active ? 'none' : '1px solid #ECECE8',
                }}
              >
                ${(p.price / 1000).toFixed(1)}k
              </div>
            </button>
          );
        })}

        <button
          className="absolute right-6 bottom-72 flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: '#FFFFFF',
            boxShadow: '0 8px 20px rgba(15,17,20,0.12)',
          }}
        >
          <Locate size={18} strokeWidth={2.4} color="#0F1114" />
        </button>
      </div>

      <div className="absolute left-0 right-0 bottom-28 px-6">
        <PropertyCard
          property={PROPERTIES[activeIdx]}
          onClick={() => onPropertySelect(PROPERTIES[activeIdx].id)}
        />
      </div>
    </div>
  );
}
