import { useState } from 'react';
import { ChevronRight, ArrowLeft, ArrowRight, Search, Home, Check, Phone, ChevronDown, Lock, Delete, ShieldCheck, Camera, Info, Upload, Shield, Zap, BadgeCheck, CalendarClock, MapPin, BedDouble, Building2, Building, Sparkles } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import {
  TenantProfileContent,
  LandlordProfileContent,
  EditProfileContent,
  SettingsContent,
  PublicLandlordProfileContent,
  NotificationDrawerContent,
  SavedPropertiesContent,
  VisitHistoryTenantContent,
  VisitHistoryLandlordContent,
  RentalPreferencesContent,
  KycUploadContent,
  AiPreferencesContent,
  MyReviewsContent,
  VerificationStatusContent,
  ListYourPropertyContent,
} from './components/profile-screens';

const SCREENS = [
  { num: '01', name: 'App Loading' },
  { num: '02', name: 'Feature · Verified' },
  { num: '03', name: 'Feature · Visits' },
  { num: '04', name: 'Feature · Map Search' },
  { num: '05', name: 'Landing' },
  { num: '06', name: 'Phone Entry' },
  { num: '07', name: 'OTP Verification' },
  { num: '08', name: 'Role Selection' },
  { num: '09', name: 'Profile Setup' },
  { num: '10', name: 'KYC Verification (Landlord)' },
  { num: '11', name: 'KYC Verification (Tenant Optional)' },
  { num: '32', name: 'Tenant Profile' },
  { num: '33', name: 'Landlord Profile' },
  { num: '34', name: 'Edit Profile' },
  { num: '35', name: 'Settings' },
  { num: '36', name: 'Public Landlord Profile' },
  { num: '37', name: 'Notification Drawer' },
  { num: '38', name: 'Saved Properties' },
  { num: '39', name: 'Visit History (Tenant)' },
  { num: '40', name: 'Visit History (Landlord)' },
  { num: '41', name: 'Rental Preferences' },
  { num: '42', name: 'KYC Upload (Tenant)' },
  { num: '43', name: 'AI Preferences' },
  { num: '44', name: 'My Reviews' },
  { num: '45', name: 'Verification Status' },
  { num: '46', name: 'List Your Property' },
];

export default function App() {
  const [active, setActive] = useState('01');
  const current = SCREENS.find((s) => s.num === active) ?? SCREENS[0];

  return (
    <div
      className="size-full flex items-center justify-center"
      style={{ background: '#D9DBD3', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div
        className="relative flex"
        style={{
          width: 1440,
          height: 900,
          maxWidth: '100vw',
          maxHeight: '100vh',
          background: '#F4F4F0',
          overflow: 'hidden',
          color: '#0A0A0A',
        }}
      >
        {/* ─── LEFT SIDEBAR ─── */}
        <aside
          className="relative shrink-0 flex flex-col"
          style={{
            width: 300,
            height: 900,
            background: '#FFFFFF',
            borderRight: '1px solid #E8E8E8',
          }}
        >
          {/* Top */}
          <div
            className="flex flex-col justify-center"
            style={{ height: 64, padding: '0 20px', borderBottom: '1px solid #E8E8E8' }}
          >
            <span
              style={{
                fontFamily: 'DM Serif Display, serif',
                fontSize: 20,
                color: '#0A0A0A',
                lineHeight: 1.1,
              }}
            >
              BasoBas
            </span>
            <div className="flex items-center" style={{ gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: '#999999' }}>Screen Manager</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#1A6B4A',
                  background: '#E8F5EE',
                  padding: '1px 6px',
                  borderRadius: 999,
                }}
              >
                BETA
              </span>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '8px 12px 16px' }}>
            <div
              style={{
                fontSize: 11,
                color: '#AAAAAA',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 600,
                margin: '8px 8px 8px 8px',
              }}
            >
              Auth Flow
            </div>

            {SCREENS.map((s) => {
              const selected = s.num === active;
              return (
                <button
                  key={s.num}
                  onClick={() => setActive(s.num)}
                  className="w-full flex items-center text-left"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    padding: '0 12px',
                    marginBottom: 4,
                    background: selected ? '#0A0A0A' : 'transparent',
                    color: selected ? '#FFFFFF' : '#333333',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: selected ? '#FFFFFF' : '#AAAAAA',
                      width: 20,
                    }}
                  >
                    {s.num}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      marginLeft: 12,
                      flex: 1,
                      color: selected ? '#FFFFFF' : '#333333',
                    }}
                  >
                    {s.name}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    color={selected ? '#FFFFFF' : '#CCCCCC'}
                  />
                </button>
              );
            })}
          </div>

          {/* Bottom */}
          <div
            className="flex items-center shrink-0"
            style={{
              height: 56,
              padding: '0 20px',
              borderTop: '1px solid #E8E8E8',
              fontSize: 12,
              color: '#AAAAAA',
            }}
          >
            {SCREENS.length} screens · Auth + Profile
          </div>
        </aside>

        {/* ─── RIGHT CONTENT ─── */}
        <main className="flex-1 flex flex-col" style={{ background: '#F4F4F0' }}>
          {/* Top bar */}
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              height: 56,
              padding: '0 40px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E8E8E8',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A' }}>{current.name}</span>
            <span style={{ fontSize: 12, color: '#AAAAAA' }}>390 × 844 · iPhone 14</span>
          </div>

          {/* Main area */}
          <div className="flex-1 relative flex items-center justify-center">
            {/* Left arrow */}
            <button
              className="absolute flex items-center justify-center"
              style={{
                left: 'calc(50% - 150px - 60px - 36px)',
                width: 36,
                height: 36,
                background: '#FFFFFF',
                border: '1px solid #E8E8E8',
                borderRadius: 999,
              }}
              onClick={() => {
                const i = SCREENS.findIndex((s) => s.num === active);
                if (i > 0) setActive(SCREENS[i - 1].num);
              }}
            >
              <ArrowLeft size={16} color="#333333" strokeWidth={2} />
            </button>

            <div className="flex flex-col items-center">
              <PhoneMockup screen={current} />
              <div style={{ marginTop: 20, fontSize: 13, color: '#888888' }}>
                {current.num} — {current.name}
              </div>
            </div>

            {/* Right arrow */}
            <button
              className="absolute flex items-center justify-center"
              style={{
                left: 'calc(50% + 150px + 60px)',
                width: 36,
                height: 36,
                background: '#FFFFFF',
                border: '1px solid #E8E8E8',
                borderRadius: 999,
              }}
              onClick={() => {
                const i = SCREENS.findIndex((s) => s.num === active);
                if (i < SCREENS.length - 1) setActive(SCREENS[i + 1].num);
              }}
            >
              <ArrowRight size={16} color="#333333" strokeWidth={2} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── iPhone mockup with Landing screen ─── */

