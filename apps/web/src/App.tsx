import React, { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen.js';
import { LearnScreen } from './screens/LearnScreen.js';
import { QuizScreen } from './screens/QuizScreen.js';
import { WheelScreen } from './screens/WheelScreen.js';
import { FlashCardsScreen } from './screens/FlashCardsScreen.js';
import { SnakesLaddersScreen } from './screens/SnakesLaddersScreen.js';
import { ProfileScreen } from './screens/ProfileScreen.js';
import { JoinScreen } from './screens/JoinScreen.js';
import { HostScreen } from './screens/HostScreen.js';
import { storage } from './services/storage.js';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [initialArticleId, setInitialArticleId] = useState<string | undefined>();
  const [prefilledCode, setPrefilledCode] = useState<string>('');
  const [theme, setTheme] = useState<'paper' | 'night'>(() => storage.getSettings().theme);

  // Check URL paths/hashes for deep links (e.g. /join/CODE, #join/CODE, or ?join=CODE)
  useEffect(() => {
    const checkDeepLink = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      const match =
        path.match(/\/join\/([A-Za-z0-9]{4,8})/i) ||
        hash.match(/#\/?join\/([A-Za-z0-9]{4,8})/i) ||
        search.match(/[?&]join=([A-Za-z0-9]{4,8})/i);

      if (match) {
        setPrefilledCode(match[1].toUpperCase());
        setCurrentScreen('join');
      }
    };

    checkDeepLink();
    window.addEventListener('hashchange', checkDeepLink);
    window.addEventListener('popstate', checkDeepLink);
    return () => {
      window.removeEventListener('hashchange', checkDeepLink);
      window.removeEventListener('popstate', checkDeepLink);
    };
  }, []);

  // Update HTML data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'night' ? 'dark' : 'light');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'paper' ? 'night' : 'paper';
    setTheme(next);
    storage.updateSettings({ theme: next });
  };

  const handleNavigateToArticle = (articleId: string) => {
    setInitialArticleId(articleId);
    setCurrentScreen('learn');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1 }}>
        {currentScreen === 'home' && (
          <HomeScreen onSelectScreen={(screen) => setCurrentScreen(screen)} />
        )}

        {currentScreen === 'learn' && (
          <LearnScreen
            onBack={() => {
              setInitialArticleId(undefined);
              setCurrentScreen('home');
            }}
            initialArticleId={initialArticleId}
          />
        )}

        {currentScreen === 'quiz' && (
          <QuizScreen
            onBack={() => setCurrentScreen('home')}
            onNavigateToLearnArticle={handleNavigateToArticle}
          />
        )}

        {currentScreen === 'wheel' && (
          <WheelScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'flash' && (
          <FlashCardsScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'snakes' && (
          <SnakesLaddersScreen onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            onBack={() => setCurrentScreen('home')}
            onNavigateToArticle={handleNavigateToArticle}
            onToggleTheme={toggleTheme}
          />
        )}

        {currentScreen === 'join' && (
          <JoinScreen
            onBack={() => {
              setPrefilledCode('');
              setCurrentScreen('home');
            }}
            prefilledCode={prefilledCode}
          />
        )}

        {currentScreen === 'host' && (
          <HostScreen onBack={() => setCurrentScreen('home')} />
        )}
      </main>
    </div>
  );
};
