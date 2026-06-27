import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface ScreenShellProps {
  title?: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function ScreenShell({ title, showBack, rightSlot, children, contentClassName = '' }: ScreenShellProps) {
  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ width: '390px', height: '844px', fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Header */}
      {title && (
        <div
          className="h-[56px] w-full bg-white flex items-center justify-between px-5"
          style={{ borderBottom: '1px solid #E8E8E8' }}
        >
          <div className="flex items-center gap-2">
            {showBack && (
              <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F5F5F5]">
                <ChevronLeft size={20} color="#0A0A0A" />
              </button>
            )}
            <div className="text-[17px] font-semibold text-[#0A0A0A]">{title}</div>
          </div>
          {rightSlot}
        </div>
      )}

      <div className={`overflow-y-auto ${contentClassName}`} style={{ height: title ? 'calc(844px - 56px)' : '844px' }}>
        {children}
      </div>
    </div>
  );
}
