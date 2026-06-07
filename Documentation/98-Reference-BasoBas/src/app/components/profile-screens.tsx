import { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  Pencil,
  MapPin,
  Home,
  ChevronRight,
  User,
  Bookmark,
  CalendarClock,
  Star,
  Cpu,
  Bell,
  HelpCircle,
  Flag,
  FileText,
  Shield,
  ExternalLink,
  LogOut,
  Plus,
  Check,
  Globe,
  MessageCircle,
  Type,
  Trash2,
  Lock,
  ChevronDown,
  Search,
  ClipboardList,
  UserCircle,
  Inbox,
  LayoutGrid,
  BadgeCheck,
  Megaphone,
  Smartphone,
  Clock,
  Sparkles,
  Share2,
  Contrast,
  Phone,
} from 'lucide-react';

/* ───────────────────── Shared bits ───────────────────── */

const COLORS = {
  bg: '#FFFFFF',
  text: '#0A0A0A',
  text2: '#6B6B6B',
  text3: '#AAAAAA',
  placeholder: '#C0C0C0',
  brand: '#1A6B4A',
  brandBg: '#E8F5EE',
  border: '#E8E8E8',
  divider: '#F0F0F0',
  rowDivider: '#F5F5F5',
  input: '#F5F5F5',
  inputReadonly: '#F0F0F0',
  danger: '#E53E3E',
  dangerBg: '#FEE2E2',
};

function DynamicIsland() {
  return (
    <div className="relative shrink-0" style={{ height: 26 }}>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: 6, width: 70, height: 18, background: '#0A0A0A', borderRadius: 999 }}
      />
    </div>
  );
}

function ScreenHeader({
  title,
  right,
  showBack = false,
  centerTitle = false,
  rightText,
}: {
  title: string;
  right?: React.ReactNode;
  showBack?: boolean;
  centerTitle?: boolean;
  rightText?: { label: string; color?: string };
}) {
  return (
    <div
      className="shrink-0 flex items-center"
      style={{
        height: 40,
        padding: '0 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        justifyContent: centerTitle ? 'space-between' : 'space-between',
      }}
    >
      {showBack ? (
        <div
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 999, background: COLORS.input }}
        >
          <ArrowLeft size={13} color={COLORS.text} strokeWidth={2.2} />
        </div>
      ) : (
        <span
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 16,
            color: COLORS.text,
            lineHeight: 1,
          }}
        >
          {title}
        </span>
      )}

      {showBack && centerTitle && (
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{title}</span>
      )}

      {right ? (
        right
      ) : rightText ? (
        <span style={{ fontSize: 11, fontWeight: 600, color: rightText.color ?? COLORS.brand }}>
          {rightText.label}
        </span>
      ) : (
        <div style={{ width: 28 }} />
      )}
    </div>
  );
}

function GearButton() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: 28, height: 28, borderRadius: 999, background: COLORS.input }}
    >
      <Settings size={13} color={COLORS.text} strokeWidth={2} />
    </div>
  );
}

/* ───────────────────── Floating Dock ───────────────────── */

type TabKey = 'home' | 'search' | 'visits' | 'profile' | 'request' | 'listing';

const TAB_ICONS: Record<TabKey, typeof Home> = {
  home: Home,
  search: Search,
  visits: ClipboardList,
  profile: UserCircle,
  request: Inbox,
  listing: LayoutGrid,
};

const TAB_LABELS: Record<TabKey, string> = {
  home: 'Home',
  search: 'Search',
  visits: 'Visits',
  profile: 'Profile',
  request: 'Request',
  listing: 'Listing',
};

function FloatingDock({
  variant,
  active,
}: {
  variant: 'tenant' | 'landlord';
  active: TabKey | null;
}) {
  const tabs: TabKey[] =
    variant === 'tenant'
      ? ['home', 'search', 'visits', 'profile']
      : ['home', 'request', 'listing', 'profile'];

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center"
      style={{
        bottom: 14,
        width: 220,
        height: 46,
        borderRadius: 999,
        background: 'rgba(18, 18, 18, 0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow:
          '0 8px 28px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.10)',
        zIndex: 10,
      }}
    >
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const isActive = tab === active;
        return (
          <div
            key={tab}
            className="relative flex items-center justify-center"
            style={{ flex: 1, height: 46 }}
          >
            <Icon
              size={18}
              color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.40)'}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  width: 16,
                  height: 2.5,
                  background: '#FFFFFF',
                  borderRadius: 999,
                  bottom: 6,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────── Menu primitives ───────────────────── */

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontSize: 8,
        fontWeight: 600,
        color: color ?? COLORS.text3,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function MenuRow({
  Icon,
  label,
  sublabel,
  right,
  divider = true,
}: {
  Icon: typeof User;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        height: sublabel ? 50 : 40,
        padding: '0 14px',
        borderBottom: divider ? `1px solid ${COLORS.rowDivider}` : 'none',
        gap: 10,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 26, height: 26, background: COLORS.input, borderRadius: 7 }}
      >
        <Icon size={13} color={COLORS.text} strokeWidth={2} />
      </div>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 500 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
      {right ?? <ChevronRight size={11} color={COLORS.placeholder} strokeWidth={2} />}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: 30,
        height: 18,
        borderRadius: 999,
        background: on ? COLORS.text : '#E0E0E0',
        transition: 'background 200ms',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 200ms',
        }}
      />
    </div>
  );
}

function LogoutRow() {
  return (
    <div className="flex items-center justify-center" style={{ gap: 6, padding: '4px 0' }}>
      <LogOut size={12} color={COLORS.danger} strokeWidth={2} />
      <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.danger }}>Log Out</span>
    </div>
  );
}

function AppVersion({ extra }: { extra?: string }) {
  return (
    <div className="text-center" style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 8, color: COLORS.placeholder, fontWeight: 500 }}>
        BasoBas v1.0.0{extra ? ` · ${extra}` : ''}
      </div>
      {extra && (
        <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 4 }}>Made with ♥ in Nepal</div>
      )}
    </div>
  );
}

/* ───────────────────── Profile Hero ───────────────────── */

