import { useState, useMemo } from 'react';
import { Bell, Search, SlidersHorizontal, MapPin, ChevronRight } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { CategoryChips } from '../components/CategoryChips';
import { PropertyCard } from '../components/PropertyCard';
import { PROPERTIES } from '../data/properties';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export function HomeScreen({
  onPropertySelect,
  onMapView,
  onNotifications,
}: {
  onPropertySelect: (id: string) => void;
  onMapView: () => void;
  onNotifications: () => void;
}) {
  const [category, setCategory] = useState('Home');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return PROPERTIES.filter(
      (p) =>
        (category === 'Home' || p.category === category) &&
        (query.length === 0 ||
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.city.toLowerCase().includes(query.toLowerCase())),
    );
  }, [category, query]);

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAFAF8' }}>
      <StatusBar />

      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              overflow: 'hidden',
              border: '2px solid #FFFFFF',
              boxShadow: '0 4px 12px rgba(15,17,20,0.08)',
            }}
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200"
              alt="Roman"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1114', letterSpacing: '-0.01em' }}>
              Hi, Roman
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              <MapPin size={12} strokeWidth={2.4} />
              New York City
            </div>
          </div>
        </div>
        <button
          onClick={onNotifications}
          className="flex items-center justify-center relative"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
          }}
        >
          <Bell size={18} strokeWidth={2.2} color="#0F1114" />
          <span
            className="absolute"
            style={{
              top: 10,
              right: 12,
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#E84545',
              border: '2px solid #FFFFFF',
            }}
          />
        </button>
      </div>

      <div className="px-6 pb-4">
        <div
          className="flex items-center gap-2"
          style={{
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
            borderRadius: 18,
            padding: 6,
          }}
        >
          <div className="flex items-center gap-2 flex-1 pl-3">
            <Search size={18} strokeWidth={2.2} color="#9CA3AF" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your new place"
              className="flex-1 outline-none bg-transparent"
              style={{ fontSize: 14, color: '#0F1114', height: 40 }}
            />
          </div>
          <button
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#0F1114',
            }}
          >
            <SlidersHorizontal size={16} strokeWidth={2.4} color="#FFFFFF" />
          </button>
        </div>
      </div>

      <CategoryChips active={category} onChange={setCategory} />

      <div className="flex-1 overflow-y-auto scrollbar-hide pt-5 pb-32">
        <div className="px-6 flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 20 }}>Top Properties</h2>
          <button className="flex items-center gap-1" style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>
            See all
            <ChevronRight size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="px-6 flex flex-col gap-4">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => onPropertySelect(p.id)} />
          ))}
          {filtered.length === 0 && (
            <div
              className="text-center py-10"
              style={{ color: '#9CA3AF', fontSize: 14 }}
            >
              No properties match your search.
            </div>
          )}
        </div>

        <div className="px-6 mt-8">
          <button
            onClick={onMapView}
            className="w-full flex items-center justify-between"
            style={{
              background: '#0F1114',
              color: '#FFFFFF',
              borderRadius: 20,
              padding: '18px 22px',
            }}
          >
            <div className="text-left">
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Explore on map
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {PROPERTIES.length} properties near you
              </div>
            </div>
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 999, background: '#FFFFFF' }}
            >
              <ChevronRight size={18} strokeWidth={2.4} color="#0F1114" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
