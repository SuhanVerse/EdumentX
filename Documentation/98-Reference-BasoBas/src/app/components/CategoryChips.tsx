const CATEGORIES = ['Home', 'Hotel', 'Apartment', 'Office', 'Villa'];

export function CategoryChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-6">
      {CATEGORIES.map((c) => {
        const on = c === active;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="shrink-0 transition-all"
            style={{
              height: 40,
              paddingInline: 20,
              borderRadius: 999,
              background: on ? '#0F1114' : '#FFFFFF',
              color: on ? '#FFFFFF' : '#0F1114',
              border: on ? '1px solid #0F1114' : '1px solid #ECECE8',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