function PhoneMockup({ screen }: { screen: { num: string; name: string } }) {
  return (
    <div
      className="relative"
      style={{
        width: 300,
        height: 610,
        background: '#1A1A1A',
        borderRadius: 48,
        border: '2px solid #2E2E2E',
      }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          left: 12,
          top: 12,
          width: 276,
          height: 586,
          background: '#FFFFFF',
          borderRadius: 38,
        }}
      >
        {screen.num === '01' ? (
          <LoadingContent />
        ) : screen.num === '02' ? (
          <FeatureContent index={0} />
        ) : screen.num === '03' ? (
          <FeatureContent index={1} />
        ) : screen.num === '04' ? (
          <FeatureContent index={2} />
        ) : screen.num === '05' ? (
          <LandingContent />
        ) : screen.num === '06' ? (
          <SignInContent />
        ) : screen.num === '07' ? (
          <OtpContent />
        ) : screen.num === '08' ? (
          <RoleSelectionContent />
        ) : screen.num === '09' ? (
          <ProfileTenantContent />
        ) : screen.num === '10' ? (
          <KycContent variant="landlord" />
        ) : screen.num === '11' ? (
          <KycContent variant="tenant" />
        ) : screen.num === '32' ? (
          <TenantProfileContent />
        ) : screen.num === '33' ? (
          <LandlordProfileContent />
        ) : screen.num === '34' ? (
          <EditProfileContent />
        ) : screen.num === '35' ? (
          <SettingsContent />
        ) : screen.num === '36' ? (
          <PublicLandlordProfileContent />
        ) : screen.num === '37' ? (
          <NotificationDrawerContent />
        ) : screen.num === '38' ? (
          <SavedPropertiesContent />
        ) : screen.num === '39' ? (
          <VisitHistoryTenantContent />
        ) : screen.num === '40' ? (
          <VisitHistoryLandlordContent />
        ) : screen.num === '41' ? (
          <RentalPreferencesContent />
        ) : screen.num === '42' ? (
          <KycUploadContent />
        ) : screen.num === '43' ? (
          <AiPreferencesContent />
        ) : screen.num === '44' ? (
          <MyReviewsContent />
        ) : screen.num === '45' ? (
          <VerificationStatusContent />
        ) : screen.num === '46' ? (
          <ListYourPropertyContent />
        ) : (
          <PlaceholderContent name={screen.name} num={screen.num} />
        )}
      </div>
    </div>
  );
}

