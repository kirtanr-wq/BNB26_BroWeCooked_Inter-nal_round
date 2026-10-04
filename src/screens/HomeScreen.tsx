import React from 'react';
import { ScreenId } from '../types';
import { DriftWall, DriftWallItem } from '../components/DriftWall';
import CardSwap, { Card } from '../components/CardSwap';
import TechText from '../components/TechText';

const DRIFT_ITEMS: DriftWallItem[] = [
  { image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop', title: 'Studio Soundboard & Audio' },
  { image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600&auto=format&fit=crop', title: '4K Cinema Rig' },
  { image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=600&auto=format&fit=crop', title: 'Video Editing Suite' },
  { image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=600&auto=format&fit=crop', title: 'Creator Studio Mic' },
  { image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=600&auto=format&fit=crop', title: 'Podcasting Station' },
  { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop', title: 'AI Neural Processing' },
  { image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', title: 'Ambient Fluid Art' },
  { image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop', title: 'Audio Waveforms' },
  { image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop', title: 'Creative Collaboration' },
  { image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop', title: 'Cinematic Visuals' },
  { image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop', title: 'Code & Automation' },
  { image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop', title: 'Film Production' },
  { image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop', title: 'Stage Lighting & Focus' },
  { image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop', title: 'Retro Synthesizer Studio' },
  { image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600&auto=format&fit=crop', title: 'Generative AI Spectrum' },
];

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const scrollToFooter = () => {
    const footerElement = document.getElementById('footer-section');
    if (footerElement) {
      footerElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col justify-between selection:bg-[#dae2fd] selection:text-[#4f46e5] relative font-['Inter'] overflow-x-hidden">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute inset-0 bg-dot-pattern opacity-70"></div>
        {/* Soft atmospheric glow spheres */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-gradient-to-b from-[#4f46e5]/15 via-[#818cf8]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-[#c7c4d8]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#e2dfff]/40 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/75 border-b border-[#c7c4d8]/40 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <div 
            onClick={scrollToTop}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                token
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl tracking-tight text-[#131b2e] group-hover:text-[#3525cd] transition-colors">
                CREATOR <span className="text-[#4f46e5]">AI</span>
              </span>
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={scrollToFooter}
              className="hidden sm:inline-flex text-xs font-semibold text-[#464555] hover:text-[#131b2e] px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="text-xs sm:text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] px-3.5 py-2 rounded-lg hover:bg-indigo-50/80 transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* HERO SECTION WITH DRIFTWALL BACKGROUND */}
        <section className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center relative py-12 md:py-20 overflow-hidden">
          {/* DriftWall Component Background from React Bits */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
            <DriftWall
              items={DRIFT_ITEMS}
              columns={5}
              tileWidth={200}
              tileHeight={132}
              gap={18}
              tilt={16}
              turn={-14}
              perspective={1200}
              depth={120}
              speed={42}
              direction="up"
              variance={0.45}
              parallax={0.6}
              lift={64}
              fade={0.45}
              dim={0.82}
              overlayColor="#060010"
            />
          </div>

          {/* Soft atmospheric radial gradient overlay for text legibility and contrast */}
          <div 
            className="absolute inset-0 z-1 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(250, 248, 255, 0.62) 0%, rgba(250, 248, 255, 0.42) 48%, rgba(250, 248, 255, 0.82) 100%)'
            }}
          />

          {/* Foreground Hero Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-auto pointer-events-none pt-4 sm:pt-6">
            {/* Main Title: CREATOR AI with TechText Animation */}
            <h1 className="sr-only">CREATOR AI</h1>
            <div className="w-full h-[120px] sm:h-[160px] md:h-[190px] lg:h-[220px] relative pointer-events-auto mb-6 sm:mb-8 select-none flex items-center justify-center">
              <TechText
                text="CREATOR AI"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontWeight={800}
                fontSize={150}
                letterSpacing={-0.03}
                color="#131b2e"
                highlightText="AI"
                highlightColor="#4f46e5"
                accentColor="#4f46e5"
                reveal="letter"
                reach={220}
                softness={0.7}
                dashLength={4}
                dashGap={2}
                strokeWidth={1.8}
                specks={15}
                selection={true}
                labels={true}
                draggable={true}
                sweep={false}
              />
            </div>

            {/* The Inspiring Quote Section */}
            <div className="max-w-2xl mx-auto mb-10 px-4 pointer-events-auto">
              <div className="relative inline-block bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-[#c7c4d8]/50 shadow-sm">
                <span className="text-4xl sm:text-5xl text-[#4f46e5]/30 font-serif absolute -top-5 -left-4 sm:-left-6 select-none">
                  “
                </span>
                <p className="text-xl sm:text-2xl md:text-3xl font-light text-[#283044] italic tracking-tight leading-relaxed font-serif">
                  Creativity is intelligence having fun.
                </p>
                <span className="text-4xl sm:text-5xl text-[#4f46e5]/30 font-serif absolute -bottom-8 -right-4 sm:-right-6 select-none">
                  ”
                </span>
              </div>
              <p className="text-sm font-semibold tracking-wider uppercase text-[#4f46e5] mt-4">
                — Albert Einstein
              </p>
            </div>

            {/* Minimal Tagline / Subtitle */}
            <p className="max-w-xl mx-auto text-[#464555] text-sm sm:text-base leading-relaxed mb-10 font-normal">
              Turn raw ideas and long-form media into high-impact, multi-platform releases with next-generation artificial intelligence.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto pointer-events-auto">
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <span>Enter Studio &amp; Login</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <button
                onClick={scrollToFooter}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/95 backdrop-blur-md hover:bg-slate-100 text-[#131b2e] font-semibold text-sm border border-[#c7c4d8]/80 shadow-xs hover:border-[#777587] transition-all duration-200 cursor-pointer"
              >
                <span>Learn More</span>
                <span className="material-symbols-outlined text-base text-[#464555]">
                  south
                </span>
              </button>
            </div>
          </div>

          {/* Smooth Scroll Down Indicator */}
          <div 
            onClick={scrollToFooter}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer group select-none text-[#777587] hover:text-[#4f46e5] transition-colors z-10 pointer-events-auto"
          >
            <span className="text-[11px] font-medium tracking-widest uppercase">Scroll</span>
            <span className="material-symbols-outlined text-lg animate-bounce group-hover:text-[#4f46e5]">
              keyboard_arrow_down
            </span>
          </div>
        </section>

        {/* WORKFLOW SECTION WITH CARDSWAP COMPONENT */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-[#c7c4d8]/40 overflow-hidden">
          {/* Two-Column Layout: Left Side (Title & Description) | Right Side (Fast 3D CardSwap) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Heading, Subtitle & Interactive Details */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left">
              {/* Main Headline */}
              <h2 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#131b2e] tracking-tight leading-[1.12] mb-5">
                Create once.{' '}
                <span className="bg-gradient-to-r from-[#3525cd] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
                  Inspire everywhere.
                </span>
              </h2>

              {/* Description Paragraph */}
              <p className="text-sm sm:text-base text-[#464555] leading-relaxed mb-8 max-w-lg font-normal">
                From raw footage to viral release in 3 autonomous steps. Hover over the cards to pause the live swap animation.
              </p>

              {/* Action buttons */}
              <div>
                <button
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <span>Launch Studio</span>
                  <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: CardSwap Component Container */}
            <div className="lg:col-span-7 relative h-[500px] sm:h-[540px] w-full flex items-center justify-center overflow-visible">
              <div style={{ height: '520px', width: '100%', position: 'relative' }}>
                <CardSwap
                  cardDistance={60}
                  verticalDistance={70}
                  delay={2200}
                  pauseOnHover={true}
                  width={460}
                  height={340}
                  skewAmount={6}
                  easing="elastic"
                >
                  {/* Card 1: 01. Upload & Transcribe */}
                  <Card className="p-6 sm:p-7 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-white border border-indigo-500/40 shadow-2xl flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 font-mono text-[11px] font-bold tracking-wider">
                          STEP 01 // INGESTION
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm">
                          <span className="material-symbols-outlined text-2xl">upload_file</span>
                        </div>
                      </div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl sm:text-2xl text-white tracking-tight mb-2">
                        01. Upload &amp; Transcribe
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light mb-4">
                        Ingest any long-form video or audio file. Automatically extract word-level transcripts and speaker stamps.
                      </p>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
                            <span className="material-symbols-outlined text-sm">mic</span>
                            Neural Audio Transcription
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">99.2% Accuracy</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 w-4/5 rounded-full"></div>
                        </div>
                        <p className="text-[11px] text-slate-400 italic truncate">
                          "The AI extracts speaker timestamps and key moments automatically..."
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Lossless 4K Raw Support</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-1">
                        Auto Timestamped <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </span>
                    </div>
                  </Card>

                  {/* Card 2: 02. Intelligent Repurposing */}
                  <Card className="p-6 sm:p-7 bg-gradient-to-br from-[#1e1136] via-[#2e1065] to-[#170a2c] text-white border border-purple-500/40 shadow-2xl flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="px-3 py-1 rounded-full bg-purple-500/25 border border-purple-400/40 text-purple-300 font-mono text-[11px] font-bold tracking-wider">
                          STEP 02 // SYNTHESIS
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-sm">
                          <span className="material-symbols-outlined text-2xl">auto_fix_high</span>
                        </div>
                      </div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl sm:text-2xl text-white tracking-tight mb-2">
                        02. Intelligent Repurposing
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light mb-4">
                        Let AI detect high-retention moments, craft viral hooks, and format vertical video for TikTok, Shorts, and Reels.
                      </p>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            Viral Score Predictor
                          </span>
                          <span className="font-mono text-purple-300 font-bold bg-purple-500/30 px-2 py-0.5 rounded-md">94 / 100 🚀</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="font-medium">3-Second Hook Retention Projected: 82%</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic truncate">
                          Hook: "Stop editing for hours. Here is how AI repurposes 1 video into 10 clips."
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>9:16 Social Safe-Zones</span>
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        Dynamic Subtitles <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </span>
                    </div>
                  </Card>

                  {/* Card 3: 03. Export & Distribute */}
                  <Card className="p-6 sm:p-7 bg-gradient-to-br from-[#062419] via-[#064e3b] to-[#041c14] text-white border border-emerald-500/40 shadow-2xl flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-mono text-[11px] font-bold tracking-wider">
                          STEP 03 // RELEASE
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-sm">
                          <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                        </div>
                      </div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl sm:text-2xl text-white tracking-tight mb-2">
                        03. Export &amp; Distribute
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light mb-4">
                        Render ultra crisp 4K cuts, animated captions, and platform-specific summaries in one unified dashboard.
                      </p>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Multi-Platform Render Queue
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">100% Ready</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200">YouTube Shorts</span>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200">IG Reels</span>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200">TikTok 4K</span>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200">X Thread</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Direct Platform Export</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        1-Click Publish <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </span>
                    </div>
                  </Card>
                </CardSwap>
              </div>
            </div>
          </div>

          {/* Quick CTA to Jump to Login */}
          <div className="mt-16 text-center bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 border border-[#c7c4d8]/50 rounded-2xl p-8 sm:p-10">
            <h3 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-bold text-[#131b2e] mb-2">
              Ready to unlock your creative intelligence?
            </h3>
            <p className="text-xs sm:text-sm text-[#464555] max-w-lg mx-auto mb-6">
              Sign in to your Creator AI studio and access your personalized projects and AI tools.
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Log In to Dashboard</span>
              <span className="material-symbols-outlined text-base">login</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER SECTION */}
      <footer id="footer-section" className="relative z-10 w-full bg-white border-t border-[#c7c4d8]/60 py-12 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 pb-8 border-b border-[#c7c4d8]/40">
            {/* Logo and Brand description */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm">
              <div 
                onClick={scrollToTop}
                className="flex items-center gap-2.5 cursor-pointer mb-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center justify-center text-white shadow-xs group-hover:bg-[#3525cd] transition-colors">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    token
                  </span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#131b2e] tracking-tight">
                  CREATOR <span className="text-[#4f46e5]">AI</span>
                </span>
              </div>
              <p className="text-xs text-[#464555] leading-relaxed">
                The all-in-one AI content studio for creators, editors, and modern digital storytellers.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#006c49]"></span>
                <span className="text-[11px] font-medium text-[#131b2e]">All systems operational</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-8 sm:gap-12 text-xs">
              <div className="flex flex-col gap-2.5 items-center md:items-start">
                <span className="font-bold text-[#131b2e] tracking-wider uppercase text-[10px]">Product</span>
                <button onClick={() => onNavigate('login')} className="text-[#464555] hover:text-[#4f46e5] transition-colors cursor-pointer">
                  Studio Dashboard
                </button>
                <button onClick={() => onNavigate('login')} className="text-[#464555] hover:text-[#4f46e5] transition-colors cursor-pointer">
                  AI Repurposing
                </button>
                <button onClick={() => onNavigate('login')} className="text-[#464555] hover:text-[#4f46e5] transition-colors cursor-pointer">
                  Hook Generator
                </button>
              </div>

              <div className="flex flex-col gap-2.5 items-center md:items-start">
                <span className="font-bold text-[#131b2e] tracking-wider uppercase text-[10px]">Access</span>
                <button onClick={() => onNavigate('login')} className="text-[#4f46e5] font-semibold hover:underline cursor-pointer">
                  Sign In / Log In
                </button>
                <a href="#about" onClick={(e) => { e.preventDefault(); scrollToTop(); }} className="text-[#464555] hover:text-[#4f46e5] transition-colors">
                  Back to Hero
                </a>
              </div>

              <div className="flex flex-col gap-2.5 items-center md:items-start">
                <span className="font-bold text-[#131b2e] tracking-wider uppercase text-[10px]">Legal</span>
                <span className="text-[#464555] hover:text-[#131b2e] cursor-pointer">Privacy Policy</span>
                <span className="text-[#464555] hover:text-[#131b2e] cursor-pointer">Terms of Service</span>
                <span className="text-[#464555] hover:text-[#131b2e] cursor-pointer">Security</span>
              </div>
            </div>

            {/* Back to top button */}
            <div className="flex flex-col items-center md:items-end">
              <button
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#131b2e] text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Back to Top</span>
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
              </button>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#777587]">
            <p>© 2025 CREATOR AI Inc. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Crafted for high-performing creators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