function ProfileAvatar({ size = 56 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: COLORS.input,
          border: '2px solid #FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}
      >
        <User size={size * 0.42} color={COLORS.placeholder} strokeWidth={1.8} />
      </div>
      <div
        className="absolute flex items-center justify-center"
        style={{
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          background: COLORS.text,
          borderRadius: 999,
          border: '1.5px solid #FFFFFF',
        }}
      >
        <Pencil size={8} color="#FFFFFF" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function StatColumn({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.text,
          letterSpacing: '-0.01em',
        }}
      >
        {accent ? (
          <span>
            <span style={{ color: '#F5A623' }}>★ </span>
            {value}
          </span>
        ) : (
          value
        )}
      </div>
      <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function VerticalDivider() {
  return <div style={{ width: 1, height: 22, background: COLORS.divider }} />;
}

/* ─────────────────── 32 — Tenant Profile ─────────────────── */

export function TenantProfileContent() {
  return (
    <div
      className="h-full flex flex-col relative"
      style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <DynamicIsland />
      <ScreenHeader title="Profile" right={<GearButton />} />

      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ padding: '14px 16px 80px' }}
      >
        {/* Hero card */}
        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div className="flex items-start" style={{ gap: 12 }}>
            <ProfileAvatar size={52} />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                  Sarina Shrestha
                </span>
                <BadgeCheck size={12} color={COLORS.brand} strokeWidth={2.4} />
              </div>
              <div className="flex items-center" style={{ gap: 3, marginTop: 4 }}>
                <MapPin size={9} color={COLORS.text3} />
                <span style={{ fontSize: 10, color: COLORS.text2 }}>Kathmandu, Nepal</span>
              </div>
              <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 3 }}>
                Member since May 2025
              </div>
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                height: 22,
                padding: '0 10px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 500,
                color: COLORS.text,
              }}
            >
              Edit
            </div>
          </div>
          <div style={{ height: 1, background: COLORS.divider, margin: '12px 0' }} />
          <div className="flex items-center">
            <StatColumn value="8" label="Visits" />
            <VerticalDivider />
            <StatColumn value="12" label="Saved" />
            <VerticalDivider />
            <StatColumn value="3" label="Reviews" />
          </div>
        </div>

        {/* Verify Identity (KYC optional for tenant) */}
        <div
          className="flex items-center"
          style={{
            marginTop: 12,
            height: 56,
            background: COLORS.brandBg,
            borderRadius: 12,
            padding: '0 14px',
            gap: 10,
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 30, height: 30, background: COLORS.brand, borderRadius: 9 }}
          >
            <BadgeCheck size={15} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>
              Verify your identity
            </div>
            <div style={{ fontSize: 9, color: COLORS.text2, marginTop: 1 }}>
              Optional · Build trust with landlords
            </div>
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              height: 24,
              padding: '0 10px',
              background: COLORS.brand,
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            Verify
          </div>
        </div>

        {/* Become a landlord */}
        <div
          className="flex items-center"
          style={{
            marginTop: 10,
            height: 50,
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: '0 14px',
            gap: 10,
          }}
        >
          <Home size={14} color={COLORS.text} strokeWidth={2} />
          <div className="flex-1">
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>
              List your property
            </div>
            <div style={{ fontSize: 9, color: COLORS.text2, marginTop: 1 }}>
              Become a landlord on BasoBas
            </div>
          </div>
          <ChevronRight size={12} color={COLORS.text3} strokeWidth={2} />
        </div>

        {/* Account */}
        <div style={{ marginTop: 16 }}>
          <SectionLabel>Account</SectionLabel>
          <MenuCard>
            <MenuRow Icon={User} label="Edit Profile" />
            <MenuRow Icon={Bookmark} label="Saved Properties" />
            <MenuRow Icon={CalendarClock} label="Visit History" />
            <MenuRow Icon={Star} label="My Reviews" divider={false} />
          </MenuCard>
        </div>

        {/* Preferences */}
        <div style={{ marginTop: 16 }}>
          <SectionLabel>Preferences</SectionLabel>
          <MenuCard>
            <MenuRow Icon={Sparkles} label="Rental Preferences" sublabel="Location, type, budget" />
            <MenuRow
              Icon={Cpu}
              label="AI Preferences"
              sublabel="Manage recommendation settings"
            />
            <MenuRow Icon={Bell} label="Notifications" divider={false} />
          </MenuCard>
        </div>

        <div style={{ marginTop: 18 }}>
          <LogoutRow />
        </div>
        <AppVersion />
      </div>

      <FloatingDock variant="tenant" active="profile" />
    </div>
  );
}

/* ─────────────────── 33 — Landlord Profile ─────────────────── */

