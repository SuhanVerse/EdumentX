export function DSChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        height: 38,
        paddingInline: 18,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? '#0A0A0A' : '#F5F5F5',
        color: active ? '#FFFFFF' : '#6B6B6B',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}
