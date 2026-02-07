import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Controller from './pages/Controller';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import Sessions from './pages/Sessions';
import Agents from './pages/Agents';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import ClawdbotSettings from './pages/ClawdbotSettings';
import Clawdbot from './pages/Clawdbot';
import ActivityLog from './pages/ActivityLog';
import FloatingAssistant from './components/FloatingAssistant';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
  });

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="controller" element={<Controller />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="agents" element={<Agents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="chat" element={<Clawdbot />} />
          <Route path="clawdbot" element={<ClawdbotSettings />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <FloatingAssistant />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </ErrorBoundary>
  );
}

export default App;
