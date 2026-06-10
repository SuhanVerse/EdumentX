import { Signal, Wifi, BatteryFull } from 'lucide-react';

export function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? '#FFFFFF' : '#0F1114';
  return (
    <div
      className="flex items-center justify-between px-7 pt-3"
      style={{ height: 44, color, fontFamily: 'var(--font-sans)' }}
    >
      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal size={15} strokeWidth={2.5} />
        <Wifi size={15} strokeWidth={2.5} />
        <BatteryFull size={18} strokeWidth={2} />
      </div>
    </div>
  );
}