function LandingContent() {
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#FAFAF7', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}
    >
      {/* Dynamic island */}
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Decorative grid lines */}
      <div
        className="absolute inset-x-0"
        style={{
          top: 0,
          bottom: 0,
          backgroundImage:
            'linear-gradient(#EFEDE6 1px, transparent 1px), linear-gradient(90deg, #EFEDE6 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between" style={{ padding: '10px 18px 0', zIndex: 1 }}>
        <div className="flex items-center" style={{ gap: 5 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: '#0A0A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontFamily: 'DM Serif Display, serif',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            B
          </div>
          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 13,
              color: '#0A0A0A',
              lineHeight: 1,
            }}
          >
            BasoBas
          </span>
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#1A6B4A',
              background: '#E8F5EE',
              padding: '2px 5px',
              borderRadius: 999,
              marginLeft: 4,
            }}
          >
            BETA
          </span>
        </div>
        <div
          style={{
            fontSize: 8,
            color: '#0A0A0A',
            fontWeight: 500,
            padding: '3px 7px',
            border: '1px solid #0A0A0A',
            borderRadius: 999,
          }}
        >
          Nepal
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center" style={{ padding: '0 20px', zIndex: 1 }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Rentals, reimagined
        </div>

        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 38,
            color: '#0A0A0A',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            marginTop: 10,
          }}
        >
          Find
          <br />
          your
          <br />
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
              style={{
                position: 'absolute',
                left: -2,
                right: -2,
                bottom: 3,
                height: 8,
                background: '#1A6B4A',
                opacity: 0.18,
                borderRadius: 2,
                zIndex: 0,
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>home.</span>
          </span>
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#5A5A5A',
            marginTop: 14,
            lineHeight: 1.5,
            maxWidth: 200,
          }}
        >
          Verified rentals. Instant visits. Real people. Built for Nepal.
        </div>

        {/* mini stats */}
        <div
          className="flex items-center"
          style={{ marginTop: 18, gap: 10, fontSize: 9, color: '#0A0A0A' }}
        >
          <div className="flex items-center" style={{ gap: 4 }}>
            <BadgeCheck size={11} color="#1A6B4A" />
            <span style={{ fontWeight: 600 }}>2,400+</span>
            <span style={{ color: '#8A8A8A' }}>verified</span>
          </div>
          <div style={{ width: 1, height: 10, background: '#D8D8D8' }} />
          <div className="flex items-center" style={{ gap: 4 }}>
            <Sparkles size={10} color="#0A0A0A" />
            <span style={{ color: '#8A8A8A' }}>updated today</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="shrink-0" style={{ padding: '0 18px 14px', zIndex: 1 }}>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            gap: 6,
          }}
        >
          Get started
          <ArrowRight size={12} color="#FFFFFF" />
        </button>
        <div
          className="text-center"
          style={{ marginTop: 9, fontSize: 10, color: '#5A5A5A', fontWeight: 500 }}
        >
          Log in with phone number
        </div>
        <div
          className="mx-auto"
          style={{ marginTop: 8, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function LoadingContent() {
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#0A0A0A', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}
    >
      <style>{`
        @keyframes basobas-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.35; }
          50%      { transform: scale(1);    opacity: 1; }
        }
        @keyframes basobas-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        @keyframes basobas-orbit {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Dynamic island */}
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#1A1A1A', borderRadius: 999 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '0 24px' }}>
        {/* Orbit loader: 4 dots cycling around a central monogram */}
        <div className="relative" style={{ width: 110, height: 110 }}>
          <div
            className="absolute inset-0"
            style={{ animation: 'basobas-orbit 2.4s linear infinite' }}
          >
            {[0, 90, 180, 270].map((deg, i) => (
              <div
                key={deg}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 8,
                  height: 8,
                  marginLeft: -4,
                  marginTop: -4,
                  transform: `rotate(${deg}deg) translate(48px) rotate(-${deg}deg)`,
                  background: i === 0 ? '#1A6B4A' : '#2E2E2E',
                  borderRadius: 999,
                  animation: `basobas-pulse 1.6s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          {/* Central monogram */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              left: '50%',
              top: '50%',
              marginLeft: -32,
              marginTop: -32,
              background: '#FFFFFF',
              borderRadius: 18,
              boxShadow: '0 8px 24px rgba(26,107,74,0.25)',
            }}
          >
            <span
              style={{
                fontFamily: 'DM Serif Display, serif',
                fontSize: 32,
                color: '#0A0A0A',
                lineHeight: 1,
              }}
            >
              B
            </span>
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex items-center" style={{ gap: 5, marginTop: 32 }}>
          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 22,
              color: '#FFFFFF',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            BasoBas
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#1A6B4A',
              background: 'rgba(26,107,74,0.18)',
              padding: '2px 6px',
              borderRadius: 999,
              marginLeft: 4,
            }}
          >
            BETA
          </span>
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#7A7A7A',
            marginTop: 8,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Find your home
        </div>

        {/* Loading bar */}
        <div
          style={{
            marginTop: 28,
            width: 140,
            height: 2,
            background: '#1F1F1F',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '45%',
              height: '100%',
              background: '#1A6B4A',
              borderRadius: 999,
              animation: 'basobas-bar 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0" style={{ paddingBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: '#5A5A5A', letterSpacing: '0.1em' }}>
          v 1.0 · Nepal
        </div>
        <div
          className="mx-auto"
          style={{ marginTop: 8, width: 90, height: 3, borderRadius: 999, background: '#FFFFFF', opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

const FEATURES = [
  {
    eyebrow: 'Only verified',
    headline: 'Real homes.\nVerified humans.',
    body: 'Every listing on BasoBas is checked by our team. No catfish. No scams. Just the real deal.',
  },
  {
    eyebrow: 'Visits in seconds',
    headline: 'Book a tour\nin one tap.',
    body: 'Pick a time that works. Landlords confirm fast. Skip the back and forth on Viber.',
  },
  {
    eyebrow: 'Search by area',
    headline: 'Explore by\nneighborhood.',
    body: 'See every verified rental on a live map. Filter by price, beds, and what matters most to you.',
  },
];

function FeatureContent({ index }: { index: number }) {
  const f = FEATURES[index];

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Dynamic island */}
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Header: brand + skip */}
      <div className="shrink-0 flex items-center justify-between" style={{ padding: '8px 18px 0' }}>
        <div className="flex items-center" style={{ gap: 4 }}>
          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 13,
              color: '#0A0A0A',
              lineHeight: 1,
            }}
          >
            BasoBas
          </span>
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#1A6B4A',
              background: '#E8F5EE',
              padding: '2px 5px',
              borderRadius: 999,
              marginLeft: 4,
            }}
          >
            BETA
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 500 }}>Skip</div>
      </div>

      {/* Visual */}
      <div className="shrink-0" style={{ padding: '20px 20px 0' }}>
        <FeatureVisual index={index} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col" style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {f.eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 26,
            color: '#0A0A0A',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            marginTop: 9,
            whiteSpace: 'pre-line',
          }}
        >
          {f.headline}
        </div>
        <div style={{ fontSize: 11, color: '#5A5A5A', marginTop: 10, lineHeight: 1.5 }}>{f.body}</div>
      </div>

      {/* Pagination + CTA */}
      <div className="shrink-0" style={{ padding: '0 18px 14px' }}>
        <div className="flex items-center justify-center" style={{ gap: 6, marginBottom: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: i === index ? 16 : 5,
                height: 5,
                borderRadius: 999,
                background: i === index ? '#0A0A0A' : '#D8D8D8',
                transition: 'all 200ms',
              }}
            />
          ))}
        </div>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            gap: 6,
          }}
        >
          {index < 2 ? 'Next' : 'Get started'}
          <ArrowRight size={12} color="#FFFFFF" />
        </button>
        <div
          className="mx-auto"
          style={{ marginTop: 8, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div
        className="relative w-full"
        style={{
          height: 200,
          background: '#F4F4F0',
          borderRadius: 18,
          overflow: 'hidden',
          padding: 16,
        }}
      >
        {/* stacked cards */}
        {[2, 1, 0].map((i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: 16 + i * 14,
              top: 28 + i * 14,
              right: 16 + i * 14,
              height: 80,
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #ECECE6',
              boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
              opacity: 1 - i * 0.18,
            }}
          />
        ))}
        {/* front card content */}
        <div
          className="absolute flex items-center"
          style={{
            left: 16,
            top: 28,
            right: 16,
            height: 80,
            padding: 12,
            gap: 10,
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #ECECE6',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ width: 50, height: 56, borderRadius: 10, background: '#0A0A0A' }} />
          <div className="flex-1">
            <div style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A' }}>Oakridge Studio</div>
            <div style={{ fontSize: 8, color: '#7A7A7A', marginTop: 3 }}>Lalitpur · 1BHK</div>
            <div className="flex items-center" style={{ gap: 3, marginTop: 6 }}>
              <BadgeCheck size={9} color="#1A6B4A" />
              <span style={{ fontSize: 8, color: '#1A6B4A', fontWeight: 600 }}>Verified</span>
            </div>
          </div>
        </div>
        {/* big seal */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            right: 14,
            bottom: 14,
            width: 56,
            height: 56,
            borderRadius: 999,
            background: '#1A6B4A',
            boxShadow: '0 6px 14px rgba(26,107,74,0.35)',
          }}
        >
          <BadgeCheck size={26} color="#FFFFFF" strokeWidth={2.2} />
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div
        className="relative w-full"
        style={{
          height: 200,
          background: '#F4F4F0',
          borderRadius: 18,
          overflow: 'hidden',
          padding: 16,
        }}
      >
        {/* calendar card */}
        <div
          className="absolute"
          style={{
            left: 16,
            top: 22,
            width: 140,
            background: '#FFFFFF',
            border: '1px solid #ECECE6',
            borderRadius: 14,
            padding: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 9, fontWeight: 600, color: '#0A0A0A' }}>Fri, May 30</div>
            <CalendarClock size={11} color="#1A6B4A" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9 }}>
            {[
              { t: '10:00 AM', a: true },
              { t: '01:30 PM', a: false },
              { t: '04:00 PM', a: false },
            ].map((s) => (
              <div
                key={s.t}
                className="flex items-center justify-between"
                style={{
                  background: s.a ? '#0A0A0A' : '#F5F5F5',
                  color: s.a ? '#FFFFFF' : '#5A5A5A',
                  borderRadius: 8,
                  padding: '5px 8px',
                  fontSize: 8,
                  fontWeight: 500,
                }}
              >
                {s.t}
                {s.a && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
              </div>
            ))}
          </div>
        </div>
        {/* confirmation pill */}
        <div
          className="absolute flex items-center"
          style={{
            right: 14,
            bottom: 22,
            background: '#1A6B4A',
            color: '#FFFFFF',
            borderRadius: 999,
            padding: '7px 12px',
            gap: 6,
            fontSize: 9,
            fontWeight: 600,
            boxShadow: '0 6px 14px rgba(26,107,74,0.3)',
          }}
        >
          <Check size={11} color="#FFFFFF" strokeWidth={3} />
          Confirmed
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{
        height: 200,
        background: '#EEF1EC',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {/* Map grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(#DDE3DC 1px, transparent 1px), linear-gradient(90deg, #DDE3DC 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* Roads */}
      <div
        className="absolute"
        style={{ left: 0, right: 0, top: 78, height: 10, background: '#FFFFFF', opacity: 0.85 }}
      />
      <div
        className="absolute"
        style={{ top: 0, bottom: 0, left: 132, width: 8, background: '#FFFFFF', opacity: 0.85 }}
      />
      {/* Park blob */}
      <div
        className="absolute"
        style={{
          left: 18,
          top: 16,
          width: 96,
          height: 52,
          background: '#D6E5D3',
          borderRadius: '50% 30% 40% 50% / 40% 50% 30% 50%',
        }}
      />

      {/* Inactive pins */}
      {[
        { l: 36, t: 30 },
        { l: 84, t: 110 },
        { l: 168, t: 36 },
        { l: 210, t: 130 },
        { l: 250, t: 60 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{
            left: p.l,
            top: p.t,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1.5px solid #0A0A0A',
          }}
        >
          <MapPin size={10} color="#0A0A0A" />
        </div>
      ))}

      {/* Active pin */}
      <div
        className="absolute flex flex-col items-center"
        style={{ left: 130, top: 64 }}
      >
        <div
          className="flex items-center"
          style={{
            background: '#0A0A0A',
            color: '#FFFFFF',
            padding: '4px 8px',
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 600,
            gap: 4,
            boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
          }}
        >
          NPR 28k
          <BadgeCheck size={9} color="#1A6B4A" />
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid #0A0A0A',
            marginTop: -1,
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: '#1A6B4A',
            border: '2px solid #FFFFFF',
            marginTop: -2,
            boxShadow: '0 0 0 6px rgba(26,107,74,0.18)',
          }}
        />
      </div>

      {/* Compass / locate FAB */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: 12,
          bottom: 12,
          width: 30,
          height: 30,
          borderRadius: 999,
          background: '#FFFFFF',
          border: '1px solid #ECECE6',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
        }}
      >
        <MapPin size={13} color="#0A0A0A" />
      </div>
    </div>
  );
}