export function LandlordProfileContent() {
  return (
    <div
      className="h-full flex flex-col relative"
      style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <DynamicIsland />
      <ScreenHeader title="Profile" right={<GearButton />} />

      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ padding: '14px 16px 80px' }}
      >
        {/* Hero card */}
        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div className="flex items-start" style={{ gap: 12 }}>
            <ProfileAvatar size={52} />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                Bikash Sharma
              </div>
              <div className="flex items-center" style={{ gap: 3, marginTop: 4 }}>
                <MapPin size={9} color={COLORS.text3} />
                <span style={{ fontSize: 10, color: COLORS.text2 }}>Kathmandu, Nepal</span>
              </div>
              <div
                className="flex items-center"
                style={{
                  marginTop: 6,
                  background: COLORS.brandBg,
                  borderRadius: 999,
                  padding: '3px 8px',
                  gap: 4,
                  alignSelf: 'flex-start',
                  width: 'fit-content',
                }}
              >
                <BadgeCheck size={9} color={COLORS.brand} strokeWidth={2.4} />
                <span style={{ fontSize: 9, fontWeight: 600, color: COLORS.brand }}>
                  Identity Verified
                </span>
              </div>
              <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 4 }}>
                Citizenship Verified · May 2025
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: COLORS.divider, margin: '12px 0' }} />
          <div className="flex items-center">
            <StatColumn value="3" label="Listings" />
            <VerticalDivider />
            <StatColumn value="4.8" label="Rating" accent />
            <VerticalDivider />
            <StatColumn value="24" label="Reviews" />
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center"
          style={{
            marginTop: 12,
            background: COLORS.input,
            borderRadius: 10,
            padding: 3,
            height: 34,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              flex: 1,
              height: 28,
              background: COLORS.bg,
              borderRadius: 7,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            My Listings
          </div>
          <div
            className="flex items-center justify-center"
            style={{ flex: 1, fontSize: 11, fontWeight: 500, color: COLORS.text3 }}
          >
            Reviews
          </div>
        </div>

        {/* Listings grid */}
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 9,
          }}
        >
          <LandlordPropertyCard name="2BHK Apartment" loc="Pulchowk" price="NPR 18k/mo" req="5 requests" />
          <LandlordPropertyCard name="Studio Room" loc="Baluwatar" price="NPR 12k/mo" req="3 requests" />
        </div>

        {/* Add new listing */}
        <div
          className="flex items-center justify-center"
          style={{
            marginTop: 9,
            height: 36,
            background: COLORS.input,
            borderRadius: 10,
            border: '1px dashed #CCCCCC',
            fontSize: 10,
            fontWeight: 500,
            color: COLORS.text3,
            gap: 5,
          }}
        >
          <Plus size={11} color={COLORS.text3} strokeWidth={2.2} />
          Add New Listing
        </div>

        {/* Account */}
        <div style={{ marginTop: 16 }}>
          <SectionLabel>Account</SectionLabel>
          <MenuCard>
            <MenuRow Icon={User} label="Edit Profile" />
            <MenuRow
              Icon={BadgeCheck}
              label="Verification Status"
              right={
                <span
                  style={{
                    background: COLORS.brandBg,
                    color: COLORS.brand,
                    fontSize: 8,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 999,
                  }}
                >
                  Verified
                </span>
              }
            />
            <MenuRow Icon={CalendarClock} label="Visit History" divider={false} />
          </MenuCard>
        </div>

        {/* Preferences */}
        <div style={{ marginTop: 16 }}>
          <SectionLabel>Preferences</SectionLabel>
          <MenuCard>
            <MenuRow
              Icon={Cpu}
              label="AI Preferences"
              sublabel="Manage recommendation settings"
            />
            <MenuRow Icon={Bell} label="Notifications" divider={false} />
          </MenuCard>
        </div>

        <div style={{ marginTop: 18 }}>
          <LogoutRow />
        </div>
        <AppVersion />
      </div>

      <FloatingDock variant="landlord" active="profile" />
    </div>
  );
}

function LandlordPropertyCard({
  name,
  loc,
  price,
  req,
}: {
  name: string;
  loc: string;
  price: string;
  req: string;
}) {
  return (
    <div
      style={{
        borderRadius: 11,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        background: COLORS.bg,
      }}
    >
      <div
        className="relative"
        style={{ height: 70, background: '#F0EDE8' }}
      >
        <div
          className="absolute flex items-center"
          style={{
            top: 6,
            left: 6,
            background: '#DCFCE7',
            borderRadius: 999,
            padding: '2px 7px',
            gap: 4,
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: 999, background: '#15803D' }} />
          <span style={{ fontSize: 8, fontWeight: 600, color: '#15803D' }}>Available</span>
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.text }}>{name}</div>
        <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 1 }}>{loc}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>
          {price}
        </div>
        <div style={{ fontSize: 8, color: COLORS.text2, marginTop: 3 }}>{req}</div>
      </div>
    </div>
  );
}

/* ─────────────────── 34 — Edit Profile ─────────────────── */

export function EditProfileContent() {
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <DynamicIsland />
      <ScreenHeader
        title="Edit Profile"
        showBack
        centerTitle
        rightText={{ label: 'Save', color: COLORS.brand }}
      />

      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ padding: '18px 16px 24px' }}
      >
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 68,
              height: 68,
              borderRadius: 999,
              background: '#F0EDE8',
              border: '3px solid #FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          >
            <User size={26} color={COLORS.placeholder} strokeWidth={1.8} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.brand,
              marginTop: 8,
            }}
          >
            Change Photo
          </div>
          <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 4 }}>
            JPEG or PNG · Max 5MB
          </div>
        </div>

        {/* Personal info */}
        <div style={{ marginTop: 20 }}>
          <SectionLabel>Personal Info</SectionLabel>
          <FormField label="Full name" value="Sarina Shrestha" rightIcon={<Check size={11} color={COLORS.brand} strokeWidth={2.4} />} />
          <FormField
            label="Phone number"
            value="+977 98123XXXXX"
            readonly
            rightIcon={<Lock size={11} color={COLORS.text3} />}
            footer={
              <div style={{ fontSize: 9, fontWeight: 600, color: COLORS.brand, marginTop: 4 }}>
                Verified ✓
              </div>
            }
          />
          <FormField
            label="Your city"
            value="Kathmandu"
            rightIcon={<ChevronDown size={11} color={COLORS.text3} />}
          />
          <FormField
            label="Short bio  (optional)"
            value=""
            placeholder="Tell landlords a bit about yourself..."
            multiline
            footer={
              <div
                style={{
                  fontSize: 9,
                  color: COLORS.text3,
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                0 / 120
              </div>
            }
          />
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: 20 }}>
          <SectionLabel color={COLORS.danger}>Danger Zone</SectionLabel>
          <div
            style={{
              border: '1px solid #FEE2E2',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.danger }}>
              Delete Account
            </div>
            <div style={{ fontSize: 10, color: COLORS.text3, lineHeight: 1.4, marginTop: 4 }}>
              Permanently delete your account and all data. This cannot be undone.
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                marginTop: 10,
                height: 32,
                background: COLORS.dangerBg,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.danger,
              }}
            >
              Delete My Account
            </div>
          </div>
        </div>

        {/* Save button */}
        <div
          className="flex items-center justify-center"
          style={{
            marginTop: 18,
            height: 38,
            background: COLORS.text,
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Save Changes
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  placeholder,
  readonly,
  rightIcon,
  footer,
  multiline,
}: {
  label: string;
  value: string;
  placeholder?: string;
  readonly?: boolean;
  rightIcon?: React.ReactNode;
  footer?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: COLORS.text2, marginBottom: 5 }}>
        {label}
      </div>
      <div
        className="flex items-center"
        style={{
          height: multiline ? 64 : 38,
          background: readonly ? COLORS.inputReadonly : COLORS.input,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: '0 12px',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingTop: multiline ? 10 : 0,
        }}
      >
        <span
          className="flex-1"
          style={{
            fontSize: 11,
            color: value ? COLORS.text : COLORS.placeholder,
            fontWeight: value ? 500 : 400,
          }}
        >
          {value || placeholder}
        </span>
        {rightIcon}
      </div>
      {footer}
    </div>
  );
}

/* ─────────────────── 35 — Settings ─────────────────── */

