import { StatusBar } from '../components/StatusBar';
import { PropertyCard } from '../components/PropertyCard';
import { PROPERTIES } from '../data/properties';
import { useState } from 'react';

export function VisitsScreen({
  onPropertySelect,
}: {
  onBack: () => void;
  onPropertySelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<'saved' | 'visits'>('saved');
  const items = tab === 'saved' ? PROPERTIES.slice(0, 3) : PROPERTIES.slice(1, 4);

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAFAF8' }}>
      <StatusBar />

      <div className="px-6 pt-2 pb-4">
        <h1 style={{ fontSize: 24 }}>Saved & Visits</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          Keep track of places you love and tours you've booked.
        </p>
      </div>

      <div className="px-6 pb-2">
        <div
          className="flex items-center p-1"
          style={{ background: '#FFFFFF', borderRadius: 999, border: '1px solid #ECECE8' }}
        >
          {(['saved', 'visits'] as const).map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1"
                style={{
                  height: 42,
                  borderRadius: 999,
                  background: active ? '#0F1114' : 'transparent',
                  color: active ? '#FFFFFF' : '#6B7280',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                {t === 'saved' ? 'Saved' : 'Upcoming visits'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-4 pb-32 flex flex-col gap-4">
        {tab === 'visits' && (
          <div
            className="p-4 flex items-center gap-4"
            style={{ background: '#0F1114', color: '#FFFFFF', borderRadius: 20 }}
          >
            <div
              className="flex flex-col items-center justify-center"
              style={{ width: 56, height: 64, borderRadius: 14, background: '#FFFFFF', color: '#0F1114' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>FRI</span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>14</span>
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 14, fontWeight: 700 }}>Tour at Oakridge Residence</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>10:30 AM · with Abdur Rob</div>
            </div>
          </div>
        )}
        {items.map((p) => (
          <PropertyCard key={p.id} property={p} onClick={() => onPropertySelect(p.id)} />
        ))}
      </div>
    </div>
  );
}
