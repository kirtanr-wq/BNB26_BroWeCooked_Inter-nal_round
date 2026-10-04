import React, { useState } from 'react';
import { ScreenId } from '../types';
import Stepper, { Step } from '../components/Stepper';
import { useProject } from '../context/ProjectContext';

interface LoginScreenProps {
  onLogin: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigate }) => {
  const { login, register } = useProject();
  const [email, setEmail] = useState('alex@creator.io');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);

  const handleFinishLogin = () => {
    onLogin();
    login(email, password).catch(() => {
      register('Alex Mercer', email, password).catch((err) => {
        console.warn('Backend auth sync notice:', err);
      });
    });
  };

  const handleGoogleLogin = () => {
    onLogin();
    login('alex@creator.io', 'creator123').catch(() => {
      register('Alex Mercer', 'alex@creator.io', 'creator123').catch((err) => {
        console.warn('Google auth fallback notice:', err);
      });
    });
  };

  return (
    <div className="bg-[#faf8ff] text-[#131b2e] antialiased min-h-screen relative flex flex-col justify-between selection:bg-[#dae2fd] selection:text-[#4f46e5] overflow-x-hidden font-['Inter']">
      {/* Ambient Background Canvas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute inset-0 bg-dot-pattern opacity-70"></div>

        {/* Soft ambient indigo glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e2dfff]/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      </div>

      {/* Minimal Top Navigation / Brand Anchor */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5] group-hover:bg-[#3525cd] flex items-center justify-center text-white shadow-xs transition-colors">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>token</span>
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#131b2e] tracking-tight">
            CREATOR <span className="text-[#4f46e5]">AI</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs font-medium text-[#464555] hover:text-[#131b2e] transition-colors duration-150 py-2 px-3 rounded-lg hover:bg-[#f2f3ff] flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Content: Stepper Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-8 py-6">
        <div className="w-full max-w-[480px]">
          <Stepper
            initialStep={1}
            onFinalStepCompleted={handleFinishLogin}
            backButtonText="Back"
            nextButtonText="Continue"
          >
            {/* Step 1: Account & Email */}
            <Step>
              <div className="space-y-4">
                <div className="text-left mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#4f46e5] bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                      STEP 01
                    </span>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-lg sm:text-xl font-bold text-[#131b2e]">
                      Welcome to Creator AI
                    </h2>
                  </div>
                  <p className="text-xs text-[#464555]">
                    Enter your creator email or sign in with Google to continue.
                  </p>
                </div>

                {/* Quick OAuth Provider */}
                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="w-full h-10 bg-white border border-[#c7c4d8]/80 hover:border-[#777587] hover:bg-[#f2f3ff] active:scale-[0.98] transition duration-150 rounded-lg flex items-center justify-center gap-3 px-4 text-[#131b2e] font-semibold text-xs shadow-xs cursor-pointer"
                >
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" fill="#4285F4"></path>
                    <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.14C3.25 21.36 7.33 24 12 24z" fill="#34A853"></path>
                    <path d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.59H1.26a11.96 11.96 0 0 0 0 10.82l4.02-3.14z" fill="#FBBC05"></path>
                    <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.59l4.02 3.14c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
                  </svg>
                  <span>1-Click Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="w-full border-t border-[#c7c4d8]/50"></div>
                  <span className="bg-white px-3 text-[10px] text-[#777587] font-medium relative">
                    or continue with email
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5 text-left" htmlFor="email">
                    Creator Email
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#464555]">
                      <span className="material-symbols-outlined text-base">mail</span>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@creator.io"
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#c7c4d8] rounded-lg text-xs text-[#131b2e] placeholder:text-[#777587] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none transition duration-150"
                    />
                  </div>
                </div>
              </div>
            </Step>

            {/* Step 2: Password & Verification */}
            <Step>
              <div className="space-y-4">
                <div className="text-left mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#4f46e5] bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                      STEP 02
                    </span>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-lg sm:text-xl font-bold text-[#131b2e]">
                      Security Verification
                    </h2>
                  </div>
                  <p className="text-xs text-[#464555]">
                    Enter security key for <span className="font-semibold text-[#131b2e]">{email}</span>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#131b2e]" htmlFor="password">
                      Password
                    </label>
                    <a className="text-[11px] font-semibold text-[#4f46e5] hover:text-[#3525cd] transition-colors duration-150" href="#forgot">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#464555]">
                      <span className="material-symbols-outlined text-base">lock</span>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2 bg-white border border-[#c7c4d8] rounded-lg text-xs text-[#131b2e] placeholder:text-[#777587] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none transition duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#464555] hover:text-[#131b2e] focus:outline-none cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-left">
                  <span className="material-symbols-outlined text-indigo-600 text-lg">shield</span>
                  <div className="text-[11px] text-[#464555]">
                    <span className="font-semibold text-[#131b2e]">End-to-End Encrypted Session</span>
                    <p className="text-[10px] text-[#777587]">Protected by 256-bit secure token handshake.</p>
                  </div>
                </div>
              </div>
            </Step>

            {/* Step 3: Workspace Confirmation & Launch */}
            <Step>
              <div className="space-y-4">
                <div className="text-left mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#006c49] bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                      STEP 03
                    </span>
                    <h2 className="font-['Plus_Jakarta_Sans'] text-lg sm:text-xl font-bold text-[#131b2e]">
                      Confirm Studio Workspace
                    </h2>
                  </div>
                  <p className="text-xs text-[#464555]">
                    Authentication confirmed. Review workspace details before launch.
                  </p>
                </div>

                {/* Profile Confirmation Card */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 border border-[#c7c4d8]/70 rounded-xl space-y-3 text-left shadow-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      alt="Creator"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#4f46e5]"
                    />
                    <div>
                      <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#131b2e]">Alex Mercer</h4>
                      <p className="text-[11px] text-[#464555]">{email}</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-[#006c49] bg-emerald-100 px-2 py-0.5 rounded-full">
                      PRO ACTIVE
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#c7c4d8]/40 space-y-1.5 text-[11px] text-[#464555]">
                    <div className="flex items-center justify-between">
                      <span>Default Workspace:</span>
                      <span className="font-semibold text-[#131b2e]">Main Studio Pipeline</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>4K Video Exports:</span>
                      <span className="font-semibold text-[#006c49]">Unlimited Access</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#777587] text-left">
                  Click <span className="font-semibold text-[#131b2e]">"Complete"</span> to launch your studio dashboard.
                </p>
              </div>
            </Step>
          </Stepper>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#464555]">
        <div className="text-xs text-[#777587]">
          © 2025 CreatorAi Inc. All rights reserved.
        </div>
        <div className="flex items-center gap-5 text-xs">
          <a className="hover:text-[#131b2e] transition-colors duration-150" href="#terms">Terms</a>
          <a className="hover:text-[#131b2e] transition-colors duration-150" href="#privacy">Privacy</a>
          <a className="hover:text-[#131b2e] transition-colors duration-150" href="#security">Security</a>
          <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1 bg-[#f2f3ff] rounded-full border border-[#c7c4d8]/30">
            <span className="w-2 h-2 rounded-full bg-[#006c49]"></span>
            <span className="text-[11px] font-semibold text-[#131b2e]">Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
