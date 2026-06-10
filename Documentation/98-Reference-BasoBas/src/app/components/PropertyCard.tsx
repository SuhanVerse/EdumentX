import { Heart, Star, Layers, BedDouble, Bath } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Property } from '../data/properties';

export function PropertyCard({
  property,
  onClick,
}: {
  property: Property;
  onClick?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={onClick}
      className="w-full text-left block"
      style={{
        background: '#FFFFFF',
        borderRadius: 24,
        padding: 12,
        border: '1px solid #F0F0EE',
        boxShadow: '0 6px 20px rgba(15,17,20,0.04)',
      }}
    >
      <div className="relative">
        <ImageWithFallback
          src={property.image}
          alt={property.title}
          className="w-full object-cover"
          style={{ height: 196, borderRadius: 18 }}
        />
        {property.discount && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5"
            style={{
              background: '#0F1114',
              color: '#FFFFFF',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {property.discount}% OFF
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
          className="absolute top-3 right-3 flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Heart
            size={18}
            strokeWidth={2.2}
            fill={saved ? '#E84545' : 'transparent'}
            color={saved ? '#E84545' : '#0F1114'}
          />
        </button>
      </div>

      <div className="px-2 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#0F1114',
                letterSpacing: '-0.015em',
              }}
              className="truncate"
            >
              {property.address}, {property.city}
            </div>
            <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{property.title}</div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 700,
              color: '#0F1114',
              letterSpacing: '-0.02em',
            }}
          >
            ${(property.price / 1000).toFixed(1)}k
          </div>
        </div>

        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid #F4F4F1' }}
        >
          <Stat icon={<Layers size={14} strokeWidth={2.2} />} label={`${property.floors} Floor`} />
          <Stat icon={<BedDouble size={14} strokeWidth={2.2} />} label={`${property.beds} Bed`} />
          <Stat icon={<Bath size={14} strokeWidth={2.2} />} label={`${property.baths} Bath`} />
          <Stat
            icon={<Star size={14} strokeWidth={2.2} fill="#0F1114" />}
            label={property.rating.toFixed(1)}
          />
        </div>
      </div>
    </button>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: '#0F1114' }}>
      {icon}
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
