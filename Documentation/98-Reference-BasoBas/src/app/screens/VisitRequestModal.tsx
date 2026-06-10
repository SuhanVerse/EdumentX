import { useState } from 'react';
import { X, Check, Calendar } from 'lucide-react';

const DAYS = [
  { day: 'Wed', date: '12' },
  { day: 'Thu', date: '13' },
  { day: 'Fri', date: '14' },
  { day: 'Sat', date: '15' },
  { day: 'Sun', date: '16' },
];
const TIMES = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:30 PM'];

export function VisitRequestModal({
  isOpen,
  onClose,
  propertyName,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  onConfirm: (date: string, time: string, message: string) => void;
}) {
  const [date, setDate] = useState('14');
  const [time, setTime] = useState('10:30 AM');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setSubmitted(true);
    onConfirm(date, time, message);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(15,17,20,0.45)' }}>
      <div
        className="w-full"
        style={{
          background: '#FAFAF8',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: '85%',
        }}
      >
        {submitted ? (
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <div
              className="flex items-center justify-center"
              style={{ width: 72, height: 72, borderRadius: 999, background: '#0F1114' }}
            >
              <Check size={32} strokeWidth={2.4} color="#FFFFFF" />
            </div>
            <h2 style={{ fontSize: 22, marginTop: 18 }}>Visit booked</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8, maxWidth: 280 }}>
              We've sent a confirmation to your inbox. The agent will reach out to confirm shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <div>
                <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>REQUEST A VISIT</div>
                <h2 style={{ fontSize: 20, marginTop: 4 }}>{propertyName}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: '#FFFFFF',
                  border: '1px solid #ECECE8',
                }}
              >
                <X size={18} strokeWidth={2.4} color="#0F1114" />
              </button>
            </div>

            <div className="px-6 pt-3">
              <div className="flex items-center gap-2" style={{ color: '#0F1114' }}>
                <Calendar size={15} strokeWidth={2.4} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Pick a day</span>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {DAYS.map((d) => {
                  const active = d.date === date;
                  return (
                    <button
                      key={d.date}
                      onClick={() => setDate(d.date)}
                      className="shrink-0 flex flex-col items-center justify-center"
                      style={{
                        width: 58,
                        height: 72,
                        borderRadius: 18,
                        background: active ? '#0F1114' : '#FFFFFF',
                        color: active ? '#FFFFFF' : '#0F1114',
                        border: active ? 'none' : '1px solid #ECECE8',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{d.day}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>
                        {d.date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pt-5">
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F1114' }}>Time</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {TIMES.map((t) => {
                  const active = t === time;
                  return (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      style={{
                        paddingInline: 14,
                        height: 38,
                        borderRadius: 999,
                        background: active ? '#0F1114' : '#FFFFFF',
                        color: active ? '#FFFFFF' : '#0F1114',
                        border: active ? 'none' : '1px solid #ECECE8',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pt-5">
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F1114' }}>Note (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything the agent should know?"
                rows={3}
                className="w-full mt-2 p-3 outline-none resize-none"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #ECECE8',
                  borderRadius: 16,
                  fontSize: 13,
                  color: '#0F1114',
                }}
              />
            </div>

            <div className="px-6 pt-4 pb-6">
              <button
                onClick={handleConfirm}
                className="w-full"
                style={{
                  height: 54,
                  background: '#0F1114',
                  color: '#FFFFFF',
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                Confirm visit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
