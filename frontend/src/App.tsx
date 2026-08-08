import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { fetchGroups } from './api';
import type { Group } from './types';
import { GroupPage } from './components/GroupPage';
import { Box, Toolbar, AppBar, Typography, IconButton, Tooltip, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LoginIcon from '@mui/icons-material/Login';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Sidebar } from './components/Sidebar';
import { DangerPage } from './components/DangerPage';
import { AllMembersPage } from './components/AllMembersPage';
import { ToDeletePage } from './components/ToDeletePage';
import { useIsMobile } from './hooks/useIsMobile';
import { AuthProvider, useAuth } from './auth-context';
import { ThemeModeProvider, useThemeMode } from './theme-context';

const AppLayout: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, showAuthModal } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  const isMobile = useIsMobile();

  const [isDrawerOpen, setIsDrawerOpen] = useState(isMobile);

  const loadGroups = useCallback(() => {
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  if (loading)
    return <div style={{ padding: 16 }}>Chargement des groupes…</div>;
  if (!groups.length)
    return <div style={{ padding: 16 }}>Aucun groupe trouvé.</div>;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1201,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '5px',
          paddingLeft: { xs: '8px', sm: '30px' },
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          sx={{ flex: { xs: '0 0 44px', sm: '0 0 70px' } }}
        >
          <MenuIcon />
        </IconButton>

        <Toolbar sx={{ flexGrow: 1 }}>
          <Typography variant="h6" noWrap component="div">
            ILH – Suivi des RPs
          </Typography>
        </Toolbar>

        {isAuthenticated ? (
          <Tooltip title="Connecté">
            <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
          </Tooltip>
        ) : isMobile ? (
          <Tooltip title="Se connecter">
            <IconButton color="inherit" onClick={() => showAuthModal()} sx={{ mr: 0.5 }}>
              <LoginIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            color="inherit"
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => showAuthModal()}
            sx={{ mr: 1, textTransform: 'none' }}
          >
            Se connecter
          </Button>
        )}

        <Tooltip title={mode === 'dark' ? 'Passer en clair' : 'Passer en sombre'}>
          <IconButton color="inherit" onClick={toggleMode} sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </AppBar>

      <Sidebar
          groups={groups}
          isMobile={isMobile}
          isDrawerOpen={isDrawerOpen}
          setIsDrawerOpen={setIsDrawerOpen}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            p: { xs: 2, sm: 3 },
          }}
        >
          <Toolbar />
          <Routes>
            <Route index element={<Navigate to="/all-members" replace />} />
            <Route
              path="/groups/:forumId"
              element={<GroupPageWrapper groups={groups} />}
            />
            <Route
              path="/all-members"
              element={<AllMembersPage groups={groups} />}
            />
            <Route
              path="/to-delete"
              element={<ToDeletePage groups={groups} />}
            />
            <Route path="/in-danger" element={<DangerPage groups={groups} />} />
            <Route path="*" element={<div>Page non trouvée.</div>} />
          </Routes>
        </Box>
      </Box>
  );
};

const GroupPageWrapper: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const { forumId } = useParams<{ forumId: string }>();
  const group = groups.find((g) => g.forumId === forumId);
  if (!group) return <div>Groupe introuvable.</div>;
  return <GroupPage group={group} />;
};

const App: React.FC = () => (
  <ThemeModeProvider>
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  </ThemeModeProvider>
);

export default App;
