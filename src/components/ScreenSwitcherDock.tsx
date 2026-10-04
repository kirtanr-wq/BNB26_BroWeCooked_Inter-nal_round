import React, { useState } from 'react';
import { ScreenId } from '../types';

interface ScreenSwitcherDockProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const ScreenSwitcherDock: React.FC<ScreenSwitcherDockProps> = ({ currentScreen, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const screens: { id: ScreenId; label: string; number: number; tag: string }[] = [
    { id: 'home', label: 'Hero Home Page', number: 1, tag: 'Hero' },
    { id: 'login', label: 'Login / Sign In', number: 2, tag: 'Auth' },
    { id: 'dashboard', label: 'Dashboard / Home', number: 3, tag: 'Studio' },
    { id: 'create_project', label: 'Create New Project', number: 4, tag: 'Upload' },
    { id: 'analytics', label: 'Creator Insights', number: 5, tag: 'Analytics' },
    { id: 'export', label: 'Final Content / Export', number: 6, tag: 'Export' },
    { id: 'repurpose', label: 'Repurpose Content', number: 7, tag: 'Formats' },
    { id: 'adapt', label: 'Adapt Content (Instagram)', number: 8, tag: 'Simulator' },
    { id: 'workflow', label: 'Content Workflow (Kanban)', number: 9, tag: 'Pipeline' },
    { id: 'assets', label: 'Asset Library', number: 10, tag: 'Storage' },
    { id: 'suggestions', label: 'AI Suggested Clips', number: 11, tag: 'Intelligence' },
    { id: 'clip_editor', label: 'Clip Editor & Trimmer', number: 12, tag: 'Editor' },
    { id: 'transcript', label: 'Interactive Transcript', number: 13, tag: 'Transcript' },
    { id: 'hooks', label: 'Generate Hooks', number: 14, tag: 'Hooks' },
    { id: 'captions', label: 'Generate Captions', number: 15, tag: 'Captions' },
    { id: 'processing', label: 'AI Processing Analysis', number: 16, tag: 'Engine' },
  ];

  const currentItem = screens.find((s) => s.id === currentScreen);

  return (
    <aside aria-label="Screen Navigation" className="fixed bottom-4 left-4 z-50 select-none">
      {/* Popover list of screens */}
      {isOpen && (
        <div className="mb-2 w-80 max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#c7c4d8] p-3 text-xs custom-scrollbar animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[#c7c4d8]/40 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4f46e5] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                grid_view
              </span>
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-[#131b2e]">All 15 Screens</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#777587] hover:text-[#131b2e] p-1 rounded-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div className="space-y-1">
            {screens.map((s) => {
              const isSelected = s.id === currentScreen;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onNavigate(s.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#4f46e5] text-white font-semibold shadow-sm'
                      : 'hover:bg-[#f2f3ff] text-[#131b2e]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#e2e7ff] text-[#4f46e5]'
                    }`}>
                      {s.number}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#f2f3ff] text-[#777587]'
                  }`}>
                    {s.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating launcher pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 bg-[#131b2e] hover:bg-[#283044] text-white rounded-full shadow-lg border border-white/10 text-xs font-semibold font-['Inter'] transition-transform active:scale-95 cursor-pointer backdrop-blur-md"
        title="Quick jump to any screen"
      >
        <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
        <span className="text-white/80">Screen {currentItem?.number || 1}:</span>
        <span className="max-w-[140px] sm:max-w-[180px] truncate text-white">{currentItem?.label || 'Dashboard'}</span>
        <span className="material-symbols-outlined text-sm text-white/60">
          {isOpen ? 'expand_more' : 'unfold_more'}
        </span>
      </button>
    </aside>
  );
};