export function SettingsContent() {
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <DynamicIsland />
      <ScreenHeader title="Settings" showBack centerTitle />

      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ padding: '14px 16px 24px' }}
      >
        <SectionLabel>Account</SectionLabel>
        <MenuCard>
          <MenuRow
            Icon={Globe}
            label="Language"
            right={
              <div className="flex items-center" style={{ gap: 3 }}>
                <span style={{ fontSize: 10, color: COLORS.text2 }}>English</span>
                <ChevronRight size={11} color={COLORS.placeholder} />
              </div>
            }
          />
          <MenuRow
            Icon={MapPin}
            label="Default City"
            right={
              <div className="flex items-center" style={{ gap: 3 }}>
                <span style={{ fontSize: 10, color: COLORS.text2 }}>Kathmandu</span>
                <ChevronRight size={11} color={COLORS.placeholder} />
              </div>
            }
            divider={false}
          />
        </MenuCard>

        <div style={{ marginTop: 16 }}>
          <SectionLabel>Notifications</SectionLabel>
          <MenuCard>
            <MenuRow
              Icon={Bell}
              label="Visit Updates"
              sublabel="Approvals, rejections, reminders"
              right={<Toggle on />}
            />
            <MenuRow
              Icon={Home}
              label="Property Alerts"
              sublabel="Saved property status changes"
              right={<Toggle on />}
            />
            <MenuRow
              Icon={Sparkles}
              label="AI Suggestions"
              sublabel="Personalized rental recommendations"
              right={<Toggle on />}
            />
            <MenuRow
              Icon={Clock}
              label="Reminders"
              sublabel="Follow-up and visit day reminders"
              right={<Toggle on={false} />}
              divider={false}
            />
          </MenuCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionLabel>Privacy</SectionLabel>
          <MenuCard>
            <MenuRow
              Icon={MapPin}
              label="Location Services"
              right={
                <div className="flex items-center" style={{ gap: 3 }}>
                  <span style={{ fontSize: 10, color: COLORS.text2 }}>While Using</span>
                  <ChevronRight size={11} color={COLORS.placeholder} />
                </div>
              }
            />
            <MenuRow
              Icon={Shield}
              label="Analytics & Data"
              sublabel="Help improve BasoBas"
              right={<Toggle on />}
            />
            <MenuRow Icon={Trash2} label="Clear Search History" divider={false} />
          </MenuCard>
        </div>

        <AppVersion extra="Build 100" />
      </div>
    </div>
  );
}

/* ─────────────────── Notification Drawer over Tenant Profile ─────────────────── */

export function NotificationDrawerContent() {
  return (
    <div className="h-full relative" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Parent (Tenant Profile) behind */}
      <div className="absolute inset-0">
        <TenantProfileContent />
      </div>
      {/* Scrim */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.40)', zIndex: 20 }}
      />
      {/* Drawer */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          background: COLORS.bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '8px 16px 18px',
          zIndex: 30,
          height: 380,
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto"
          style={{ width: 30, height: 3, borderRadius: 999, background: '#E0E0E0' }}
        />
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Notifications</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.brand }}>Done</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <SectionLabel>Stay Updated</SectionLabel>
          <NotificationRow
            iconBg={COLORS.brandBg}
            iconColor={COLORS.brand}
            Icon={Sparkles}
            title="AI Rental Suggestions"
            sub="Smart picks based on your behavior"
            on
          />
          <NotificationRow
            iconBg="#FEF9C3"
            iconColor="#B45309"
            Icon={Bell}
            title="Visit Updates"
            sub="Approvals, rejections, reminders"
            on
          />
          <NotificationRow
            iconBg="#DBEAFE"
            iconColor="#1E40AF"
            Icon={Home}
            title="Property Status Alerts"
            sub="When saved properties change status"
            on
          />
          <NotificationRow
            iconBg="#F3F4F6"
            iconColor="#6B6B6B"
            Icon={Clock}
            title="Rental Reminders"
            sub="Follow-up prompts after visits"
            on={false}
          />
          <NotificationRow
            iconBg="#F3F4F6"
            iconColor="#6B6B6B"
            Icon={Megaphone}
            title="BasoBas Updates"
            sub="New features and announcements"
            on={false}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <SectionLabel>Delivery</SectionLabel>
          <NotificationRow
            iconBg="#F3F4F6"
            iconColor="#6B6B6B"
            Icon={Smartphone}
            title="Push Notifications"
            sub="Receive alerts on your device"
            on
          />
          <NotificationRow
            iconBg="#F3F4F6"
            iconColor="#6B6B6B"
            Icon={Bell}
            title="In-App Alerts"
            sub="Banners while using the app"
            on
          />
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  Icon,
  iconBg,
  iconColor,
  title,
  sub,
  on,
}: {
  Icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  on: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        height: 48,
        padding: '0 4px',
        borderBottom: `1px solid ${COLORS.rowDivider}`,
        gap: 10,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 30, height: 30, background: iconBg, borderRadius: 9 }}
      >
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{title}</div>
        <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 1 }}>{sub}</div>
      </div>
      <Toggle on={on} />
    </div>
  );
}

/* ─────────────────── 36 — Public Landlord Profile ─────────────────── */

