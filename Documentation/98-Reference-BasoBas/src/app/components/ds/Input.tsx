type State = 'default' | 'focused' | 'error' | 'filled';

const BORDERS: Record<State, string> = {
  default: '1.5px solid #E8E8E8',
  focused: '1.5px solid #0A0A0A',
  error: '1.5px solid #E53E3E',
  filled: '1.5px solid #E8E8E8',
};

export function DSInput({
  label,
  state = 'default',
  value,
  placeholder = 'Type something…',
  helper,
}: {
  label: string;
  state?: State;
  value?: string;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          color: '#6B6B6B',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 56,
          background: '#F5F5F5',
          border: BORDERS[state],
          borderRadius: 14,
          paddingInline: 16,
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          color: value ? '#0A0A0A' : '#ABABAB',
        }}
      >
        {value || placeholder}
      </div>
      {helper && (
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: state === 'error' ? '#E53E3E' : '#ABABAB',
            marginTop: 6,
          }}
        >
          {helper}
        </div>
      )}
    </div>
  );
}
