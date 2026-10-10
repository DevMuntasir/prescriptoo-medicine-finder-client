'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { JourneyExperience } from './location-visuals';
import { ArrowRight, ArrowUpRight, ChevronDown, Footprints, LocateFixed, MapPin, Navigation, QrCode, Search, ShieldCheck, Smartphone } from 'lucide-react';

const journeys = [
  { icon: Search, en: 'Find your medicine', bn: 'ওষুধটি খুঁজুন', body: 'Start with a medicine name, generic name or the QR card from your doctor.', bodyBn: 'ওষুধ বা জেনেরিক নাম দিয়ে শুরু করুন, অথবা ডাক্তারের দেওয়া QR কার্ড স্ক্যান করুন।' },
  { icon: LocateFixed, en: 'Choose your starting point', bn: 'শুরুর অবস্থান ঠিক করুন', body: 'Use your location or select a point manually. Confirm it before finding nearby pharmacies.', bodyBn: 'নিজের লোকেশন ব্যবহার করুন বা নিজেই পিন বসান। কাছের ফার্মেসি খোঁজার আগে অবস্থান নিশ্চিত করুন।' },
  { icon: Navigation, en: 'Go straight to the entrance', bn: 'সরাসরি প্রবেশপথে পৌঁছান', body: 'Choose a listed pharmacy and request directions to its entrance. Walking is the default.', bodyBn: 'তালিকা থেকে ফার্মেসি বেছে নিয়ে প্রবেশপথের দিকনির্দেশনা নিন। শুরুতেই হাঁটার পথ নির্বাচন করা থাকে।' },
];

