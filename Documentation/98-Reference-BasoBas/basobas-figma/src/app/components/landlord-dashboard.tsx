import { Home, Inbox, Star, ChevronRight, Plus, Eye } from 'lucide-react';
import { LandlordDock } from './landlord-dock';

interface DashboardProps {
  onNavigate?: (screen: string) => void;
}

export function LandlordDashboard({ onNavigate }: DashboardProps = {}) {
  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ width: '390px', height: '844px', fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Header */}
      <div
        className="h-[72px] w-full bg-white flex items-center justify-between px-6"
        style={{ borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#F0EDE8]" />
          <div className="ml-3">
            <div className="text-[13px] text-[#AAAAAA] leading-tight">Good morning</div>
            <div className="text-[17px] font-semibold text-[#0A0A0A] leading-tight">Bikash Sharma</div>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.('AddListingStep1')}
          className="w-10 h-10 rounded-full bg-[#0A0A0A] flex items-center justify-center"
        >
          <Plus size={18} color="#FFFFFF" />
        </button>
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(844px - 72px - 110px)', paddingBottom: '20px' }}>
        {/* Stats Row */}
        <div className="px-6 pt-6 flex gap-[10px]">
          {/* Listings */}
          <button
            onClick={() => onNavigate?.('MyProperties')}
            className="flex-1 h-[92px] rounded-2xl bg-[#0A0A0A] relative px-3 py-2.5 flex flex-col justify-between text-left"
          >
            <Home size={16} color="rgba(255,255,255,0.3)" className="absolute top-2.5 right-2.5" />
            <div className="font-['DM_Serif_Display',serif] text-[28px] text-white leading-none mt-1">3</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>Active Listings</div>
          </button>
          {/* Requests */}
          <button
            onClick={() => onNavigate?.('VisitRequests')}
            className="flex-1 h-[92px] rounded-2xl bg-[#FEF3DC] relative px-3 py-2.5 flex flex-col justify-between text-left"
          >
            <Inbox size={16} color="#B45309" className="absolute top-2.5 right-2.5" />
            <div className="font-['DM_Serif_Display',serif] text-[28px] text-[#0A0A0A] leading-none mt-1">8</div>
            <div className="text-[11px] text-[#6B6B6B]">Visit Requests</div>
          </button>
          {/* Reviews */}
          <div className="flex-1 h-[92px] rounded-2xl bg-[#E8F5EE] relative px-3 py-2.5 flex flex-col justify-between">
            <Star size={16} color="#1A6B4A" className="absolute top-2.5 right-2.5" fill="#1A6B4A" />
            <div className="font-['DM_Serif_Display',serif] text-[28px] text-[#0A0A0A] leading-none mt-1">4.8</div>
            <div className="text-[11px] text-[#6B6B6B]">24 Reviews</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 mt-5">
          <button
            onClick={() => onNavigate?.('AddListingStep1')}
            className="w-full h-12 rounded-full bg-white border border-[#0A0A0A] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#0A0A0A]"
          >
            <Plus size={16} /> Add new listing
          </button>
        </div>

        {/* Insights Section */}
        <div className="px-6 mt-6">
          <div className="text-[11px] text-[#AAAAAA] uppercase tracking-wider mb-2">Insights</div>
          <div className="rounded-2xl border border-[#E8E8E8] overflow-hidden">
            {[
              { icon: Eye, color: '#3B82F6', bg: '#DBEAFE', title: '358 total views', sub: 'Across 3 listings · last 30 days' },
              { icon: Inbox, color: '#F5A623', bg: '#FEF3DC', title: '12% request rate', sub: 'Above average for Baluwatar' },
              { icon: Star, color: '#1A6B4A', bg: '#E8F5EE', title: '2 new reviews', sub: 'Both 5-star this week' },
            ].map((row, i, arr) => {
              const Icon = row.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 h-[64px]"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid #F2F1ED' : 'none' }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: row.bg }}>
                    <Icon size={15} color={row.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#0A0A0A] truncate">{row.title}</div>
                    <div className="text-[11px] text-[#AAAAAA] mt-0.5 truncate">{row.sub}</div>
                  </div>
                  <ChevronRight size={14} color="#CCCCCC" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-6 mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-[#AAAAAA] uppercase tracking-wider">Recent Activity</div>
            <button onClick={() => onNavigate?.('VisitRequests')} className="text-[11px] text-[#0A0A0A]">See all</button>
          </div>
          <div className="rounded-2xl border border-[#E8E8E8] overflow-hidden">
            {[
              { title: 'Sandeep K. requested visit', sub: '2BHK Baluwatar · 2m ago', right: { label: 'New', bg: '#FEF3DC', color: '#B45309' } },
              { title: 'Anita G. saved your listing', sub: 'Studio Patan · 1h ago' },
              { title: 'New 5★ review from Rajan', sub: 'Bhaisepati House · Yesterday' },
            ].map((row, i, arr) => (
              <button
                key={i}
                onClick={() => onNavigate?.('RequestDetail')}
                className="w-full flex items-center gap-3 px-4 h-[60px] text-left"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #F2F1ED' : 'none' }}
              >
                <div className="w-9 h-9 rounded-full bg-[#F0EDE8] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#0A0A0A] truncate leading-tight">{row.title}</div>
                  <div className="text-[11px] text-[#AAAAAA] mt-0.5 truncate">{row.sub}</div>
                </div>
                {row.right ? (
                  <span
                    className="text-[11px] rounded-full"
                    style={{ background: row.right.bg, color: row.right.color, padding: '3px 8px' }}
                  >
                    {row.right.label}
                  </span>
                ) : (
                  <ChevronRight size={14} color="#CCCCCC" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>

      <LandlordDock active="dashboard" badge={{ tab: 'requests', count: 8 }} onNavigate={onNavigate} />
    </div>
  );
}
