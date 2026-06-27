import { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { LandlordDashboard } from './components/landlord-dashboard';
import { MyProperties } from './components/my-properties';
import { PropertyDetail } from './components/property-detail';
import { AddListingStep1, AddListingStep2, AddListingStep3, AddListingStep4 } from './components/add-listing';
import { VisitRequests } from './components/visit-requests';
import { RequestDetail } from './components/request-detail';
import { AllApplicants } from './components/all-applicants';
import { Alerts } from './components/alerts';
import { ShareDetails } from './components/share-details';
import { DetailsShared } from './components/details-shared';
import { Reschedule, RescheduleSent } from './components/reschedule';
import { RequestDeclined } from './components/request-declined';
import { ListingProvider } from './components/listing-store';

type ScreenStatus = 'Done' | 'In Progress' | 'Not Started' | 'Locked';

interface Screen {
  id: number;
  name: string;
  status: ScreenStatus;
  phase: string;
  phaseNumber: number;
}

const phases = [
  { number: 1, name: 'Landlord Listings', color: '#F5A623', dotColor: '#F5A623' },
];

const allScreens: Screen[] = [
  { id: 1, name: 'Landlord Dashboard', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 2, name: 'My Properties', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 3, name: 'Property Detail', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 4, name: 'Add Listing — Step 1', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 5, name: 'Add Listing — Step 2', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 6, name: 'Add Listing — Step 3', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 7, name: 'Add Listing — Step 4', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 8, name: 'Visit Requests', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 9, name: 'Request Detail', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 10, name: 'Share Details', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 11, name: 'Details Shared', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 12, name: 'All Applicants', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 13, name: 'Alerts', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 14, name: 'Reschedule', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 15, name: 'Reschedule Sent', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
  { id: 16, name: 'Request Declined', status: 'Done', phase: 'Landlord Listings', phaseNumber: 1 },
];

const nameToId: Record<string, number> = {
  Dashboard: 1,
  MyProperties: 2,
  PropertyDetail: 3,
  AddListingStep1: 4,
  AddListingStep2: 5,
  AddListingStep3: 6,
  AddListingStep4: 7,
  VisitRequests: 8,
  RequestDetail: 9,
  ShareDetails: 10,
  DetailsShared: 11,
  AllApplicants: 12,
  Alerts: 13,
  Reschedule: 14,
  RescheduleSent: 15,
  RequestDeclined: 16,
};

function renderScreen(id: number, onNavigate: (screen: string) => void) {
  switch (id) {
    case 1: return <LandlordDashboard onNavigate={onNavigate} />;
    case 2: return <MyProperties onNavigate={onNavigate} />;
    case 3: return <PropertyDetail onNavigate={onNavigate} />;
    case 4: return <AddListingStep1 onNavigate={onNavigate} />;
    case 5: return <AddListingStep2 onNavigate={onNavigate} />;
    case 6: return <AddListingStep3 onNavigate={onNavigate} />;
    case 7: return <AddListingStep4 onNavigate={onNavigate} />;
    case 8: return <VisitRequests onNavigate={onNavigate} />;
    case 9: return <RequestDetail onNavigate={onNavigate} />;
    case 10: return <ShareDetails onNavigate={onNavigate} />;
    case 11: return <DetailsShared />;
    case 12: return <AllApplicants onNavigate={onNavigate} />;
    case 13: return <Alerts onNavigate={onNavigate} />;
    case 14: return <Reschedule onNavigate={onNavigate} />;
    case 15: return <RescheduleSent onNavigate={onNavigate} />;
    case 16: return <RequestDeclined onNavigate={onNavigate} />;
    default: return null;
  }
}

export default function App() {
  const [selectedScreenId, setSelectedScreenId] = useState(1);

  const selectedScreen = allScreens.find(s => s.id === selectedScreenId) || allScreens[0];
  const doneCount = allScreens.filter(s => s.status === 'Done').length;
  const remainingCount = allScreens.length - doneCount;
  const progressPercent = (doneCount / allScreens.length) * 100;

  const handlePrevious = () => {
    if (selectedScreenId > 1) {
      setSelectedScreenId(selectedScreenId - 1);
    }
  };

  const handleNext = () => {
    if (selectedScreenId < allScreens.length) {
      setSelectedScreenId(selectedScreenId + 1);
    }
  };

  const getStatusDotColor = (status: ScreenStatus) => {
    switch (status) {
      case 'Done': return '#1A6B4A';
      case 'In Progress': return '#F5A623';
      case 'Not Started': return '#E8E8E8';
      case 'Locked': return 'transparent';
    }
  };

  return (
    <ListingProvider>
    <div className="w-[1440px] h-[900px] bg-[#F4F4F0] flex" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Left Sidebar */}
      <div className="w-[320px] h-full bg-white border-r border-[#E8E8E8] flex flex-col">
        {/* Header */}
        <div className="h-[64px] px-5 flex items-center justify-between border-b border-[#E8E8E8]">
          <div>
            <div className="font-['DM_Serif_Display',serif] text-[18px] text-[#0A0A0A]">
              BasoBas
            </div>
            <div className="text-[11px] text-[#AAAAAA] mt-1">
              Screen Manager · {allScreens.length} screens
            </div>
          </div>
          <div className="bg-[#F0F0F0] rounded-full px-[10px] py-1 text-[11px] text-[#AAAAAA]">
            v1.0
          </div>
        </div>

        {/* Scrollable Screen List */}
        <div className="flex-1 overflow-y-auto p-3">
          {phases.map((phase) => {
            const phaseScreens = allScreens.filter(s => s.phaseNumber === phase.number);
            return (
              <div key={phase.number} className={phase.number > 1 ? 'mt-4' : ''}>
                {/* Phase Label */}
                <div className="h-7 px-2 flex items-center gap-2 mb-1">
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: phase.dotColor }}
                  />
                  <div className="text-[10px] text-[#AAAAAA] uppercase tracking-[1.2px] font-semibold">
                    Phase {phase.number} — {phase.name}
                  </div>
                </div>

                {/* Screen Items */}
                {phaseScreens.map((screen) => (
                  <button
                    key={screen.id}
                    onClick={() => setSelectedScreenId(screen.id)}
                    className={`w-full h-11 rounded-lg px-[10px] mb-0.5 flex items-center gap-[10px] transition-colors ${
                      selectedScreenId === screen.id
                        ? 'bg-[#0A0A0A]'
                        : 'bg-transparent hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {/* Number Badge */}
                    <div
                      className="w-7 h-[22px] rounded-md flex items-center justify-center text-[11px] font-semibold"
                      style={{
                        backgroundColor: selectedScreenId === screen.id ? '#1A1A1A' : '#F5F5F5',
                        color: selectedScreenId === screen.id ? '#FFFFFF' : '#AAAAAA'
                      }}
                    >
                      {screen.id.toString().padStart(2, '0')}
                    </div>

                    {/* Screen Name */}
                    <div
                      className="flex-1 text-left text-[13px] truncate"
                      style={{ color: selectedScreenId === screen.id ? '#FFFFFF' : '#333333' }}
                    >
                      {screen.name}
                    </div>

                    {/* Status Dot or Lock Icon */}
                    {screen.status === 'Locked' ? (
                      <Lock size={10} color="#DDDDDD" />
                    ) : (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: selectedScreenId === screen.id
                            ? 'white'
                            : getStatusDotColor(screen.status)
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="h-14 px-5 border-t border-[#E8E8E8] bg-white flex items-center justify-between">
          <div className="text-[12px] text-[#AAAAAA]">
            {doneCount} done  ·  {remainingCount} remaining
          </div>
          <div className="w-20 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A6B4A] rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-[52px] bg-white border-b border-[#E8E8E8] px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[#AAAAAA]">{selectedScreen.phase}</span>
            <span className="text-[#DDDDDD]">/</span>
            <span className="font-semibold text-[#0A0A0A]">{selectedScreen.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#AAAAAA]">390 × 844</span>
            <span className="text-[12px] text-[#AAAAAA]">iPhone 14</span>
            <div className="bg-[#F0F0F0] rounded-md px-2 py-[3px] text-[11px] text-[#888888] font-semibold">
              {selectedScreen.id.toString().padStart(2, '0')} / {allScreens.length.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Main Stage Area */}
        <div className="flex-1 bg-[#F4F4F0] flex items-center justify-center relative">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrevious}
            disabled={selectedScreenId === 1}
            className="absolute left-20 w-9 h-9 bg-white border border-[#E8E8E8] rounded-full flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} color="#444444" />
          </button>

          <button
            onClick={handleNext}
            disabled={selectedScreenId === allScreens.length}
            className="absolute right-20 w-9 h-9 bg-white border border-[#E8E8E8] rounded-full flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} color="#444444" />
          </button>

          {/* Center Content */}
          <div className="flex flex-col items-center">
            {/* iPhone Frame */}
            <div
              className="relative rounded-[50px] border-2 border-[#2C2C2E]"
              style={{
                width: '290px',
                height: '592px',
                backgroundColor: '#1C1C1E'
              }}
            >
              {/* Side Buttons (decorative) */}
              <div className="absolute left-[-3px] top-[168px] w-[3px] h-14 bg-[#2A2A2C] rounded-sm" />
              <div className="absolute right-[-3px] top-[188px] w-[3px] h-[68px] bg-[#2A2A2C] rounded-sm" />

              {/* Screen Inside Frame */}
              <div className="absolute inset-[10px] bg-white rounded-[42px] overflow-hidden">
                <div
                  style={{
                    width: '390px',
                    height: '844px',
                    transform: 'scale(0.6777)',
                    transformOrigin: 'top left',
                  }}
                >
                  {renderScreen(selectedScreen.id, (name) => {
                    const id = nameToId[name];
                    if (id) setSelectedScreenId(id);
                  })}
                </div>
              </div>
            </div>

            {/* Screen Label Below iPhone */}
            <div className="mt-5 text-center">
              <div className="text-[13px] text-[#888888]">
                {selectedScreen.id.toString().padStart(2, '0')} — {selectedScreen.name}
              </div>
              <div className="mt-1.5 text-[11px] text-[#BBBBBB]">
                {selectedScreen.phase}  ·  Phase {selectedScreen.phaseNumber}
              </div>
            </div>

            {/* Phase Tabs */}
            <div className="mt-7 flex items-center gap-[5px]">
              {phases.map((phase) => (
                <div
                  key={phase.number}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: selectedScreen.phaseNumber === phase.number ? '52px' : '28px',
                    backgroundColor: selectedScreen.phaseNumber === phase.number
                      ? '#0A0A0A'
                      : '#E8E8E8'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ListingProvider>
  );
}
