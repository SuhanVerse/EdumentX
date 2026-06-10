import { ReactNode } from 'react';

type Variant = 'primary' | 'brand' | 'disabled' | 'ghost' | 'outlined';

const STYLES: Record<Variant, React.CSSProperties> = {
  primary: { background: '#0A0A0A', color: '#FFFFFF', border: 'none' },
  brand: { background: '#1A6B4A', color: '#FFFFFF', border: 'none' },
  disabled: { background: '#E8E8E8', color: '#ABABAB', border: 'none', cursor: 'not-allowed' },
  ghost: { background: 'transparent', color: '#0A0A0A', border: 'none' },
  outlined: { background: 'transparent', color: '#0A0A0A', border: '1.5px solid #0A0A0A' },
};

export function DSButton({
  variant = 'primary',
  children,
  fullWidth = true,
}: {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const isGhost = variant === 'ghost';
  return (
    <button
      disabled={variant === 'disabled'}
      style={{
        height: 56,
        width: fullWidth ? '100%' : 'auto',
        paddingInline: 24,
        borderRadius: 999,
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 16,
        fontWeight: isGhost ? 500 : 600,
        letterSpacing: '-0.01em',
        ...STYLES[variant],
      }}
    >
      {children}
    </button>
  );
}
