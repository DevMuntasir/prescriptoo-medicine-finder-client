'use client';

import { ArrowRight, Check, Footprints, LocateFixed, MapPin, Navigation, Pill, Search, Store } from 'lucide-react';

function Building({ x, y, w, d, h }: { x: number; y: number; w: number; d: number; h: number }) {
  return <g>
    <path d={`M${x} ${y}l${w} ${w / 2} ${-d} ${d / 2} ${-w} ${-w / 2}Z`} fill="#1c375630" transform="translate(0 5)" />
    <path d={`M${x} ${y - h}l${w} ${w / 2}v${h}l${-w} ${-w / 2}Z`} fill="#d4dbe3" />
    <path d={`M${x + w} ${y + w / 2 - h}l${-d} ${d / 2}v${h}l${d} ${-d / 2}Z`} fill="#aebccb" />
    <path d={`M${x} ${y - h}l${w} ${w / 2} ${-d} ${d / 2} ${-w} ${-w / 2}Z`} fill="#f4f7fb" stroke="#ffffff" strokeWidth="1.5" />
    <path d={`M${x + w - 7} ${y + w / 2 - h + 9}l${-d + 14} ${(d - 14) / 2}`} stroke="#6292cb" strokeWidth="3" />
  </g>;
}

export function LocationIllustration({ bn }: { bn: boolean }) {
  return <div className="atlas-hero">
    <div className="atlas-orbit orbit-one" /><div className="atlas-orbit orbit-two" />
    <div className="atlas-coordinate" aria-hidden="true"></div>
    <svg className="atlas-city" viewBox="0 0 560 480" fill="none" aria-hidden="true">
      <ellipse cx="280" cy="395" rx="220" ry="45" fill="#1b3450" opacity=".06" />
      <path d="M30 235L270 105L530 235V253L290 388L30 253Z" fill="#95a7bc" />
      <path d="M30 235L270 105L530 235L290 370Z" fill="#dfe5eb" stroke="#f4f7fa" strokeWidth="3" />
      <path d="M270 105L530 235L290 370V388L530 253V235" fill="#3e77b8" opacity=".24" />
      <g stroke="#f7f9fc" strokeWidth="20">
        <path d="M88 204L351 336M163 163L426 295M344 142L107 275M435 187L199 323" />
      </g>
      <g stroke="#b3c0ce" strokeWidth="1" strokeDasharray="3 5">
        <path d="M88 204L351 336M163 163L426 295M344 142L107 275M435 187L199 323" />
      </g>
      <path d="M354 261l52-29 56 28-52 30Z" fill="#acbfd4" />
      <path d="M78 236l34-18 40 21-33 19Z" fill="#acbfd4" />
      <Building x={247} y={160} w={41} d={37} h={40} />
      <Building x={299} y={187} w={28} d={36} h={24} />
      <Building x={174} y={203} w={43} d={34} h={32} />
      <Building x={228} y={228} w={24} d={33} h={21} />
      <Building x={370} y={218} w={43} d={35} h={47} />
      <Building x={432} y={243} w={27} d={25} h={24} />
      <Building x={160} y={284} w={40} d={32} h={27} />
      <Building x={276} y={310} w={40} d={36} h={28} />
      <g fill="#578bc7"><ellipse cx="378" cy="264" rx="9" ry="5" fill="#407bbf55" /><path d="M378 264v-17" stroke="#396fac" strokeWidth="3" /><ellipse cx="378" cy="246" rx="10" ry="15" /><path d="M407 275v-18" stroke="#396fac" strokeWidth="3" /><ellipse cx="407" cy="256" rx="11" ry="16" /></g>
      <path d="M219 313L275 282Q287 276 275 270L245 254Q234 248 246 242L326 198" stroke="white" strokeWidth="13" strokeLinecap="round" />
      <path className="atlas-route" pathLength="100" d="M219 313L275 282Q287 276 275 270L245 254Q234 248 246 242L326 198" stroke="#d8272d" strokeWidth="5" strokeLinecap="round" />
      <ellipse className="atlas-origin-ring" cx="219" cy="313" rx="21" ry="11" stroke="#d8272d" opacity=".3" />
      <ellipse cx="219" cy="313" rx="10" ry="6" fill="#d8272d" stroke="white" strokeWidth="3" />
      <ellipse cx="326" cy="198" rx="24" ry="12" fill="#d8272d" opacity=".13" />
      <g className="atlas-pin"><path d="M326 198s-27-34-27-51a27 27 0 1 1 54 0c0 17-27 51-27 51Z" fill="#d8272d" /><circle cx="326" cy="147" r="17" fill="#fffaf3" /><path d="M326 137v20m-10-10h20" stroke="#d8272d" strokeWidth="6" strokeLinecap="round" /></g>
    </svg>
    
    <div className="atlas-bottom"></div>
  </div>;
}

