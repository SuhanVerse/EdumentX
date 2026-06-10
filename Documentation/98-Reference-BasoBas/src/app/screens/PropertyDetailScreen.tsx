import { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  BedDouble,
  Bath,
  Layers,
  Maximize2,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getProperty } from '../data/properties';

export function PropertyDetailScreen({
  propertyId,
  onBack,
  onRequestVisit,
}: {
  propertyId: string;
  onBack: () => void;
  onRequestVisit: () => void;
}) {
  const property = getProperty(propertyId);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAFAF8' }}>
      <div className="relative">
        <ImageWithFallback
          src={property.gallery[activeImg]}
          alt={property.title}
          className="w-full object-cover"
          style={{ height: 380 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,17,20,0.25) 0%, rgba(15,17,20,0) 25%, rgba(15,17,20,0) 60%, rgba(15,17,20,0.45) 100%)',
          }}
        />

        <div className="absolute top-0 left-0 right-0 pt-12 px-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.4} color="#0F1114" />
          </button>
          <button
            onClick={() => setSaved((s) => !s)}
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Heart
              size={18}
              strokeWidth={2.2}
              color={saved ? '#E84545' : '#0F1114'}
              fill={saved ? '#E84545' : 'transparent'}
            />
          </button>
        </div>

        <div className="absolute bottom-4 left-6 right-6 flex gap-2">
          {property.gallery.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                overflow: 'hidden',
                border: i === activeImg ? '2px solid #FFFFFF' : '2px solid transparent',
                opacity: i === activeImg ? 1 : 0.7,
              }}
            >
              <ImageWithFallback src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-40 -mt-6">
        <div
          className="px-6 pt-6 pb-5"
          style={{
            background: '#FAFAF8',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 style={{ fontSize: 22 }}>{property.title}</h1>
              <div className="flex items-center gap-1.5 mt-2" style={{ color: '#6B7280', fontSize: 13 }}>
                <MapPin size={14} strokeWidth={2.2} />
                {property.address}, {property.city}
              </div>
            </div>
            <div className="text-right">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#0F1114',
                  letterSpacing: '-0.02em',
                }}
              >
                ${(property.price / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>per month</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Star size={15} strokeWidth={2.2} fill="#0F1114" color="#0F1114" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.rating.toFixed(1)}</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>({property.reviews} reviews)</span>
          </div>

          <div
            className="grid grid-cols-4 gap-2 mt-5 p-3"
            style={{ background: '#FFFFFF', border: '1px solid #ECECE8', borderRadius: 20 }}
          >
            <Feature icon={<Layers size={16} strokeWidth={2.2} />} value={`${property.floors}`} label="Floor" />
            <Feature icon={<BedDouble size={16} strokeWidth={2.2} />} value={`${property.beds}`} label="Bed" />
            <Feature icon={<Bath size={16} strokeWidth={2.2} />} value={`${property.baths}`} label="Bath" />
            <Feature icon={<Maximize2 size={16} strokeWidth={2.2} />} value={`${property.area}`} label="sqft" />
          </div>

          <h3 className="mt-7" style={{ fontSize: 16 }}>About this place</h3>
          <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginTop: 8 }}>
            {property.description}
          </p>

          <div
            className="mt-6 p-4 flex items-center gap-3"
            style={{ background: '#FFFFFF', border: '1px solid #ECECE8', borderRadius: 20 }}
          >
            <ImageWithFallback
              src={property.agent.avatar}
              alt={property.agent.name}
              className="object-cover"
              style={{ width: 48, height: 48, borderRadius: 999 }}
            />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1114' }}>
                {property.agent.name}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{property.agent.role}</div>
            </div>
            <button
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: '#F4F4F1' }}
            >
              <MessageCircle size={16} strokeWidth={2.4} color="#0F1114" />
            </button>
            <button
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: '#0F1114' }}
            >
              <Phone size={16} strokeWidth={2.4} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="absolute left-0 right-0 bottom-0 px-6 pb-6 pt-4"
        style={{
          background:
            'linear-gradient(180deg, rgba(250,250,248,0) 0%, rgba(250,250,248,0.95) 30%, #FAFAF8 100%)',
        }}
      >
        <button
          onClick={onRequestVisit}
          className="w-full flex items-center justify-center"
          style={{
            height: 56,
            background: '#0F1114',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            boxShadow: '0 12px 30px rgba(15,17,20,0.3)',
          }}
        >
          Request a visit
        </button>
      </div>
    </div>
  );
}

function Feature({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div style={{ color: '#0F1114' }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1114' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div>
    </div>
  );
}