function RoleSelectionContent() {
  // Scale: target frame 390×844 → rendered 276×586 (~0.71×).
  // Sizes below are tuned for the mockup, not pixel-mapped from spec.
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#FFFFFF', position: 'relative' }}>
      {/* Dynamic island */}
      <div
        className="absolute"
        style={{
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 26,
          background: '#0A0A0A',
          borderRadius: 999,
        }}
      />

      {/* Status bar spacer */}
      <div style={{ height: 44 }} />

      {/* Header: back */}
      <div className="flex items-center" style={{ padding: '8px 16px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} color="#0A0A0A" />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '12px 18px 0' }}>
        <div style={{ width: '100%', height: 4, background: '#F0F0F0', borderRadius: 999 }}>
          <div style={{ width: '33%', height: '100%', background: '#0A0A0A', borderRadius: 999 }} />
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            fontWeight: 500,
            color: '#AAAAAA',
            textAlign: 'right',
          }}
        >
          1 of 3
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '14px 18px 0' }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Step 1 · Choose your role
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 20,
            color: '#0A0A0A',
            lineHeight: '24px',
            marginTop: 8,
            letterSpacing: '-0.3px',
          }}
        >
          How will you use
          <br />
          BasoBas?
        </div>
        <div style={{ fontSize: 10, color: '#6B6B6B', marginTop: 7, lineHeight: '14px' }}>
          Your role shapes your experience.
          <br />
          You can switch this later from your profile.
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          padding: '16px 18px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <MiniRoleCard
          selected
          Icon={Search}
          title="I'm Looking to Rent"
          subtitle="Browse listings, schedule visits, find your next home."
        />
        <MiniRoleCard
          Icon={Home}
          title="I Have a Property to List"
          subtitle="List your space, manage visit requests, find tenants."
        />
        <div
          style={{
            fontSize: 8,
            color: '#AAAAAA',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Not sure? You can always add the other role later.
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ marginTop: 'auto', padding: '0 18px 18px' }}>
        <div
          className="flex items-center justify-center"
          style={{
            height: 36,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            gap: 5,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Continue to Profile Setup
          <ArrowRight size={12} strokeWidth={2.4} color="#FFFFFF" />
        </div>
        <div className="flex justify-center" style={{ marginTop: 10 }}>
          <div style={{ width: 90, height: 3.5, borderRadius: 999, background: '#0A0A0A', opacity: 0.85 }} />
        </div>
      </div>
    </div>
  );
}