export function JourneyExperience({ bn, step }: { bn: boolean; step: number }) {
  return <div className={`journey-demo demo-stage-${step}`}>
    <div className="demo-topline"><small>0{step + 1} / 03</small></div>
    <div className="demo-canvas">
      <div className="demo-contour contour-one" /><div className="demo-contour contour-two" /><div className="demo-contour contour-three" />
      <div className="demo-side-label" aria-hidden="true">MEDICINE → LOCATION → DESTINATION</div>
      <div className="demo-phone">
        <div className="demo-phone-top"><span>9:41</span><span className="demo-island" /><span>•••</span></div>
        <div className="demo-phone-brand"><span><MapPin size={15} /></span>Medicine locator</div>
        <div key={step} className="demo-screen">
          {step === 0 ? <>
            <h3>{bn ? 'কোন ওষুধটি খুঁজছেন?' : 'What do you need to find?'}</h3>
            <div className="demo-search"><Search size={15} /><span>{bn ? 'ওষুধের নাম…' : 'Medicine name…'}</span><span className="demo-cursor" /></div>
            <div className="demo-medicine"><div className="demo-capsule-art"><span /><i /><i /></div><strong>{bn ? 'এখান থেকেই শুরু' : 'The starting point.'}</strong><p>{bn ? 'নাম ও বিবরণ মিলিয়ে নিন' : 'Review the name and details'}</p></div>
            <div className="demo-action">{bn ? 'ফার্মেসি খুঁজুন' : 'Find pharmacies'}<ArrowRight size={15} /></div>
          </> : step === 1 ? <>
            <h3>{bn ? 'পথচলা শুরু কোথায়?' : 'Where are you starting?'}</h3>
            <div className="demo-mini-map"><div className="demo-crosshair"><LocateFixed size={30} /></div><span className="demo-map-chip">{bn ? 'পিন ঠিক করুন' : 'Adjust your pin'}</span></div>
            <div className="demo-origin-option"><LocateFixed size={18} /><span>{bn ? 'আমার অবস্থান ব্যবহার করুন' : 'Use my location'}</span></div><p className="demo-hint">{bn ? 'অথবা নিজেই শুরুর পিন বসান' : 'Or choose a starting pin manually'}</p><div className="demo-action">{bn ? 'অবস্থান নিশ্চিত করুন' : 'Confirm starting point'}<Check size={15} /></div>
          </> : <>
            <h3>{bn ? 'সোজা প্রবেশপথে।' : 'Right to the entrance.'}</h3>
            <div className="demo-mini-map route-map"><svg viewBox="0 0 220 140" fill="none"><path d="M35 110V70H153V30" stroke="white" strokeWidth="12" strokeLinejoin="round" /><path className="demo-route-path" d="M35 110V70H153V30" stroke="#244f81" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="35" cy="110" r="6" fill="#244f81" stroke="white" strokeWidth="3" /></svg><MapPin className="demo-destination" size={30} fill="#d8272d" color="#fff" /></div>
            <div className="demo-origin-option"><Store size={20} /><span>{bn ? 'নির্বাচিত ফার্মেসি' : 'Your chosen pharmacy'}</span></div><p className="demo-hint"><Footprints size={12} />{bn ? 'হাঁটার পথ' : 'Walking selected'}</p><div className="demo-action">{bn ? 'দিকনির্দেশনা দেখুন' : 'Get directions'}<Navigation size={15} /></div>
          </>}
        </div>
      </div>
      <div className="demo-note" key={`note-${step}`}><span>{step === 0 ? <Pill size={21} /> : step === 1 ? <LocateFixed size={21} /> : <Footprints size={21} />}</span><div><strong>{step === 0 ? (bn ? 'খুঁজুন নাম দিয়ে' : 'Search. Select. Continue.') : step === 1 ? (bn ? 'আগে নিশ্চিত করুন' : 'Your starting point. Confirmed.') : (bn ? 'গন্তব্য হোক স্পষ্ট' : 'A destination, not a guess.')}</strong></div></div>
    </div>
    <div className="demo-footer"><span>{bn ? 'ইন্টারফেসের ধারণাচিত্র' : 'Illustrative interface'}</span><div>{[0, 1, 2].map(i => <span key={i} className={i === step ? 'active' : ''} />)}</div><span>{bn ? 'বাস্তব ফলাফল নয়' : 'Not live results'}</span></div>
  </div>;
}