export function LandingSections({ bn, locale }: { bn: boolean; locale: string }) {
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    root.current.querySelectorAll('[data-reveal]').forEach((element) => { element.classList.add('reveal-ready'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);
  const faqs = [
    [bn ? 'তালিকায় থাকা মানেই কি ওষুধ মজুত আছে?' : 'Does a listed pharmacy guarantee stock?', bn ? 'না। তালিকাটি ওষুধের সঙ্গে যুক্ত ফার্মেসি দেখায়। যাওয়ার আগে ফোন নম্বর থাকলে যোগাযোগ করে মজুত নিশ্চিত করুন।' : 'No. Results show pharmacies associated with the medicine. Where a phone number is provided, call ahead to confirm stock before travelling.'],
    [bn ? 'লোকেশন অনুমতি না দিলেও কি খুঁজতে পারব?' : 'Can I search without sharing my location?', bn ? 'হ্যাঁ। লোকেশন ছাড়াই ওষুধ খুঁজতে পারবেন। কাছের ফার্মেসি ও পথের জন্য নিজে শুরুর অবস্থান নির্বাচন ও নিশ্চিত করতে পারবেন।' : 'Yes. Browse medicines without location access. To find nearby pharmacies and directions, manually select and confirm your starting point.'],
    [bn ? 'QR কার্ড কীভাবে ব্যবহার করব?' : 'How do I use a QR card?', bn ? 'ফোনের ক্যামেরা দিয়ে কার্ডের QR কোড স্ক্যান করুন এবং দেখানো লিংক খুলুন। তারপর অবস্থান নিশ্চিত করে ফার্মেসি বেছে নিন।' : 'Point your phone camera at the QR code on your card and open the link. Then confirm your starting point and choose a pharmacy.'],
    [bn ? 'মানচিত্র লোড না হলে কী করব?' : 'What if the map does not load?', bn ? 'ফার্মেসির তালিকা ও ঠিকানা দেখতে পারবেন। পথনির্দেশনা পাওয়া না গেলে আবার চেষ্টা করুন; অনুমান করা পথ বা সময় দেখানো হয় না।' : 'The pharmacy list and addresses remain available. Retry if directions are unavailable; we do not substitute an estimated route or journey time.'],
  ];
  return <div className="landing-story" ref={root}>
    <div className="location-benefits" data-reveal>{[
      [MapPin, bn ? 'সঠিক প্রবেশপথ' : 'The right entrance'], [Footprints, bn ? 'হাঁটার পথ দিয়ে শুরু' : 'Walking comes first'], [Smartphone, bn ? 'বাংলা ও English' : 'Bangla & English'],
    ].map(([Icon, label], index) => { const BenefitIcon = Icon as typeof MapPin; return <div key={index}><BenefitIcon size={19} /><span>{label as string}</span></div>; })}</div>

    <section className="journey-section" id="how-it-works" aria-labelledby="journey-heading" data-reveal>
      <div className="story-heading"><h2 id="journey-heading">{bn ? <>খুঁজুন। নিশ্চিত করুন।<br /><em>পথে এগিয়ে যান।</em></> : <>Find it. Pin it.<br /><em>Make your way.</em></>}</h2><p>{bn ? 'কোথা থেকে শুরু করবেন, কোথায় যাবেন—প্রতিটি ধাপে পরিষ্কার নির্দেশনা।' : 'Less uncertainty about where to start. More clarity about where to go.'}</p></div>
      <div className="journey-workspace"><div className="journey-options" aria-label={bn ? 'যাত্রার ধাপ' : 'Journey steps'}>{journeys.map((item, index) => <button type="button" className="journey-option" aria-pressed={step === index} aria-controls="journey-illustration" onClick={() => setStep(index)} key={item.en}><span className="journey-number">0{index + 1}</span><span><strong>{bn ? item.bn : item.en}</strong><span>{bn ? item.bodyBn : item.body}</span></span><item.icon size={21} /></button>)}</div><div id="journey-illustration"><JourneyExperience bn={bn} step={step} /></div></div>
    </section>

    <section className="location-bento" aria-label={bn ? 'আপনার সুবিধার জন্য' : 'Designed around your journey'}>
      <article className="qr-story" id="qr-guide" data-reveal><div><h2>{bn ? <>স্ক্যান করুন।<br />পথ খুঁজে নিন।</> : <>Scan the card.<br />Find your next stop.</>}</h2><p>{bn ? 'ফোনের ক্যামেরায় ডাক্তারের দেওয়া QR কার্ড স্ক্যান করেই ওষুধের পেজে পৌঁছান। আলাদা অ্যাপ ছাড়াই।' : 'Open your phone camera, scan the QR card from your doctor and go directly to the medicine page. No app installation needed.'}</p><a href="#medicines" className="story-link">{bn ? 'অথবা ওষুধের নাম দিয়ে খুঁজুন' : 'Or explore medicines by name'}<ArrowUpRight size={18} /></a></div><div className="qr-card-art" aria-hidden="true"><span className="qr-card-brand"><MapPin size={16} /> MEDICINE LOCATOR</span><QrCode size={106} strokeWidth={1.4} /><span className="qr-scan-beam" /><strong>{bn ? 'এখান থেকেই পথচলা' : 'Your journey starts here'}</strong><small>{bn ? 'কার্ডের ধারণাচিত্র' : 'Illustrative card'}</small></div></article>
      <article className="privacy-story" data-reveal><div className="privacy-orbit" aria-hidden="true"><ShieldCheck size={38} /></div><h2>{bn ? 'নিয়ন্ত্রণ থাকুক আপনার হাতে।' : 'You choose what to share.'}</h2><p>{bn ? 'কাছের ফার্মেসি খুঁজতে অবস্থান ব্যবহার করুন অথবা নিজেই পিন বসান। বিশ্লেষণের জন্য সুনির্দিষ্ট অবস্থান সংরক্ষণে আলাদা সম্মতি প্রয়োজন।' : 'Use your location or set your own starting pin. Saving precise location samples for analytics requires separate, optional consent.'}</p><Link href={`/${locale}/privacy`} className="story-link">{bn ? 'গোপনীয়তা সম্পর্কে জানুন' : 'Explore your privacy choices'}<ArrowUpRight size={18} /></Link></article>
    </section>

    <section className="landing-faq" aria-labelledby="faq-heading" data-reveal><div className="story-heading"><h2 id="faq-heading">{bn ? <>কিছু প্রশ্ন,<br /><em>সহজ উত্তর।</em></> : <>A few questions.<br /><em>Clear answers.</em></>}</h2></div><div className="faq-items">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div></section>

    <section className="location-final" data-reveal><div className="final-pin" aria-hidden="true"><MapPin size={34} /></div><h2>{bn ? 'ওষুধটি খুঁজুন। পথটা চিনে নিন।' : 'Find your medicine. Find your way.'}</h2><p>{bn ? 'প্রথমে ওষুধটি বেছে নিন। তারপর আপনার কাছের ফার্মেসি খুঁজুন।' : 'Start with the medicine you need. Then explore pharmacies near your starting point.'}</p><a href="#medicines" className="story-primary">{bn ? 'ওষুধের তালিকা দেখুন' : 'Explore medicines'}<ArrowRight size={18} /></a></section>
  </div>;
}
