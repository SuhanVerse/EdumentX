import { Plus, MoreVertical, MapPin } from 'lucide-react';
import { ScreenShell } from './screen-shell';

const properties = [
  { id: 1, title: '2BHK Apartment in Baluwatar', price: 'NPR 28,000/mo', status: 'Active', statusColor: '#1A6B4A', statusBg: '#E8F5EE', views: 124, requests: 8, location: 'Baluwatar, Kathmandu' },
  { id: 2, title: 'Studio Flat near Patan Durbar', price: 'NPR 15,500/mo', status: 'Active', statusColor: '#1A6B4A', statusBg: '#E8F5EE', views: 87, requests: 3, location: 'Patan, Lalitpur' },
  { id: 3, title: '3BHK House in Bhaisepati', price: 'NPR 45,000/mo', status: 'Draft', statusColor: '#F5A623', statusBg: '#FEF3DC', views: 0, requests: 0, location: 'Bhaisepati, Lalitpur' },
];

interface MyPropertiesProps {
  onNavigate?: (screen: string) => void;
}

export function MyProperties({ onNavigate }: MyPropertiesProps = {}) {
  return (
    <ScreenShell
      title="My Properties"
      showBack
      rightSlot={
        <button
          onClick={() => onNavigate?.('AddListingStep1')}
          className="w-9 h-9 rounded-full bg-[#0A0A0A] flex items-center justify-center"
        >
          <Plus size={18} color="#FFFFFF" />
        </button>
      }
    >
      <div className="px-5 pt-4 pb-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['All', 'Active', 'Draft', 'Archived'].map((tab, i) => (
            <div
              key={tab}
              className="px-3 py-1.5 rounded-full text-[12px]"
              style={{
                background: i === 0 ? '#0A0A0A' : '#F5F5F5',
                color: i === 0 ? '#FFFFFF' : '#6B6B6B',
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => onNavigate?.('PropertyDetail')}
              className="text-left rounded-2xl border border-[#E8E8E8] overflow-hidden"
            >
              <div className="h-[120px] bg-[#F0EDE8] relative">
                <div
                  className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: p.statusBg, color: p.statusColor }}
                >
                  {p.status}
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                  <MoreVertical size={14} color="#0A0A0A" />
                </div>
              </div>
              <div className="p-3">
                <div className="text-[14px] font-semibold text-[#0A0A0A] truncate">{p.title}</div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={11} color="#AAAAAA" />
                  <div className="text-[11px] text-[#AAAAAA]">{p.location}</div>
                </div>
                <div className="text-[13px] font-semibold text-[#1A6B4A] mt-2">{p.price}</div>
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#F0F0F0]">
                  <div className="text-[11px] text-[#6B6B6B]">
                    <span className="font-semibold text-[#0A0A0A]">{p.views}</span> views
                  </div>
                  <div className="text-[11px] text-[#6B6B6B]">
                    <span className="font-semibold text-[#0A0A0A]">{p.requests}</span> requests
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
