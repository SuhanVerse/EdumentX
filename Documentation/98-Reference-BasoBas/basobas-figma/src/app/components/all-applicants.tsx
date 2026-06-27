import { User, CheckCircle2, ChevronRight } from 'lucide-react';
import { ScreenShell } from './screen-shell';

const applicants = [
  { id: 1, name: 'Sandeep Khatri', verified: true, jobs: 'Software Engineer', status: 'Accepted', color: '#1A6B4A' },
  { id: 2, name: 'Anita Gurung', verified: true, jobs: 'Designer', status: 'Pending', color: '#F5A623' },
  { id: 3, name: 'Rajan Maharjan', verified: false, jobs: 'Marketing Lead', status: 'Pending', color: '#F5A623' },
  { id: 4, name: 'Pooja Shrestha', verified: true, jobs: 'Doctor', status: 'Pending', color: '#F5A623' },
  { id: 5, name: 'Bipin Adhikari', verified: true, jobs: 'Teacher', status: 'Declined', color: '#E53E3E' },
];

interface AllApplicantsProps {
  onNavigate?: (screen: string) => void;
}

export function AllApplicants({ onNavigate }: AllApplicantsProps = {}) {
  return (
    <ScreenShell title="All Applicants" showBack>
      <div className="px-5 pt-4 pb-8">
        <div className="text-[12px] text-[#6B6B6B] mb-3">2BHK in Baluwatar · 8 applicants</div>

        <div className="space-y-3">
          {applicants.map((a) => (
            <button
              key={a.id}
              onClick={() => onNavigate?.('RequestDetail')}
              className="w-full text-left rounded-2xl border border-[#E8E8E8] p-3 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <User size={20} color="#6B6B6B" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <div className="text-[13px] font-semibold text-[#0A0A0A]">{a.name}</div>
                  {a.verified && <CheckCircle2 size={12} color="#1A6B4A" />}
                </div>
                <div className="text-[11px] text-[#AAAAAA] mt-0.5">{a.jobs}</div>
              </div>
              <div
                className="px-2 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: `${a.color}15`, color: a.color }}
              >
                {a.status}
              </div>
              <ChevronRight size={14} color="#CCCCCC" />
            </button>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
