'use client';

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fetchGroups } from '../api';
import type { Group } from '../types';
import { GroupPage } from '../components/GroupPage';
import {
  CssBaseline,
  Box,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Sidebar } from '../components/Sidebar';
import { DangerPage } from '../components/DangerPage';
import { AllMembersPage } from '../components/AllMembersPage';
import { ToDeletePage } from '../components/ToDeletePage';
import { useIsMobile } from '../hooks/useIsMobile';
import { AuthProvider } from './auth-context';

const AppLayout: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = useIsMobile();

  const [isDrawerOpen, setIsDrawerOpen] = useState(isMobile);

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
    typography: {
      fontFamily: [
        'Work Sans',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
    },
  });

  useEffect(() => {
    fetchGroups()
      .then((data) => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div style={{ padding: 16 }}>Chargement des groupes…</div>;
  if (!groups.length)
    return <div style={{ padding: 16 }}>Aucun groupe trouvé.</div>;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: 1201,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            gap: '5px',
            paddingLeft: '30px',
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            sx={{ flex: '0 0 70px' }}
          >
            <MenuIcon />
          </IconButton>

          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              ILH – Suivi des RPs
            </Typography>
          </Toolbar>
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
            p: 3,
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
    </ThemeProvider>
  );
};

const GroupPageWrapper: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const { forumId } = useParams<{ forumId: string }>();
  const group = groups.find((g) => g.forumId === forumId);
  if (!group) return <div>Groupe introuvable.</div>;
  return <GroupPage group={group} />;
};

export default function Home() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
