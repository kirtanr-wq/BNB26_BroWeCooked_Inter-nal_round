import React, { useState } from 'react';
import { ScreenId, NavTab } from '../types';
import { useProject } from '../context/ProjectContext';

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%234f46e5"><circle cx="50" cy="50" r="50"/><circle cx="50" cy="40" r="20" fill="%23ffffff"/><path d="M20,85 C20,65 35,62 50,62 C65,62 80,65 80,85 Z" fill="%23ffffff"/></svg>';

interface TopNavBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  activeNav?: NavTab;
  onNavTabChange?: (tab: NavTab) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentScreen,
  onNavigate,
  activeNav = 'Home',
  onNavTabChange,
}) => {
  const { user, logout, token, selectProject, setSelectedClip } = useProject();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Semantic Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleExecuteSemanticSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setShowSearchResults(true);
    setHasSearched(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q, limit: 5 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Semantic search is temporarily unavailable.');
      }

      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error('Semantic search error:', err);
      setSearchError(err.message || 'Semantic search is temporarily unavailable.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSemanticSearch(searchQuery);
    }
  };

  const handleJumpToMoment = async (result: any) => {
    setShowSearchResults(false);
    try {
      if (result.projectId) {
        await selectProject(result.projectId);
      }
      setSelectedClip({
        id: result.id || `match_${Date.now()}`,
        clipNumber: '01',
        title: result.videoTitle || 'Semantic Match Moment',
        hook: result.text,
        reason: `Matched concept with ${result.scoreLabel || 'high relevance'}`,
        timeRange: result.timeRange,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: `${Math.round(result.endTime - result.startTime)}s`,
        durationSeconds: Math.round(result.endTime - result.startTime),
        aiHookScore: result.similarityPercentage || 88,
        viralScore: result.similarityPercentage || 88,
        aspectRatio: ['9:16', '16:9', '1:1'],
        tags: ['SemanticSearch', 'MatchedMoment'],
        statusBadge: 'Semantic Match',
        thumbnail: result.thumbnailUrl,
        thumbnailUrl: result.thumbnailUrl,
        transcriptSnippet: result.text,
      });
      onNavigate('clip_editor');
    } catch (err: any) {
      console.error('Failed to jump to moment:', err);
      onNavigate('clip_editor');
    }
  };

  const handleTabClick = (tab: NavTab) => {
    if (onNavTabChange) onNavTabChange(tab);
    switch (tab) {
      case 'Home':
        onNavigate('dashboard');
        break;
      case 'Projects':
        onNavigate('create_project');
        break;
      case 'Assets':
        onNavigate('assets');
        break;
      case 'AI Tools':
        onNavigate('suggestions');
        break;
      case 'Workflow':
        onNavigate('workflow');
        break;
      case 'Analytics':
        onNavigate('analytics');
        break;
      case 'Settings':
        onNavigate('dashboard');
        break;
    }
  };

  const handleSignOut = () => {
    logout();
    setShowUserMenu(false);
    onNavigate('home');
  };

  return (
    <header className="w-full bg-white border-b border-[#c7c4d8]/60 shadow-xs sticky top-0 z-40 select-none">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand & Global Links Cluster */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#3525cd] transition-colors">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_videocam
              </span>
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#4f46e5] tracking-tight">
              CreatorAi
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 h-16">
            {(['Home', 'Projects', 'Assets', 'AI Tools', 'Workflow', 'Analytics', 'Settings'] as NavTab[]).map((tab) => {
              const isActive = activeNav === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`h-16 flex items-center gap-1.5 font-['Inter'] text-xs font-semibold tracking-wide transition-colors cursor-pointer border-b-2 ${
                    isActive
                      ? 'border-[#4f46e5] text-[#4f46e5]'
                      : 'border-transparent text-[#464555] hover:text-[#131b2e]'
                  }`}
                >
                  {tab}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Semantic Search Bar */}
          <div className="relative hidden md:block w-64 lg:w-80">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4f46e5] text-[18px]">
              saved_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchQuery.trim() || searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search your content by meaning..."
              className="w-full bg-[#f2f3ff] border border-transparent focus:border-[#4f46e5] focus:bg-white text-xs text-[#131b2e] placeholder-[#777587] pl-8 pr-8 py-1.5 rounded-lg outline-none transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => handleExecuteSemanticSearch(searchQuery)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4f46e5] hover:text-[#3525cd] text-xs font-semibold cursor-pointer"
                title="Execute Semantic Search"
              >
                {isSearching ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                )}
              </button>
            )}

            {/* Semantic Search Results Popover */}
            {showSearchResults && (
              <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-[#c7c4d8]/80 p-4 z-50 text-xs font-['Inter'] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#c7c4d8]/40">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#4f46e5] text-base">psychology</span>
                    <span className="font-bold text-[#131b2e]">Semantic Search</span>
                    <span className="text-[10px] bg-indigo-50 text-[#4f46e5] px-1.5 py-0.5 rounded font-medium">pgvector</span>
                  </div>
                  <button
                    onClick={() => setShowSearchResults(false)}
                    className="text-[#777587] hover:text-[#131b2e] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {isSearching ? (
                  <div className="py-6 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-[#464555] font-medium">Computing concept vector &amp; finding matching moments...</p>
                  </div>
                ) : searchError ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    {searchError}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {searchResults.map((res: any) => (
                      <div
                        key={res.id}
                        className="p-2.5 bg-[#f8f9ff] hover:bg-indigo-50/60 border border-[#c7c4d8]/50 rounded-lg transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#131b2e] truncate max-w-[180px]">
                            {res.videoTitle}
                          </span>
                          <span className="text-[10px] font-semibold text-[#006c49] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {res.scoreLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#4f46e5] font-semibold">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{res.timeRange}</span>
                        </div>

                        <p className="text-[11px] text-[#464555] line-clamp-2 italic bg-white/70 p-1.5 rounded border border-[#c7c4d8]/30">
                          &ldquo;{res.text}&rdquo;
                        </p>

                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleJumpToMoment(res)}
                            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">play_circle</span>
                            <span>Jump to Moment</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasSearched ? (
                  <div className="py-4 text-center text-[#777587] space-y-1">
                    <span className="material-symbols-outlined text-2xl text-[#777587]">search_off</span>
                    <p className="text-xs font-medium">No relevant moments found.</p>
                    <p className="text-[10px] text-[#777587]">Try searching for other concepts or topics discussed in your videos.</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-[#777587] font-medium">Example natural language queries:</p>
                    <div className="space-y-1">
                      {[
                        'Where did I discuss depending too much on AI?',
                        'Find the part about startup funding',
                        'When did I talk about audience growth mistakes?',
                      ].map((sample) => (
                        <button
                          key={sample}
                          onClick={() => {
                            setSearchQuery(sample);
                            handleExecuteSemanticSearch(sample);
                          }}
                          className="w-full text-left p-1.5 hover:bg-[#f2f3ff] rounded text-[#4f46e5] text-[11px] truncate cursor-pointer transition-colors"
                        >
                          &bull; &ldquo;{sample}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowHelp(false);
                setShowUserMenu(false);
              }}
              className="p-2 text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff] rounded-lg transition-colors focus:outline-none relative cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#c7c4d8]/60 p-4 z-50 text-xs font-['Inter']">
                <div className="flex items-center justify-between pb-2 border-b border-[#c7c4d8]/40 mb-3">
                  <span className="font-bold text-[#131b2e]">Activity Notifications</span>
                  <span className="text-[10px] text-[#4f46e5] font-semibold cursor-pointer">Mark read</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#006c49] text-[18px] mt-0.5">check_circle</span>
                    <div>
                      <p className="font-medium text-[#131b2e]">Video Processed</p>
                      <p className="text-[11px] text-[#464555]">AI isolated 3 candidate viral moments.</p>
                      <span className="text-[10px] text-[#777587]">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowHelp(!showHelp);
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
              className="p-2 text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff] rounded-lg transition-colors focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>

            {showHelp && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[#c7c4d8]/60 p-4 z-50 text-xs font-['Inter']">
                <div className="flex items-center gap-2 pb-2 border-b border-[#c7c4d8]/40 mb-3">
                  <span className="material-symbols-outlined text-[#4f46e5] text-[18px]">menu_book</span>
                  <span className="font-bold text-[#131b2e]">Repurposing Workflow</span>
                </div>
                <div className="space-y-2 text-[#464555]">
                  <button onClick={() => { onNavigate('create_project'); setShowHelp(false); }} className="block hover:underline text-left cursor-pointer">
                    • Ingest Long-Form Video
                  </button>
                  <button onClick={() => { onNavigate('suggestions'); setShowHelp(false); }} className="block hover:underline text-left cursor-pointer">
                    • AI Clip Extraction
                  </button>
                  <button onClick={() => { onNavigate('hooks'); setShowHelp(false); }} className="block hover:underline text-left cursor-pointer">
                    • 3-Second Viral Hook Strategy
                  </button>
                  <button onClick={() => { onNavigate('export'); setShowHelp(false); }} className="block hover:underline text-left cursor-pointer">
                    • Master MP4 Deliverables
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Menu */}
          <div className="relative pl-1 border-l border-[#c7c4d8]/50">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
                setShowHelp(false);
              }}
              className="flex items-center rounded-full focus:outline-none ring-2 ring-transparent hover:ring-[#4f46e5]/40 transition-all cursor-pointer"
            >
              <img
                src={user?.avatarUrl || DEFAULT_AVATAR}
                alt="Creator Profile Avatar"
                className="w-8 h-8 rounded-full object-cover border border-[#c7c4d8]"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#c7c4d8]/60 py-2 z-50 text-xs font-['Inter']">
                <div className="px-3 py-2 border-b border-[#c7c4d8]/40">
                  <p className="font-bold text-[#131b2e] truncate">{user?.username || 'Alex Rivera'}</p>
                  <p className="text-[11px] text-[#464555] truncate">{user?.email || 'alex@creatorai.studio'}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#006c49] bg-[#6cf8bb]/30 px-2 py-0.5 rounded-full">
                    Creator Pro Tier
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { onNavigate('dashboard'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f2f3ff] text-[#131b2e] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">dashboard</span>
                    Dashboard
                  </button>
                  <button
                    onClick={() => { onNavigate('assets'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f2f3ff] text-[#131b2e] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">folder</span>
                    Asset Library
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f2f3ff] text-[#ba1a1a] flex items-center gap-2 border-t border-[#c7c4d8]/30 mt-1 cursor-pointer font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
