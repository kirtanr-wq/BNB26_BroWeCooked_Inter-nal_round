/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScreenId, NavTab } from './types';
import { TopNavBar } from './components/TopNavBar';
import { ScreenSwitcherDock } from './components/ScreenSwitcherDock';
import { ProjectProvider } from './context/ProjectContext';
import DotField from './components/DotField';

// Screens
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { CreateProjectScreen } from './screens/CreateProjectScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { FinalExportScreen } from './screens/FinalExportScreen';
import { RepurposeScreen } from './screens/RepurposeScreen';
import { AdaptContentScreen } from './screens/AdaptContentScreen';
import { WorkflowScreen } from './screens/WorkflowScreen';
import { AssetLibraryScreen } from './screens/AssetLibraryScreen';
import { SuggestedClipsScreen } from './screens/SuggestedClipsScreen';
import { ClipEditorScreen } from './screens/ClipEditorScreen';
import { TranscriptScreen } from './screens/TranscriptScreen';
import { GenerateHooksScreen } from './screens/GenerateHooksScreen';
import { GenerateCaptionsScreen } from './screens/GenerateCaptionsScreen';
import { AIProgressScreen } from './screens/AIProgressScreen';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  screen: ScreenId;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ScreenErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Screen "${this.props.screen}" threw exception:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.screen !== this.props.screen && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-4xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-lg font-['Inter'] space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <span className="material-symbols-outlined text-3xl">error</span>
            <div>
              <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
                Screen Failed to Render ({this.props.screen})
              </h2>
              <p className="text-xs text-slate-500">
                A runtime exception occurred while mounting this screen component.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 text-red-400 p-4 rounded-xl text-xs font-mono overflow-x-auto space-y-2">
            <div className="font-bold text-red-300">
              {this.state.error?.name}: {this.state.error?.message}
            </div>
            {this.state.error?.stack && (
              <pre className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {this.state.error.stack}
              </pre>
            )}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Retry Screen
            </button>
            <button
              onClick={this.props.onReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    try {
      const saved = sessionStorage.getItem('creatorai_current_screen');
      if (saved && saved !== 'login') return saved as ScreenId;
    } catch {}
    return 'home';
  });
  const [activeNav, setActiveNav] = useState<NavTab>('Home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('creatorai_auth_token'));
    } catch {
      return false;
    }
  });

  const handleNavigate = (screen: ScreenId) => {
    try {
      sessionStorage.setItem('creatorai_current_screen', screen);
    } catch {}
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync top navigation tab
    if (['dashboard', 'create_project'].includes(screen)) {
      setActiveNav('Home');
    } else if (['workflow'].includes(screen)) {
      setActiveNav('Projects');
    } else if (['repurpose', 'adapt', 'suggestions', 'clip_editor', 'transcript', 'hooks', 'captions', 'processing', 'ai_progress'].includes(screen)) {
      setActiveNav('AI Tools');
    } else if (['assets'].includes(screen)) {
      setActiveNav('Assets');
    } else if (['analytics'].includes(screen)) {
      setActiveNav('Analytics');
    }
  };

  const handleLogin = () => {
    try {
      sessionStorage.setItem('creatorai_current_screen', 'dashboard');
    } catch {}
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    setActiveNav('Home');
  };

  const handleLogout = () => {
    try {
      sessionStorage.setItem('creatorai_current_screen', 'home');
      localStorage.removeItem('creatorai_auth_token');
      localStorage.removeItem('creatorai_user');
    } catch {}
    setIsAuthenticated(false);
    setCurrentScreen('home');
  };

  // Determine if TopNavBar should be visible (hidden on Home, Login, AI Progress, and Clip Editor which has its own toolbar)
  const showTopNavBar = currentScreen !== 'home' && currentScreen !== 'login' && currentScreen !== 'ai_progress' && currentScreen !== 'clip_editor';

  const isPostLogin = currentScreen !== 'home' && currentScreen !== 'login';

  return (
    <ProjectProvider>
      <div className="min-h-screen bg-[#faf8ff] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white antialiased relative">
        {/* Interactive DotField Background for all post-login pages */}
        {isPostLogin && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <DotField
              dotRadius={1.8}
              dotSpacing={14}
              bulgeStrength={72}
              glowRadius={180}
              sparkle={false}
              waveAmplitude={0}
              gradientFrom="rgba(99, 102, 241, 0.72)"
              gradientTo="rgba(147, 51, 234, 0.6)"
              glowColor="rgba(79, 70, 229, 0.35)"
            />
          </div>
        )}

        {/* Top Main Navigation */}
        {showTopNavBar && (
          <div className="relative z-20">
            <TopNavBar
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              activeNav={activeNav}
              onNavTabChange={setActiveNav}
            />
          </div>
        )}

        {/* Screen Render Router */}
        <main className="w-full relative z-10">
          <ScreenErrorBoundary screen={currentScreen} onReset={() => handleNavigate('dashboard')}>
            {currentScreen === 'home' && (
              <HomeScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'login' && (
              <LoginScreen onLogin={handleLogin} onNavigate={handleNavigate} />
            )}
            {currentScreen === 'create_project' && (
              <CreateProjectScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'dashboard' && (
              <DashboardScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'analytics' && (
              <AnalyticsScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'export' && (
              <FinalExportScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'repurpose' && (
              <RepurposeScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'adapt' && (
              <AdaptContentScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'workflow' && (
              <WorkflowScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'assets' && (
              <AssetLibraryScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'suggestions' && (
              <SuggestedClipsScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'clip_editor' && (
              <ClipEditorScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'transcript' && (
              <TranscriptScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'hooks' && (
              <GenerateHooksScreen onNavigate={handleNavigate} />
            )}
            {currentScreen === 'captions' && (
              <GenerateCaptionsScreen onNavigate={handleNavigate} />
            )}
            {(currentScreen === 'ai_progress' || currentScreen === 'processing') && (
              <AIProgressScreen onNavigate={handleNavigate} />
            )}
          </ScreenErrorBoundary>
        </main>

        {/* Floating Screen Switcher Quick Navigation Dock */}
        <ScreenSwitcherDock
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
        />
      </div>
    </ProjectProvider>
  );
}