export function PublicLandlordProfileContent() {
  return (
    <div
      className="h-full flex flex-col relative"
      style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <DynamicIsland />
      <ScreenHeader
        title="Landlord Profile"
        showBack
        centerTitle
        right={
          <div
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 999, background: COLORS.input }}
          >
            <Share2 size={12} color={COLORS.text} strokeWidth={2} />
          </div>
        }
      />

      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ padding: '14px 16px 80px' }}
      >
        {/* Identity card */}
        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div className="flex items-start" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: '#F0EDE8',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              }}
            >
              <User size={22} color={COLORS.placeholder} strokeWidth={1.8} />
            </div>
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                Bikash Sharma
              </div>
              <div
                className="flex items-center"
                style={{
                  marginTop: 6,
                  background: COLORS.brandBg,
                  borderRadius: 999,
                  padding: '3px 8px',
                  gap: 4,
                  width: 'fit-content',
                }}
              >
                <BadgeCheck size={9} color={COLORS.brand} strokeWidth={2.4} />
                <span style={{ fontSize: 9, fontWeight: 600, color: COLORS.brand }}>
                  Identity Verified
                </span>
              </div>
              <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 4 }}>
                Member since 2023
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: COLORS.divider, margin: '12px 0' }} />
          <div className="flex items-center">
            <StatColumn value="4.8" label="Rating" accent />
            <VerticalDivider />
            <StatColumn value="62" label="Reviews" />
            <VerticalDivider />
            <StatColumn value="3" label="Listings" />
            <VerticalDivider />
            <StatColumn value="2yr" label="Active" />
          </div>
        </div>

        {/* Trust indicators */}
        <div
          style={{
            marginTop: 12,
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>
            Why tenants trust Bikash
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Identity verified with citizenship',
              'Average response time under 2 hours',
              '98% visit acceptance rate',
            ].map((t) => (
              <div key={t} className="flex items-center" style={{ gap: 6 }}>
                <Check size={10} color={COLORS.brand} strokeWidth={2.4} />
                <span style={{ fontSize: 10, color: COLORS.text2 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center"
          style={{
            marginTop: 12,
            background: COLORS.input,
            borderRadius: 10,
            padding: 3,
            height: 34,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              flex: 1,
              height: 28,
              background: COLORS.bg,
              borderRadius: 7,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            Active Listings
          </div>
          <div
            className="flex items-center justify-center"
            style={{ flex: 1, fontSize: 11, fontWeight: 500, color: COLORS.text3 }}
          >
            Reviews
          </div>
        </div>

        {/* Listings grid */}
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 9,
          }}
        >
          <PublicPropertyCard name="2BHK Apartment" loc="Pulchowk" price="NPR 18k/mo" />
          <PublicPropertyCard name="Studio Room" loc="Baluwatar" price="NPR 12k/mo" />
        </div>

        <div style={{ marginTop: 18, paddingBottom: 10 }}>
          <div className="text-center" style={{ fontSize: 11, fontWeight: 600, color: COLORS.brand }}>
            See all 62 reviews →
          </div>
        </div>
      </div>

      <FloatingDock variant="tenant" active={null} />
    </div>
  );
}

function PublicPropertyCard({ name, loc, price }: { name: string; loc: string; price: string }) {
  return (
    <div
      style={{
        borderRadius: 11,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        background: COLORS.bg,
      }}
    >
      <div className="relative" style={{ height: 70, background: '#F0EDE8' }}>
        <div
          className="absolute flex items-center"
          style={{
            top: 6,
            left: 6,
            background: '#DCFCE7',
            borderRadius: 999,
            padding: '2px 7px',
            gap: 4,
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: 999, background: '#15803D' }} />
          <span style={{ fontSize: 8, fontWeight: 600, color: '#15803D' }}>Available</span>
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.text }}>{name}</div>
        <div style={{ fontSize: 8, color: COLORS.text3, marginTop: 1 }}>{loc}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>
          {price}
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, color: COLORS.brand, marginTop: 4 }}>
          Request Visit →
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 38 — Saved Properties (Tenant) ─────────────────── */

const SAVED_PROPERTIES = [
  { name: 'Sunny 1BHK', loc: 'Lalitpur · Pulchowk', price: 'NPR 18,000', status: 'Available', tag: 'success' },
  { name: 'Studio near Patan', loc: 'Lalitpur · Kupondole', price: 'NPR 12,000', status: 'Available', tag: 'success' },
  { name: 'Cozy 2BHK', loc: 'Kathmandu · Baluwatar', price: 'NPR 25,000', status: 'In Discussion', tag: 'info' },
  { name: 'Modern Flat', loc: 'Kathmandu · Sanepa', price: 'NPR 32,000', status: 'Occupied', tag: 'muted' },
];

export function SavedPropertiesContent() {
  return (
    <div className="h-full flex flex-col relative" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="Saved" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '14px 16px 80px' }}>
        <div style={{ fontSize: 10, color: COLORS.text3, marginBottom: 10 }}>
          {SAVED_PROPERTIES.length} saved properties
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SAVED_PROPERTIES.map((p) => (
            <SavedRow key={p.name} {...p} />
          ))}
        </div>
      </div>
      <FloatingDock variant="tenant" active="profile" />
    </div>
  );
}

function SavedRow({ name, loc, price, status, tag }: { name: string; loc: string; price: string; status: string; tag: 'success' | 'info' | 'muted' }) {
  const styles = {
    success: { bg: '#DCFCE7', fg: '#15803D' },
    info: { bg: '#DBEAFE', fg: '#1E40AF' },
    muted: { bg: '#F3F4F6', fg: '#6B6B6B' },
  }[tag];
  return (
    <div className="flex" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 10, gap: 10 }}>
      <div style={{ width: 60, height: 60, borderRadius: 9, background: '#F0EDE8', flexShrink: 0 }} />
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{name}</div>
          <Bookmark size={12} color={COLORS.text} strokeWidth={2.2} fill={COLORS.text} />
        </div>
        <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 2 }}>{loc}</div>
        <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{price}</span>
          <span style={{ background: styles.bg, color: styles.fg, fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 999 }}>{status}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 39 — Visit History (Tenant) ─────────────────── */

const TENANT_VISITS = [
  { name: 'Sunny 1BHK · Pulchowk', date: 'May 28, 2026 · 10:00 AM', status: 'Completed', tag: 'success' },
  { name: 'Studio · Kupondole', date: 'May 22, 2026 · 02:30 PM', status: 'Completed', tag: 'success' },
  { name: 'Cozy 2BHK · Baluwatar', date: 'Jun 02, 2026 · 11:00 AM', status: 'Upcoming', tag: 'info' },
  { name: 'Modern Flat · Sanepa', date: 'May 18, 2026 · 04:00 PM', status: 'Cancelled', tag: 'muted' },
];

const LANDLORD_VISITS = [
  { name: 'Sarina Shrestha', date: 'May 28, 2026 · 10:00 AM', status: 'Approved', tag: 'success' },
  { name: 'Rahul Tamang', date: 'May 30, 2026 · 03:00 PM', status: 'Pending', tag: 'warn' },
  { name: 'Anita Karki', date: 'Jun 03, 2026 · 11:30 AM', status: 'Pending', tag: 'warn' },
  { name: 'Bishal KC', date: 'May 24, 2026 · 09:00 AM', status: 'Rejected', tag: 'muted' },
];

export function VisitHistoryTenantContent() {
  return <VisitHistoryScreen variant="tenant" items={TENANT_VISITS} />;
}

