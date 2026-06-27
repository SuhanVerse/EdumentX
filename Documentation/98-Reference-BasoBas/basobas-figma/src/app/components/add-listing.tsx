import { X, Home, Building2, Hotel, Bed, Upload, Camera, Check, Minus, Plus } from 'lucide-react';
import { ScreenShell } from './screen-shell';
import { useListing, PropertyType, typeLabels } from './listing-store';

interface StepProps {
  onNavigate?: (screen: string) => void;
}

function StepHeader({ step, total }: { step: number; total: number }) {
  return (
    <div className="px-5 pt-2 pb-4">
      <div className="text-[11px] text-[#AAAAAA] mb-2">Step {step} of {total}</div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ background: i < step ? '#0A0A0A' : '#E8E8E8' }}
          />
        ))}
      </div>
    </div>
  );
}

function CloseHeader({ onNavigate }: StepProps) {
  return (
    <button
      onClick={() => onNavigate?.('MyProperties')}
      className="absolute top-[10px] right-5 w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center z-10"
    >
      <X size={16} color="#0A0A0A" />
    </button>
  );
}

/* ───── Step 1: Type ─────────────────────────────────────── */

export function AddListingStep1({ onNavigate }: StepProps = {}) {
  const { draft, update } = useListing();
  const types: { id: PropertyType; icon: typeof Home; desc: string }[] = [
    { id: 'apartment', icon: Home, desc: 'Flat in a building' },
    { id: 'house', icon: Building2, desc: 'Standalone house' },
    { id: 'room', icon: Hotel, desc: 'Single room to rent' },
    { id: 'studio', icon: Bed, desc: 'Open layout flat' },
  ];

  return (
    <ScreenShell title="New Listing" showBack>
      <CloseHeader onNavigate={onNavigate} />
      <StepHeader step={1} total={4} />
      <div className="px-5 pb-8">
        <div className="text-[22px] font-semibold text-[#0A0A0A] leading-tight font-['DM_Serif_Display',serif]">
          What type of property?
        </div>
        <div className="text-[12px] text-[#6B6B6B] mt-1">
          Step 2 will adapt to your choice.
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {types.map((t) => {
            const Icon = t.icon;
            const active = draft.type === t.id;
            return (
              <button
                key={t.id}
                onClick={() => update('type', t.id)}
                className="rounded-2xl p-4 text-left"
                style={{
                  border: active ? '2px solid #0A0A0A' : '1px solid #E8E8E8',
                  background: active ? '#0A0A0A' : '#FFFFFF',
                }}
              >
                <Icon size={24} color={active ? '#FFFFFF' : '#0A0A0A'} />
                <div
                  className="mt-3 text-[14px] font-semibold"
                  style={{ color: active ? '#FFFFFF' : '#0A0A0A' }}
                >
                  {typeLabels[t.id]}
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: active ? 'rgba(255,255,255,0.6)' : '#AAAAAA' }}
                >
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onNavigate?.('AddListingStep2')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-8"
        >
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

/* ───── Step 2: Type-specific details ────────────────────── */

export function AddListingStep2({ onNavigate }: StepProps = {}) {
  const { draft, update } = useListing();
  const t = draft.type;

  return (
    <ScreenShell title="New Listing" showBack>
      <CloseHeader onNavigate={onNavigate} />
      <StepHeader step={2} total={4} />
      <div className="px-5 pb-8">
        <div className="flex items-center gap-2">
          <div className="text-[22px] font-semibold text-[#0A0A0A] leading-tight font-['DM_Serif_Display',serif]">
            About your {typeLabels[t].toLowerCase()}
          </div>
        </div>
        <div className="text-[12px] text-[#6B6B6B] mt-1">
          Fields tailored to a {typeLabels[t].toLowerCase()}.
        </div>

        {/* Common header */}
        <div className="mt-5 space-y-3">
          <Field label="Listing title">
            <TextValue value={draft.title} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly rent (NPR)">
              <TextValue value={draft.rent} />
            </Field>
            <Field label="Deposit (NPR)">
              <TextValue value={draft.deposit} />
            </Field>
          </div>
          <Field label="Location">
            <TextValue value={draft.location} />
          </Field>
          <Field label="Available from">
            <TextValue value={draft.availableFrom} />
          </Field>
        </div>

        {/* Type-specific */}
        {t === 'apartment' && <ApartmentFields />}
        {t === 'house' && <HouseFields />}
        {t === 'room' && <RoomFields />}
        {t === 'studio' && <StudioFields />}

        {/* Amenities — shared */}
        <div className="mt-5">
          <div className="text-[11px] text-[#6B6B6B] mb-1.5">Amenities</div>
          <div className="flex flex-wrap gap-2">
            {amenityOptions(t).map((a) => {
              const on = draft.amenities.includes(a);
              return (
                <button
                  key={a}
                  onClick={() =>
                    update(
                      'amenities',
                      on ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a],
                    )
                  }
                  className="px-3 py-1.5 rounded-full text-[11px]"
                  style={{
                    background: on ? '#0A0A0A' : '#F5F5F5',
                    color: on ? '#FFFFFF' : '#6B6B6B',
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => onNavigate?.('AddListingStep3')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-6"
        >
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

function ApartmentFields() {
  const { draft, update } = useListing();
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Bedrooms">
          <Counter value={draft.bedrooms} onChange={(v) => update('bedrooms', v)} min={1} max={6} />
        </Field>
        <Field label="Bathrooms">
          <Counter value={draft.bathrooms} onChange={(v) => update('bathrooms', v)} min={1} max={5} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Field label="Area (sqft)">
          <TextValue value={draft.sqft} />
        </Field>
        <Field label="Floor">
          <TextValue value={draft.floor} />
        </Field>
        <Field label="Total floors">
          <TextValue value={draft.totalFloors} />
        </Field>
      </div>
      <FurnishedPicker />
    </>
  );
}

function HouseFields() {
  const { draft, update } = useListing();
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Bedrooms">
          <Counter value={draft.bedrooms} onChange={(v) => update('bedrooms', v)} min={1} max={10} />
        </Field>
        <Field label="Bathrooms">
          <Counter value={draft.bathrooms} onChange={(v) => update('bathrooms', v)} min={1} max={8} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="Built-up area (sqft)">
          <TextValue value={draft.sqft} />
        </Field>
        <Field label="Floors in house">
          <TextValue value={draft.totalFloors} />
        </Field>
      </div>
      <Field label="Parking spaces" wrapClass="mt-3">
        <Counter value={draft.parkingSpaces} onChange={(v) => update('parkingSpaces', v)} min={0} max={6} />
      </Field>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Toggle
          label="Private garden / yard"
          on={draft.garden}
          onChange={(v) => update('garden', v)}
        />
        <Toggle
          label="Gated compound"
          on={draft.compound}
          onChange={(v) => update('compound', v)}
        />
      </div>
      <FurnishedPicker />
    </>
  );
}

function RoomFields() {
  const { draft, update } = useListing();
  return (
    <>
      <Field label="Bathroom" wrapClass="mt-5">
        <SegPicker
          value={draft.bathroomType}
          options={['Attached', 'Common']}
          onChange={(v) => update('bathroomType', v as typeof draft.bathroomType)}
        />
      </Field>
      <Field label="Kitchen access" wrapClass="mt-3">
        <SegPicker
          value={draft.kitchenAccess}
          options={['Private', 'Shared', 'Not included']}
          onChange={(v) => update('kitchenAccess', v as typeof draft.kitchenAccess)}
        />
      </Field>
      <Field label="Tenant preference" wrapClass="mt-3">
        <SegPicker
          value={draft.genderPref}
          options={['Any', 'Male', 'Female', 'Family', 'Students']}
          onChange={(v) => update('genderPref', v as typeof draft.genderPref)}
        />
      </Field>
      <FurnishedPicker />
    </>
  );
}

function StudioFields() {
  const { draft, update } = useListing();
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Area (sqft)">
          <TextValue value={draft.sqft} />
        </Field>
        <Field label="Floor">
          <TextValue value={draft.floor} />
        </Field>
      </div>
      <Field label="Kitchenette" wrapClass="mt-3">
        <SegPicker
          value={draft.kitchenette}
          options={['Open', 'Closed', 'None']}
          onChange={(v) => update('kitchenette', v as typeof draft.kitchenette)}
        />
      </Field>
      <Field label="Bathroom" wrapClass="mt-3">
        <SegPicker
          value={draft.bathroomType}
          options={['Attached', 'Common']}
          onChange={(v) => update('bathroomType', v as typeof draft.bathroomType)}
        />
      </Field>
      <FurnishedPicker />
    </>
  );
}

function FurnishedPicker() {
  const { draft, update } = useListing();
  return (
    <Field label="Furnishing" wrapClass="mt-3">
      <SegPicker
        value={draft.furnished}
        options={['Furnished', 'Semi-furnished', 'Unfurnished']}
        onChange={(v) => update('furnished', v as typeof draft.furnished)}
      />
    </Field>
  );
}

function amenityOptions(t: PropertyType): string[] {
  const common = ['Parking', 'Water Tank', 'Backup Power', 'Internet ready'];
  if (t === 'apartment') return [...common, 'Elevator', 'Balcony', 'Security'];
  if (t === 'house') return [...common, 'Solar', 'Servant Room', 'Rooftop'];
  if (t === 'room') return ['Wi-Fi', 'Laundry', 'Hot Water', 'Cleaning', 'Study Desk'];
  return [...common, 'Murphy bed', 'Balcony'];
}

/* ───── Step 3 ────────────────────────────────────────── */

export function AddListingStep3({ onNavigate }: StepProps = {}) {
  return (
    <ScreenShell title="New Listing" showBack>
      <CloseHeader onNavigate={onNavigate} />
      <StepHeader step={3} total={4} />
      <div className="px-5 pb-8">
        <div className="text-[22px] font-semibold text-[#0A0A0A] leading-tight font-['DM_Serif_Display',serif]">
          Add photos
        </div>
        <div className="text-[12px] text-[#6B6B6B] mt-1">
          Listings with 5+ photos get 3× more requests.
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="aspect-square rounded-xl bg-[#F0EDE8] relative">
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#0A0A0A] text-white text-[9px] font-semibold">
              Cover
            </div>
          </div>
          <div className="aspect-square rounded-xl bg-[#F0EDE8]" />
          <div className="aspect-square rounded-xl bg-[#F0EDE8]" />
          <div className="aspect-square rounded-xl bg-[#F0EDE8]" />
          <div className="aspect-square rounded-xl border-2 border-dashed border-[#E8E8E8] flex flex-col items-center justify-center">
            <Camera size={20} color="#AAAAAA" />
            <div className="text-[9px] text-[#AAAAAA] mt-1">Add</div>
          </div>
        </div>

        <button className="w-full h-12 rounded-xl border border-[#E8E8E8] mt-4 flex items-center justify-center gap-2 text-[13px] text-[#0A0A0A]">
          <Upload size={16} />
          Upload from gallery
        </button>

        <button
          onClick={() => onNavigate?.('AddListingStep4')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-6"
        >
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

/* ───── Step 4: review ────────────────────────────────── */

export function AddListingStep4({ onNavigate }: StepProps = {}) {
  const { draft } = useListing();
  const t = draft.type;

  const rows: { label: string; value: string }[] = [
    { label: 'Property type', value: typeLabels[t] },
    { label: 'Monthly rent', value: `NPR ${draft.rent}` },
    { label: 'Deposit', value: `NPR ${draft.deposit}` },
    { label: 'Location', value: draft.location },
    { label: 'Available from', value: draft.availableFrom },
    { label: 'Furnishing', value: draft.furnished },
  ];

  if (t === 'apartment') {
    rows.push(
      { label: 'Bedrooms', value: String(draft.bedrooms) },
      { label: 'Bathrooms', value: String(draft.bathrooms) },
      { label: 'Area', value: `${draft.sqft} sqft` },
      { label: 'Floor', value: `${draft.floor} / ${draft.totalFloors}` },
    );
  } else if (t === 'house') {
    rows.push(
      { label: 'Bedrooms', value: String(draft.bedrooms) },
      { label: 'Bathrooms', value: String(draft.bathrooms) },
      { label: 'Built-up area', value: `${draft.sqft} sqft` },
      { label: 'Floors', value: draft.totalFloors },
      { label: 'Parking', value: `${draft.parkingSpaces} space(s)` },
      { label: 'Garden', value: draft.garden ? 'Yes' : 'No' },
      { label: 'Compound', value: draft.compound ? 'Gated' : 'Open' },
    );
  } else if (t === 'room') {
    rows.push(
      { label: 'Bathroom', value: draft.bathroomType },
      { label: 'Kitchen', value: draft.kitchenAccess },
      { label: 'Preference', value: draft.genderPref },
    );
  } else if (t === 'studio') {
    rows.push(
      { label: 'Area', value: `${draft.sqft} sqft` },
      { label: 'Floor', value: draft.floor },
      { label: 'Kitchenette', value: draft.kitchenette },
      { label: 'Bathroom', value: draft.bathroomType },
    );
  }

  rows.push({ label: 'Amenities', value: `${draft.amenities.length} selected` });

  return (
    <ScreenShell title="New Listing" showBack>
      <CloseHeader onNavigate={onNavigate} />
      <StepHeader step={4} total={4} />
      <div className="px-5 pb-8">
        <div className="text-[22px] font-semibold text-[#0A0A0A] leading-tight font-['DM_Serif_Display',serif]">
          Review & publish
        </div>
        <div className="text-[12px] text-[#6B6B6B] mt-1">Make sure everything looks right.</div>

        <div className="mt-5 rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <div className="h-[140px] bg-[#F0EDE8]" />
          <div className="p-3">
            <div className="text-[14px] font-semibold text-[#0A0A0A]">{draft.title}</div>
            <div className="text-[11px] text-[#AAAAAA] mt-0.5">{draft.location}</div>
            <div className="text-[13px] font-semibold text-[#1A6B4A] mt-2">
              NPR {draft.rent}/month
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-center py-2 border-b border-[#F0F0F0]"
            >
              <div className="text-[12px] text-[#6B6B6B]">{row.label}</div>
              <div className="flex items-center gap-2">
                <div className="text-[12px] text-[#0A0A0A]">{row.value}</div>
                <Check size={14} color="#1A6B4A" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onNavigate?.('MyProperties')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-6"
        >
          Publish Listing
        </button>
        <button
          onClick={() => onNavigate?.('MyProperties')}
          className="w-full h-11 text-[12px] text-[#6B6B6B] mt-2"
        >
          Save as Draft
        </button>
      </div>
    </ScreenShell>
  );
}

/* ───── tiny atoms ───────────────────────────────────── */

function Field({ label, children, wrapClass = '' }: { label: string; children: React.ReactNode; wrapClass?: string }) {
  return (
    <div className={wrapClass}>
      <div className="text-[11px] text-[#6B6B6B] mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function TextValue({ value }: { value: string }) {
  return (
    <div className="h-12 rounded-xl border border-[#E8E8E8] px-3 flex items-center text-[13px] text-[#0A0A0A]">
      {value}
    </div>
  );
}

function Counter({
  value,
  onChange,
  min,
  max,
}: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="h-12 rounded-xl border border-[#E8E8E8] px-2 flex items-center justify-between">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
      >
        <Minus size={14} color="#0A0A0A" />
      </button>
      <div className="text-[14px] font-semibold text-[#0A0A0A]">{value}</div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
      >
        <Plus size={14} color="#0A0A0A" />
      </button>
    </div>
  );
}

function SegPicker({
  value,
  options,
  onChange,
}: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="px-3 h-9 rounded-full text-[12px]"
            style={{
              background: on ? '#0A0A0A' : '#F5F5F5',
              color: on ? '#FFFFFF' : '#0A0A0A',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full h-12 rounded-xl border border-[#E8E8E8] px-3 flex items-center justify-between"
    >
      <div className="text-[12px] text-[#0A0A0A] text-left">{label}</div>
      <div
        className="w-9 h-[22px] rounded-full p-0.5 transition-colors"
        style={{ background: on ? '#1A6B4A' : '#E8E8E8' }}
      >
        <div
          className="w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
          style={{ transform: on ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </div>
    </button>
  );
}
