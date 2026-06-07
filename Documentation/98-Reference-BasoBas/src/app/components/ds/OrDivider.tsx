export function DSOrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: '#ABABAB',
        }}
      >
        or
      </span>
      <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
    </div>
  );
}