export function VisitHistoryLandlordContent() {
  return <VisitHistoryScreen variant="landlord" items={LANDLORD_VISITS} />;
}

function VisitHistoryScreen({ variant, items }: { variant: 'tenant' | 'landlord'; items: { name: string; date: string; status: string; tag: 'success' | 'info' | 'warn' | 'muted' }[] }) {
  const styles = {
    success: { bg: '#DCFCE7', fg: '#15803D' },
    info: { bg: '#DBEAFE', fg: '#1E40AF' },
    warn: { bg: '#FEF9C3', fg: '#B45309' },
    muted: { bg: '#F3F4F6', fg: '#6B6B6B' },
  };
  return (
    <div className="h-full flex flex-col relative" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="Visit History" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '14px 16px 80px' }}>
        {/* Filter tabs */}
        <div className="flex items-center" style={{ background: COLORS.input, borderRadius: 10, padding: 3, height: 32, marginBottom: 12 }}>
          {['All', variant === 'tenant' ? 'Upcoming' : 'Pending', 'Completed'].map((t, i) => (
            <div key={t} className="flex items-center justify-center" style={{ flex: 1, height: 26, background: i === 0 ? COLORS.bg : 'transparent', borderRadius: 7, boxShadow: i === 0 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', fontSize: 10, fontWeight: 600, color: i === 0 ? COLORS.text : COLORS.text3 }}>
              {t}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((v, i) => {
            const s = styles[v.tag];
            return (
              <div key={i} className="flex items-center" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, gap: 10 }}>
                <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: COLORS.input, borderRadius: 10 }}>
                  <CalendarClock size={15} color={COLORS.text} strokeWidth={2} />
                </div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{v.name}</div>
                  <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 2 }}>{v.date}</div>
                </div>
                <span style={{ background: s.bg, color: s.fg, fontSize: 8, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{v.status}</span>
              </div>
            );
          })}
        </div>
      </div>
      <FloatingDock variant={variant} active={variant === 'tenant' ? 'visits' : 'profile'} />
    </div>
  );
}

/* ─────────────────── 41 — Rental Preferences (Tenant) ─────────────────── */

