import svgPaths from "./svg-eft19db9fc";

function Icon() {
  return (
    <div className="relative shrink-0 size-[17.998px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.998 17.998">
        <g id="Icon">
          <path d={svgPaths.p4306480} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d={svgPaths.p328cf280} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[#0a0a0a] relative rounded-[999px] shrink-0 size-[41.992px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[17.998px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.998 17.998">
        <g id="Icon">
          <path d={svgPaths.p38b0ba50} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d={svgPaths.p1dac02b0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
        </g>
      </svg>
    </div>
  );
}

function Container1() {
  return (
    <div className="relative rounded-[999px] shrink-0 size-[41.992px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[17.998px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.998 17.998">
        <g clipPath="url(#clip0_28_106)" id="Icon">
          <path d="M5.99933 1.49983V4.4995" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d="M11.9987 1.49983V4.4995" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d={svgPaths.p365fc880} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d="M2.24975 7.49917H15.7483" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
        </g>
        <defs>
          <clipPath id="clip0_28_106">
            <rect fill="white" height="17.998" width="17.998" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container2() {
  return (
    <div className="relative rounded-[999px] shrink-0 size-[41.992px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[17.998px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.998 17.998">
        <g id="Icon">
          <path d={svgPaths.p25791080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
          <path d={svgPaths.p1c517880} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.34985" />
        </g>
      </svg>
    </div>
  );
}

function Container3() {
  return (
    <div className="relative rounded-[999px] shrink-0 size-[41.992px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon3 />
      </div>
    </div>
  );
}

export default function Dock() {
  return (
    <div className="backdrop-blur-[7.5px] bg-[rgba(100,100,100,0.35)] content-stretch flex gap-[6px] items-center p-[7.625px] relative rounded-[999px] size-full" data-name="Dock">
      <div aria-hidden className="absolute border-[0.625px] border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Container />
      <Container1 />
      <Container2 />
      <Container3 />
    </div>
  );
}