function MiniRoleCard({
  selected,
  Icon,
  title,
  subtitle,
}: {
  selected?: boolean;
  Icon: typeof Search;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: selected ? '1.5px solid #0A0A0A' : '1.5px solid #E8E8E8',
        borderRadius: 14,
        padding: '12px 12px 12px',
        boxShadow: selected ? '0 3px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, background: '#0A0A0A', borderRadius: 9 }}
        >
          <Icon size={15} strokeWidth={2.2} color="#FFFFFF" />
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: selected ? '#0A0A0A' : 'transparent',
            border: selected ? 'none' : '1.5px solid #E8E8E8',
          }}
        >
          {selected && <Check size={10} strokeWidth={3} color="#FFFFFF" />}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
          {title}
        </div>
        <div style={{ fontSize: 9, color: '#6B6B6B', lineHeight: '13px', marginTop: 3 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function SignInContent() {
  const [phone, setPhone] = useState('9812345678');
  const filled = phone.length > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Dynamic island */}
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Header */}
      <div className="shrink-0" style={{ padding: '6px 14px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={14} color="#0A0A0A" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '22px 16px 0' }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Phone verification
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 22,
            color: '#0A0A0A',
            lineHeight: 1.15,
            marginTop: 10,
          }}
        >
          Welcome to<br />BasoBas
        </div>
        <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 9, lineHeight: 1.5 }}>
          Enter your Nepal phone number.<br />We'll send you a one-time code.
        </div>

        {/* Phone input row */}
        <div className="flex" style={{ marginTop: 26, gap: 8 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 62,
              height: 40,
              background: '#F5F5F5',
              border: '1.5px solid #E8E8E8',
              borderRadius: 11,
              gap: 4,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>NP</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A' }}>+977</span>
            <ChevronDown size={9} color="#6B6B6B" />
          </div>
          <div
            className="flex-1 flex items-center"
            style={{
              height: 40,
              background: '#F5F5F5',
              border: '1.5px solid #0A0A0A',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              style={{
                width: '100%',
                background: 'transparent',
                outline: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: filled ? 600 : 400,
                color: filled ? '#0A0A0A' : '#ABABAB',
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#ABABAB', marginTop: 6 }}>Nepal (+977) · 10 digits</div>

        {/* Privacy */}
        <div className="flex items-center" style={{ marginTop: 16, gap: 6 }}>
          <Lock size={10} color="#ABABAB" />
          <div style={{ fontSize: 9, color: '#ABABAB' }}>
            Your number is never shared publicly.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="shrink-0" style={{ padding: '12px 16px 14px' }}>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: filled ? '#0A0A0A' : '#EFEFEF',
            color: filled ? '#FFFFFF' : '#ABABAB',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Send Verification Code →
        </button>
        <div
          className="mx-auto"
          style={{ marginTop: 10, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#34A853"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC04"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#EA4335"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppleLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 384 512" fill="#FFFFFF" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.4 84.5C282.7 53.9 280.3 25.7 279.5 16c-23.7 1.4-51.1 16.2-66.7 34.4-17.2 19.5-27.3 43.6-25.1 71 25.6 2 49-11.1 68.7-36.9z" />
    </svg>
  );
}

function PhoneEntryContent() {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#FFFFFF', position: 'relative' }}>
      {/* Dynamic island */}
      <div
        className="absolute"
        style={{
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 26,
          background: '#0A0A0A',
          borderRadius: 999,
        }}
      />
      <div style={{ height: 44 }} />

      {/* Back */}
      <div style={{ padding: '8px 16px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} color="#0A0A0A" />
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '20px 18px 0' }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Enter your code
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 18,
            color: '#0A0A0A',
            lineHeight: '22px',
            marginTop: 8,
            letterSpacing: '-0.3px',
          }}
        >
          What&apos;s your
          <br />
          phone number?
        </div>
        <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 8, lineHeight: '13px' }}>
          We&apos;ll send a 6-digit code to verify it&apos;s really you.
        </div>
      </div>

      {/* Phone input group */}
      <div style={{ padding: '22px 18px 0', display: 'flex', gap: 7 }}>
        {/* Country pill */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 60,
            height: 36,
            background: '#F5F5F5',
            border: '1.5px solid #E8E8E8',
            borderRadius: 10,
            gap: 3,
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>NP</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A' }}>+977</span>
          <ChevronDown size={9} color="#6B6B6B" strokeWidth={2.2} />
        </div>
        {/* Phone field */}
        <div
          className="flex-1 flex items-center"
          style={{
            height: 36,
            background: '#F5F5F5',
            border: '1.5px solid #0A0A0A',
            borderRadius: 10,
            padding: '0 12px',
            fontSize: 11,
            fontWeight: 600,
            color: '#0A0A0A',
            letterSpacing: '0.02em',
          }}
        >
          9812345678
          <span
            className="inline-block"
            style={{
              width: 1.5,
              height: 14,
              background: '#0A0A0A',
              marginLeft: 4,
            }}
          />
        </div>
      </div>
      <div style={{ padding: '6px 18px 0', fontSize: 8, color: '#ABABAB' }}>
        Nepal number · 10 digits
      </div>

      {/* Privacy */}
      <div className="flex items-center" style={{ padding: '14px 18px 0', gap: 5 }}>
        <Lock size={10} color="#ABABAB" strokeWidth={2} />
        <span style={{ fontSize: 8, color: '#ABABAB', lineHeight: '12px' }}>
          Your number is never shared with landlords or tenants.
        </span>
      </div>

      {/* CTA + fade */}
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -28,
            height: 28,
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 100%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ padding: '0 18px 10px', background: '#FFFFFF', position: 'relative' }}>
          <div
            className="flex items-center justify-center"
            style={{
              height: 34,
              background: '#0A0A0A',
              color: '#FFFFFF',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Send Verification Code
          </div>
        </div>

        {/* iOS number keyboard */}
        <NumberKeyboard />
      </div>
    </div>
  );
}

function NumberKeyboard() {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];
  return (
    <div style={{ background: '#CDD0D7', padding: '6px 4px 8px' }}>
      {rows.map((row, ri) => (
        <div key={ri} className="flex" style={{ gap: 4, marginBottom: 4 }}>
          {row.map((k, ci) => {
            if (k === '') return <div key={ci} style={{ flex: 1 }} />;
            if (k === 'del')
              return (
                <div
                  key={ci}
                  className="flex items-center justify-center"
                  style={{
                    flex: 1,
                    height: 22,
                    background: 'transparent',
                  }}
                >
                  <Delete size={13} color="#0A0A0A" strokeWidth={2} />
                </div>
              );
            return (
              <div
                key={ci}
                className="flex items-center justify-center"
                style={{
                  flex: 1,
                  height: 22,
                  background: '#FFFFFF',
                  borderRadius: 5,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#0A0A0A',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
                }}
              >
                {k}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex justify-center" style={{ marginTop: 2 }}>
        <div style={{ width: 90, height: 3.5, borderRadius: 999, background: '#0A0A0A', opacity: 0.85 }} />
      </div>
    </div>
  );
}

function OtpContent() {
  // 6 boxes: first 3 filled, 4th active, last 2 empty
  const boxes = ['filled', 'filled', 'filled', 'active', 'empty', 'empty'] as const;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#FFFFFF', position: 'relative' }}>
      {/* Dynamic island */}
      <div
        className="absolute"
        style={{
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 26,
          background: '#0A0A0A',
          borderRadius: 999,
        }}
      />
      <div style={{ height: 44 }} />

      {/* Back */}
      <div style={{ padding: '8px 16px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} color="#0A0A0A" />
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '16px 18px 0' }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: '#1A6B4A',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Enter your code
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 18,
            color: '#0A0A0A',
            marginTop: 8,
            letterSpacing: '-0.3px',
          }}
        >
          Enter the code
        </div>
        <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 8, lineHeight: '13px' }}>
          We sent a 6-digit code to
          <br />
          <span style={{ fontWeight: 600, color: '#0A0A0A' }}>+977 98XXXXX78</span>
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#1A6B4A',
            textDecoration: 'underline',
            marginTop: 6,
          }}
        >
          Wrong number?
        </div>
      </div>

      {/* OTP boxes */}
      <div className="flex justify-center" style={{ padding: '20px 14px 0', gap: 5 }}>
        {boxes.map((state, i) => (
          <OtpBox key={i} state={state} />
        ))}
      </div>

      {/* Resend row */}
      <div
        className="flex items-center justify-center"
        style={{ padding: '10px 0 0', gap: 4, fontSize: 9 }}
      >
        <span style={{ color: '#ABABAB' }}>Didn&apos;t get it?</span>
        <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Resend in 00:42</span>
      </div>

      {/* Security card */}
      <div style={{ padding: '18px 18px 0' }}>
        <div
          className="flex items-start"
          style={{
            background: '#F5F5F5',
            borderRadius: 12,
            padding: 10,
            gap: 8,
          }}
        >
          <ShieldCheck size={14} color="#0A0A0A" strokeWidth={2} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A' }}>
              Keep your code private
            </div>
            <div style={{ fontSize: 8, color: '#6B6B6B', lineHeight: '12px', marginTop: 2 }}>
              BasoBas will never call or message you asking for this code.
            </div>
          </div>
        </div>
      </div>

      {/* Verify button + helper */}
      <div style={{ padding: '16px 18px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{
            height: 34,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Verify &amp; Continue
        </div>
        <div
          style={{
            fontSize: 8,
            color: '#ABABAB',
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Code auto-verifies when all 6 digits are entered.
        </div>
      </div>

      {/* Keyboard */}
      <div style={{ marginTop: 'auto' }}>
        <NumberKeyboard />
      </div>
    </div>
  );
}

function OtpBox({ state }: { state: 'filled' | 'active' | 'empty' }) {
  if (state === 'filled') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: 34,
          height: 42,
          background: '#0A0A0A',
          borderRadius: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#FFFFFF',
            display: 'block',
          }}
        />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: 34,
          height: 42,
          background: '#FFFFFF',
          border: '2px solid #0A0A0A',
          borderRadius: 10,
          boxShadow: '0 0 0 3px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ width: 2, height: 18, background: '#0A0A0A' }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: 34,
        height: 42,
        background: '#F5F5F5',
        border: '1.5px solid #E8E8E8',
        borderRadius: 10,
      }}
    />
  );
}

function ProfileTenantContent() {
  const [name, setName] = useState('Sarina Shrestha');
  const [city] = useState('Kathmandu');
  const [pref, setPref] = useState('Room');
  const prefs = [
    { label: 'Room', Icon: BedDouble },
    { label: 'Apartment', Icon: Building2 },
    { label: 'House', Icon: Home },
    { label: 'Office', Icon: Building },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Dynamic island */}
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Header */}
      <div className="shrink-0 flex items-center" style={{ padding: '6px 14px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={14} color="#0A0A0A" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0" style={{ padding: '10px 16px 0' }}>
        <div style={{ width: '100%', height: 4, background: '#F0F0F0', borderRadius: 999 }}>
          <div style={{ width: '66%', height: '100%', background: '#0A0A0A', borderRadius: 999 }} />
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            fontWeight: 500,
            color: '#AAAAAA',
            textAlign: 'right',
          }}
        >
          2 of 3
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '12px 16px 0' }}>
        {/* Title */}
        <div style={{ fontSize: 9, fontWeight: 600, color: '#1A6B4A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Step 2 · Your profile
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 21,
            color: '#0A0A0A',
            lineHeight: 1.15,
            marginTop: 6,
          }}
        >
          Tell us about<br />yourself
        </div>
        <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 6, lineHeight: 1.45 }}>
          This helps landlords know who you are before approving your visit requests.
        </div>

        {/* Photo upload */}
        <div className="flex flex-col items-center" style={{ marginTop: 16 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              border: '1.5px dashed #E8E8E8',
              padding: 4,
            }}
          >
            <div
              className="flex flex-col items-center justify-center"
              style={{ width: '100%', height: '100%', borderRadius: 999, background: '#F5F5F5' }}
            >
              <Camera size={18} color="#6B6B6B" />
              <div style={{ fontSize: 8, color: '#ABABAB', marginTop: 2 }}>Add photo</div>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: '#6B6B6B' }}>
            Full name <span style={{ color: '#E53E3E' }}>*</span>
          </div>
          <div
            className="flex items-center"
            style={{
              marginTop: 5,
              height: 40,
              background: '#F5F5F5',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              style={{
                flex: 1,
                background: 'transparent',
                outline: 'none',
                border: 'none',
                fontSize: 11,
                color: '#0A0A0A',
              }}
            />
            {name && (
              <div
                className="flex items-center justify-center"
                style={{ width: 16, height: 16, borderRadius: 999, background: '#E8F5EE' }}
              >
                <Check size={10} color="#1A6B4A" strokeWidth={3} />
              </div>
            )}
          </div>

          <div style={{ fontSize: 9, fontWeight: 500, color: '#6B6B6B', marginTop: 12 }}>
            Your city <span style={{ color: '#E53E3E' }}>*</span>
          </div>
          <div
            className="flex items-center"
            style={{
              marginTop: 5,
              height: 40,
              background: '#F5F5F5',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <div style={{ flex: 1, fontSize: 11, color: '#0A0A0A' }}>{city}</div>
            <ChevronDown size={12} color="#6B6B6B" />
          </div>
        </div>

        {/* Preferences */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 500,
              color: '#ABABAB',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Quick preferences (optional)
          </div>
          <div
            className="flex gap-1.5 overflow-x-auto scrollbar-hide"
            style={{ marginTop: 8, paddingBottom: 2 }}
          >
            {prefs.map((p) => {
              const active = p.label === pref;
              const Icon = p.Icon;
              return (
                <button
                  key={p.label}
                  onClick={() => setPref(p.label)}
                  className="shrink-0 flex items-center"
                  style={{
                    height: 26,
                    padding: '0 10px',
                    borderRadius: 999,
                    background: active ? '#0A0A0A' : '#F5F5F5',
                    color: active ? '#FFFFFF' : '#6B6B6B',
                    fontSize: 10,
                    fontWeight: 500,
                    gap: 5,
                  }}
                >
                  <Icon size={11} color={active ? '#FFFFFF' : '#6B6B6B'} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0" style={{ padding: '10px 16px 14px' }}>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Continue →
        </button>
        <div
          className="text-center"
          style={{ marginTop: 8, fontSize: 9, color: '#AAAAAA' }}
        >
          Step 2 of 3 · Almost there
        </div>
        <div
          className="mx-auto"
          style={{ marginTop: 6, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function KycContent({ variant }: { variant: 'landlord' | 'tenant' }) {
  const isLandlord = variant === 'landlord';

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between" style={{ padding: '6px 14px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={14} color="#0A0A0A" />
        </div>
        {isLandlord ? (
          <div style={{ width: 30 }} />
        ) : (
          <div style={{ fontSize: 11, fontWeight: 500, color: '#AAAAAA' }}>Skip</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="shrink-0" style={{ padding: '10px 16px 0' }}>
        <div style={{ width: '100%', height: 4, background: '#F0F0F0', borderRadius: 999 }}>
          <div style={{ width: '100%', height: '100%', background: '#0A0A0A', borderRadius: 999 }} />
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            fontWeight: 500,
            color: '#AAAAAA',
            textAlign: 'right',
          }}
        >
          3 of 3
        </div>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '12px 16px 0' }}>
        <div className="flex items-center justify-between">
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#1A6B4A',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Step 3 · Identity Verification
          </div>
          <div
            style={{
              background: isLandlord ? '#FFF3E0' : '#E8F5EE',
              color: isLandlord ? '#B45309' : '#1A6B4A',
              fontSize: 8,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            {isLandlord ? 'Required' : 'Optional'}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 21,
            color: '#0A0A0A',
            lineHeight: 1.15,
            marginTop: 8,
          }}
        >
          Verify your<br />identity
        </div>
        <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 7, lineHeight: 1.45 }}>
          {isLandlord
            ? 'Verification is required before you can publish any property listing.'
            : 'Optional for tenants. Verified profiles get faster visit approvals from landlords.'}
        </div>

        {/* Tenant benefit nudge */}
        {!isLandlord && (
          <div
            className="flex items-start"
            style={{
              marginTop: 10,
              background: '#E8F5EE',
              borderRadius: 9,
              padding: '8px 11px',
              gap: 6,
            }}
          >
            <Zap size={11} color="#1A6B4A" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 10, color: '#2E7D5A', lineHeight: 1.4 }}>
              Verified tenants get 3× faster approvals from landlords.
            </div>
          </div>
        )}

        {/* Trust card */}
        <div
          style={{
            marginTop: 14,
            background: '#F5F5F5',
            borderRadius: 13,
            padding: 12,
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <Shield size={14} color="#1A6B4A" />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
              Why we verify identity
            </div>
          </div>
          <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Builds trust between tenants and landlords',
              'Keeps the platform safe from scams',
              'Your listings show a Verified ✓ badge',
            ].map((t) => (
              <div key={t} className="flex items-start" style={{ gap: 6 }}>
                <Check size={10} color="#1A6B4A" strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: '#6B6B6B', lineHeight: 1.4 }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
          Upload your document
        </div>
        <div className="flex" style={{ marginTop: 6, gap: 8 }}>
          {['Front side', 'Back side'].map((label) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center justify-center"
              style={{
                height: 78,
                background: '#F5F5F5',
                border: '1.5px dashed #CCCCCC',
                borderRadius: 13,
                padding: 6,
              }}
            >
              <Upload size={14} color="#AAAAAA" />
              <div style={{ fontSize: 10, fontWeight: 500, color: '#6B6B6B', marginTop: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 8, color: '#AAAAAA', marginTop: 1 }}>Tap to upload</div>
            </div>
          ))}
        </div>

        {/* Accepted chips */}
        <div className="flex items-center justify-center" style={{ marginTop: 9, gap: 6 }}>
          {['Citizenship', 'NID Card'].map((c) => (
            <div
              key={c}
              style={{
                background: '#F0F0F0',
                color: '#6B6B6B',
                fontSize: 9,
                padding: '3px 9px',
                borderRadius: 999,
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#AAAAAA', marginTop: 6, textAlign: 'center' }}>
          JPEG or PNG · Max 5MB each
        </div>

        <div style={{ height: 12 }} />
      </div>

      {/* CTA */}
      <div className="shrink-0" style={{ padding: '10px 16px 12px' }}>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {isLandlord ? 'Submit & Finish Setup →' : 'Submit for Verification →'}
        </button>
        {isLandlord ? (
          <div
            className="text-center"
            style={{ marginTop: 8, fontSize: 9, color: '#AAAAAA', lineHeight: 1.4 }}
          >
            Review takes 1–2 business days.<br />You can explore the app meanwhile.
          </div>
        ) : (
          <div
            className="text-center"
            style={{ marginTop: 8, fontSize: 10, fontWeight: 500, color: '#AAAAAA' }}
          >
            Skip for now, I'll do this later
          </div>
        )}
        <div
          className="mx-auto"
          style={{ marginTop: 6, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function ProfileLandlordContent() {
  const [name, setName] = useState('Ramesh Thapa');
  const [city] = useState('Kathmandu');

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
      <div className="relative shrink-0" style={{ height: 26 }}>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
        />
      </div>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between" style={{ padding: '6px 14px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 999, background: '#F5F5F5' }}
        >
          <ArrowLeft size={14} color="#0A0A0A" />
        </div>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#6B6B6B' }}>Step 2 of 3</div>
        <div style={{ width: 30 }} />
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#1A6B4A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Landlord setup
        </div>
        <div
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 22,
            color: '#0A0A0A',
            lineHeight: 1.1,
            marginTop: 6,
          }}
        >
          Set up your<br />landlord profile
        </div>
        <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 6, lineHeight: 1.45 }}>
          Complete your profile and verify your identity to start listing.
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center" style={{ marginTop: 16 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              border: '1.5px dashed #E8E8E8',
              padding: 4,
            }}
          >
            <div
              className="flex flex-col items-center justify-center"
              style={{ width: '100%', height: '100%', borderRadius: 999, background: '#F5F5F5' }}
            >
              <Camera size={18} color="#6B6B6B" />
              <div style={{ fontSize: 8, color: '#ABABAB', marginTop: 2 }}>Profile photo</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 7,
              background: '#E8F5EE',
              color: '#1A6B4A',
              fontSize: 9,
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 999,
            }}
          >
            Required
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: '#6B6B6B' }}>Full name</div>
          <div
            className="flex items-center"
            style={{
              marginTop: 5,
              height: 40,
              background: '#F5F5F5',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                outline: 'none',
                border: 'none',
                fontSize: 11,
                color: '#0A0A0A',
              }}
            />
            <div
              className="flex items-center justify-center"
              style={{ width: 16, height: 16, borderRadius: 999, background: '#E8F5EE' }}
            >
              <Check size={10} color="#1A6B4A" strokeWidth={3} />
            </div>
          </div>

          <div style={{ fontSize: 9, fontWeight: 500, color: '#6B6B6B', marginTop: 12 }}>Your city</div>
          <div
            className="flex items-center"
            style={{
              marginTop: 5,
              height: 40,
              background: '#F5F5F5',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <div style={{ flex: 1, fontSize: 11, color: '#0A0A0A' }}>{city}</div>
            <ChevronDown size={12} color="#6B6B6B" />
          </div>

          <div style={{ fontSize: 9, fontWeight: 500, color: '#6B6B6B', marginTop: 12 }}>Phone number</div>
          <div
            className="flex items-center"
            style={{
              marginTop: 5,
              height: 40,
              background: '#F0F0F0',
              borderRadius: 11,
              padding: '0 12px',
            }}
          >
            <div style={{ flex: 1, fontSize: 11, color: '#0A0A0A' }}>+977 9812345678</div>
            <Lock size={11} color="#ABABAB" />
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#1A6B4A', marginTop: 4 }}>Verified ✓</div>
        </div>

        {/* KYC section */}
        <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>Identity Verification</div>
          <div
            style={{
              background: '#FFF4E5',
              color: '#B45309',
              fontSize: 9,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            Required
          </div>
        </div>

        {/* Trust card */}
        <div
          style={{
            marginTop: 9,
            background: '#F5F5F5',
            borderRadius: 13,
            padding: 12,
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <Shield size={14} color="#1A6B4A" />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
              Why verification is required
            </div>
          </div>
          <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Builds trust with potential tenants',
              'Keeps BasoBas safe and scam-free',
              'Your listings show a Verified badge',
            ].map((t) => (
              <div key={t} className="flex items-start" style={{ gap: 6 }}>
                <Check size={10} color="#1A6B4A" strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: '#6B6B6B', lineHeight: 1.4 }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload zones */}
        <div className="flex" style={{ marginTop: 12, gap: 8 }}>
          {[
            { label: 'Front side', sub: 'Citizenship or NID' },
            { label: 'Back side', sub: 'Citizenship or NID' },
          ].map((z) => (
            <div
              key={z.label}
              className="flex-1 flex flex-col items-center justify-center"
              style={{
                height: 74,
                background: '#F5F5F5',
                border: '1.5px dashed #D0D0D0',
                borderRadius: 13,
                padding: 6,
              }}
            >
              <Upload size={14} color="#ABABAB" />
              <div style={{ fontSize: 10, fontWeight: 500, color: '#6B6B6B', marginTop: 4 }}>
                {z.label}
              </div>
              <div style={{ fontSize: 8, color: '#ABABAB', marginTop: 1 }}>{z.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#ABABAB', marginTop: 6, textAlign: 'center' }}>
          JPEG or PNG · Max 5MB per photo
        </div>

        {/* Accepted chips */}
        <div className="flex items-center" style={{ marginTop: 10, gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 9, color: '#ABABAB' }}>Accepted:</div>
          {['Citizenship', 'ID Card'].map((c) => (
            <div
              key={c}
              style={{
                background: '#F5F5F5',
                color: '#6B6B6B',
                fontSize: 9,
                padding: '4px 9px',
                borderRadius: 999,
              }}
            >
              {c}
            </div>
          ))}
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* CTA */}
      <div className="shrink-0" style={{ padding: '10px 16px 14px' }}>
        <button
          className="w-full flex items-center justify-center"
          style={{
            height: 40,
            background: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Submit & Continue
        </button>
        <div
          className="text-center"
          style={{ marginTop: 8, fontSize: 9, color: '#ABABAB', lineHeight: 1.4 }}
        >
          Review takes 1–2 business days.<br />You can draft listings meanwhile.
        </div>
        <div
          className="mx-auto"
          style={{ marginTop: 6, width: 90, height: 3, borderRadius: 999, background: '#0A0A0A' }}
        />
      </div>
    </div>
  );
}

function PlaceholderContent({ name, num }: { name: string; num: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: '#AAAAAA', letterSpacing: '1px', fontWeight: 600 }}>
        SCREEN {num}
      </div>
      <div
        style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: 18,
          color: '#0A0A0A',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        {name}
      </div>
      <div style={{ fontSize: 11, color: '#888888', marginTop: 8, textAlign: 'center' }}>
        Coming soon
      </div>
    </div>
  );
}