export function RentalPreferencesContent() {
  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="Preferences" showBack centerTitle rightText={{ label: 'Save', color: COLORS.brand }} />

      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '16px 16px 24px' }}>
        {/* Location */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Preferred location</div>
          <div className="flex items-center" style={{ marginTop: 8, height: 38, background: COLORS.input, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '0 12px', gap: 8 }}>
            <MapPin size={13} color={COLORS.text2} />
            <span className="flex-1" style={{ fontSize: 11, color: COLORS.text, fontWeight: 500 }}>Kathmandu, Lalitpur</span>
            <ChevronDown size={12} color={COLORS.text3} />
          </div>
          {/* Selected areas as chips */}
          <div className="flex flex-wrap" style={{ marginTop: 8, gap: 6 }}>
            {['Pulchowk', 'Patan', 'Baluwatar', 'Sanepa'].map((c) => (
              <div key={c} className="flex items-center" style={{ height: 24, padding: '0 10px', borderRadius: 999, background: COLORS.brandBg, color: COLORS.brand, fontSize: 9, fontWeight: 600, gap: 4 }}>
                {c}
                <span style={{ opacity: 0.6 }}>×</span>
              </div>
            ))}
            <div className="flex items-center" style={{ height: 24, padding: '0 10px', borderRadius: 999, border: `1px dashed ${COLORS.border}`, color: COLORS.text2, fontSize: 9, fontWeight: 500, gap: 3 }}>
              <Plus size={9} /> Add area
            </div>
          </div>
        </div>

        {/* Distance slider */}
        <div style={{ marginTop: 18 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Max distance</span>
            <span style={{ fontSize: 10, color: COLORS.text2 }}>5 km</span>
          </div>
          <div className="relative" style={{ marginTop: 10, height: 4, background: COLORS.divider, borderRadius: 999 }}>
            <div className="absolute" style={{ left: 0, width: '50%', height: 4, background: COLORS.text, borderRadius: 999 }} />
            <div className="absolute" style={{ left: 'calc(50% - 8px)', top: -7, width: 16, height: 16, borderRadius: 999, background: COLORS.text, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
          </div>
        </div>

        {/* Property type */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Looking for</div>
          <div className="flex flex-wrap" style={{ marginTop: 8, gap: 6 }}>
            {[
              { label: 'Room', active: true },
              { label: 'Apartment', active: true },
              { label: 'House', active: false },
              { label: 'Office', active: false },
            ].map((c) => (
              <div key={c.label} className="flex items-center justify-center" style={{ height: 26, padding: '0 11px', borderRadius: 999, background: c.active ? COLORS.text : COLORS.input, color: c.active ? '#FFFFFF' : COLORS.text2, fontSize: 10, fontWeight: 500 }}>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Budget range (monthly)</div>
          <div className="relative" style={{ marginTop: 10, height: 4, background: COLORS.divider, borderRadius: 999 }}>
            <div className="absolute" style={{ left: '10%', width: '50%', height: 4, background: COLORS.text, borderRadius: 999 }} />
            <div className="absolute" style={{ left: 'calc(10% - 8px)', top: -7, width: 16, height: 16, borderRadius: 999, background: COLORS.text, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
            <div className="absolute" style={{ left: 'calc(60% - 8px)', top: -7, width: 16, height: 16, borderRadius: 999, background: COLORS.text, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, color: COLORS.text2 }}>NPR 8,000</span>
            <span style={{ fontSize: 10, color: COLORS.text2 }}>NPR 28,000</span>
          </div>
        </div>

        {/* Bedrooms */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Bedrooms</div>
          <div className="flex flex-wrap" style={{ marginTop: 8, gap: 6 }}>
            {['Studio', '1', '2', '3', '4+'].map((c, i) => (
              <div key={c} className="flex items-center justify-center" style={{ height: 30, minWidth: 36, padding: '0 10px', borderRadius: 999, background: i === 1 ? COLORS.text : COLORS.input, color: i === 1 ? '#FFFFFF' : COLORS.text2, fontSize: 10, fontWeight: 500 }}>
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Must-have amenities</div>
          <div className="flex flex-wrap" style={{ marginTop: 8, gap: 6 }}>
            {[
              { label: 'Parking', active: true },
              { label: 'Furnished', active: false },
              { label: 'Water 24/7', active: true },
              { label: 'Inverter', active: false },
              { label: 'WiFi', active: true },
              { label: 'Balcony', active: false },
            ].map((c) => (
              <div key={c.label} className="flex items-center justify-center" style={{ height: 28, padding: '0 11px', borderRadius: 999, background: c.active ? COLORS.text : COLORS.input, color: c.active ? '#FFFFFF' : COLORS.text2, fontSize: 10, fontWeight: 500 }}>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center" style={{ marginTop: 20, height: 38, background: COLORS.text, color: '#FFFFFF', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
          Save Preferences
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 42 — KYC Upload (Tenant Optional) ─────────────────── */

export function KycUploadContent() {
  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="Verify Identity" showBack centerTitle />

      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 8, fontWeight: 600, color: COLORS.brand, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Optional · Build trust
        </div>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: COLORS.text, lineHeight: 1.15, marginTop: 8, letterSpacing: '-0.01em' }}>
          Get a verified
          <br />badge on your profile
        </div>
        <div style={{ fontSize: 10, color: COLORS.text2, marginTop: 8, lineHeight: 1.5 }}>
          Verified tenants get faster visit approvals and stand out to landlords. Takes about 2 minutes.
        </div>

        {/* Why verify */}
        <div style={{ marginTop: 16, background: COLORS.brandBg, borderRadius: 12, padding: 12 }}>
          {[
            { Icon: BadgeCheck, t: 'Verified badge on your profile' },
            { Icon: Check, t: 'Higher visit acceptance rate' },
            { Icon: Lock, t: 'Documents kept private, never shared' },
          ].map((r, i) => (
            <div key={i} className="flex items-center" style={{ gap: 8, marginTop: i === 0 ? 0 : 8 }}>
              <r.Icon size={12} color={COLORS.brand} strokeWidth={2.4} />
              <span style={{ fontSize: 10, color: COLORS.text }}>{r.t}</span>
            </div>
          ))}
        </div>

        {/* Document type */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Document Type</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Citizenship', sub: 'Front + back', active: true },
              { label: 'Driving License', sub: 'Both sides', active: false },
              { label: 'Passport', sub: 'Photo page', active: false },
            ].map((d) => (
              <div key={d.label} className="flex items-center" style={{ background: COLORS.bg, border: `1.5px solid ${d.active ? COLORS.text : COLORS.border}`, borderRadius: 12, padding: '10px 12px', gap: 10 }}>
                <FileText size={14} color={COLORS.text} strokeWidth={2} />
                <div className="flex-1">
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{d.label}</div>
                  <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 1 }}>{d.sub}</div>
                </div>
                <div className="flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: 999, background: d.active ? COLORS.text : 'transparent', border: d.active ? 'none' : `1.5px solid ${COLORS.border}` }}>
                  {d.active && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload slots */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Upload</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['Front side', 'Back side'].map((side) => (
              <div key={side} className="flex flex-col items-center justify-center" style={{ height: 100, background: COLORS.input, border: `1.5px dashed #CCCCCC`, borderRadius: 12, gap: 4 }}>
                <div className="flex items-center justify-center" style={{ width: 28, height: 28, background: COLORS.bg, borderRadius: 999 }}>
                  <Plus size={13} color={COLORS.text} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: COLORS.text }}>{side}</span>
                <span style={{ fontSize: 8, color: COLORS.text3 }}>Tap to upload</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selfie */}
        <div style={{ marginTop: 14 }}>
          <div className="flex items-center" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, gap: 10 }}>
            <div className="flex items-center justify-center" style={{ width: 36, height: 36, background: COLORS.input, borderRadius: 10 }}>
              <User size={15} color={COLORS.text} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Selfie verification</div>
              <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 1 }}>Take a quick photo</div>
            </div>
            <ChevronRight size={12} color={COLORS.text3} />
          </div>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start" style={{ marginTop: 14, gap: 6 }}>
          <Lock size={10} color={COLORS.text3} strokeWidth={2} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 9, color: COLORS.text3, lineHeight: 1.4 }}>
            Your documents are encrypted and reviewed by our team within 24 hours. Never shared with landlords.
          </span>
        </div>

        <div className="flex items-center justify-center" style={{ marginTop: 18, height: 38, background: COLORS.text, color: '#FFFFFF', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
          Submit for Verification
        </div>
        <div className="text-center" style={{ marginTop: 10, fontSize: 10, color: COLORS.text3, fontWeight: 500 }}>
          Skip for now
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 43 — AI Preferences ─────────────────── */

export function AiPreferencesContent() {
  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="AI Preferences" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '14px 16px 24px' }}>
        <div className="flex items-center justify-center" style={{ width: 48, height: 48, background: COLORS.brandBg, borderRadius: 14, margin: '0 auto' }}>
          <Sparkles size={22} color={COLORS.brand} strokeWidth={2.2} />
        </div>
        <div className="text-center" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: COLORS.text, marginTop: 12 }}>
          Smarter recommendations
        </div>
        <div className="text-center" style={{ fontSize: 10, color: COLORS.text2, marginTop: 6, lineHeight: 1.5, padding: '0 8px' }}>
          Let BasoBas learn what you like to surface better matches over time.
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel>Personalization</SectionLabel>
          <MenuCard>
            <MenuRow Icon={Sparkles} label="Personalized picks" sublabel="Based on your searches and visits" right={<Toggle on />} />
            <MenuRow Icon={Cpu} label="Learn from behavior" sublabel="Improve matches using your activity" right={<Toggle on />} />
            <MenuRow Icon={MapPin} label="Location-aware suggestions" sublabel="Use city and saved areas" right={<Toggle on />} divider={false} />
          </MenuCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionLabel>Discovery</SectionLabel>
          <MenuCard>
            <MenuRow Icon={Bell} label="Weekly new matches" sublabel="Email summary every Monday" right={<Toggle on={false} />} />
            <MenuRow Icon={Home} label="Similar to saved" sublabel="Recommend properties like ones you saved" right={<Toggle on />} divider={false} />
          </MenuCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionLabel>Data</SectionLabel>
          <MenuCard>
            <MenuRow Icon={Trash2} label="Reset AI learning" sublabel="Clear personalization data" />
            <MenuRow Icon={Shield} label="Privacy policy" right={<ExternalLink size={11} color={COLORS.text3} />} divider={false} />
          </MenuCard>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 44 — My Reviews (Tenant) ─────────────────── */

export function MyReviewsContent() {
  const reviews = [
    { landlord: 'Bikash Sharma', property: '2BHK · Pulchowk', rating: 5, date: 'May 2026', text: 'Great landlord! Very responsive and the property was exactly as listed.' },
    { landlord: 'Rita Maharjan', property: 'Studio · Kupondole', rating: 4, date: 'Apr 2026', text: 'Clean and well-maintained. Communication could have been quicker.' },
    { landlord: 'Suman Tamang', property: 'Room · Baluwatar', rating: 5, date: 'Mar 2026', text: 'Smooth visit and rental process. Highly recommended.' },
  ];
  return (
    <div className="h-full flex flex-col relative" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="My Reviews" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '14px 16px 80px' }}>
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: COLORS.text, lineHeight: 1 }}>4.7</div>
              <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 3 }}>out of 5</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center" style={{ gap: 2 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#F5A623" fill={i <= 4 ? '#F5A623' : 'transparent'} strokeWidth={1.5} />)}
              </div>
              <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 4 }}>3 reviews written</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{r.landlord}</div>
                  <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 1 }}>{r.property}</div>
                </div>
                <span style={{ fontSize: 9, color: COLORS.text3 }}>{r.date}</span>
              </div>
              <div className="flex items-center" style={{ gap: 2, marginTop: 6 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={11} color="#F5A623" fill={i <= r.rating ? '#F5A623' : 'transparent'} strokeWidth={1.5} />)}
              </div>
              <div style={{ fontSize: 10, color: COLORS.text2, lineHeight: 1.5, marginTop: 8 }}>{r.text}</div>
            </div>
          ))}
        </div>
      </div>
      <FloatingDock variant="tenant" active="profile" />
    </div>
  );
}

/* ─────────────────── 45 — Verification Status (Landlord) ─────────────────── */

export function VerificationStatusContent() {
  const steps = [
    { Icon: Phone, label: 'Phone Verified', sub: '+977 98XXXXX78', done: true },
    { Icon: User, label: 'Profile Complete', sub: 'Name, photo, city', done: true },
    { Icon: FileText, label: 'Citizenship Verified', sub: 'May 12, 2025', done: true },
    { Icon: Home, label: 'Property Documents', sub: 'Optional · Boosts trust', done: false },
  ];
  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="Verification" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '16px 16px 24px' }}>
        <div className="flex flex-col items-center" style={{ padding: '14px 0' }}>
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, background: COLORS.brandBg, borderRadius: 999 }}>
            <BadgeCheck size={30} color={COLORS.brand} strokeWidth={2.2} />
          </div>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: COLORS.text, marginTop: 10 }}>
            You're Verified
          </div>
          <div style={{ fontSize: 10, color: COLORS.text2, marginTop: 4 }}>3 of 4 steps complete</div>
          <div style={{ marginTop: 10, width: '100%', height: 5, background: COLORS.divider, borderRadius: 999 }}>
            <div style={{ width: '75%', height: 5, background: COLORS.brand, borderRadius: 999 }} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <SectionLabel>Verification Steps</SectionLabel>
          <MenuCard>
            {steps.map((s, i) => (
              <MenuRow
                key={s.label}
                Icon={s.Icon}
                label={s.label}
                sublabel={s.sub}
                right={
                  s.done ? (
                    <span style={{ background: COLORS.brandBg, color: COLORS.brand, fontSize: 8, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>Done</span>
                  ) : (
                    <span style={{ background: COLORS.text, color: '#FFFFFF', fontSize: 8, fontWeight: 600, padding: '3px 9px', borderRadius: 999 }}>Add</span>
                  )
                }
                divider={i < steps.length - 1}
              />
            ))}
          </MenuCard>
        </div>

        <div style={{ marginTop: 14, background: COLORS.input, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Why verify more?</div>
          <div style={{ fontSize: 10, color: COLORS.text2, marginTop: 4, lineHeight: 1.5 }}>
            Adding property documents helps tenants trust your listings and improves visit acceptance.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 46 — List Your Property (Become Landlord) ─────────────────── */

export function ListYourPropertyContent() {
  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg, fontFamily: 'DM Sans, sans-serif' }}>
      <DynamicIsland />
      <ScreenHeader title="List Property" showBack centerTitle />
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 8, fontWeight: 600, color: COLORS.brand, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Become a landlord
        </div>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: COLORS.text, lineHeight: 1.1, marginTop: 8 }}>
          Rent out your<br />property easily
        </div>
        <div style={{ fontSize: 10, color: COLORS.text2, marginTop: 8, lineHeight: 1.5 }}>
          Add your property in a few steps. We'll verify and connect you with serious tenants.
        </div>

        {/* Steps overview */}
        <div style={{ marginTop: 18 }}>
          {[
            { n: '1', t: 'Property details', s: 'Type, rooms, location, price' },
            { n: '2', t: 'Photos & description', s: 'Show what makes it special' },
            { n: '3', t: 'Verify ownership', s: 'Upload property documents' },
            { n: '4', t: 'Go live', s: 'Approved within 24 hours' },
          ].map((step) => (
            <div key={step.n} className="flex items-start" style={{ gap: 12, padding: '10px 0', borderBottom: `1px solid ${COLORS.rowDivider}` }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, background: COLORS.text, color: '#FFFFFF', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                {step.n}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{step.t}</div>
                <div style={{ fontSize: 9, color: COLORS.text3, marginTop: 2 }}>{step.s}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Property type quick pick */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Choose property type</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { Icon: Home, label: 'Room' },
              { Icon: Home, label: 'Apartment' },
              { Icon: Home, label: 'House' },
              { Icon: Home, label: 'Office' },
            ].map((p) => (
              <div key={p.label} className="flex flex-col items-center justify-center" style={{ height: 70, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, gap: 4 }}>
                <p.Icon size={18} color={COLORS.text} strokeWidth={1.8} />
                <span style={{ fontSize: 10, fontWeight: 500, color: COLORS.text }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center" style={{ marginTop: 18, height: 38, background: COLORS.text, color: '#FFFFFF', borderRadius: 999, fontSize: 12, fontWeight: 600, gap: 6 }}>
          Get Started <ChevronRight size={13} color="#FFFFFF" />
        </div>
      </div>
    </div>
  );
}
