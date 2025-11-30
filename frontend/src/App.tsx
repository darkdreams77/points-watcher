import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { fetchGroups } from './api';
import type { Group } from './types';
import { GroupPage } from './components/GroupPage';
import { CssBaseline, Box, Toolbar, AppBar, Typography } from '@mui/material';
import { Sidebar } from './components/Sidebar';

const AppLayout: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              ILH – Suivi des RPs
            </Typography>
          </Toolbar>
        </AppBar>

        <Sidebar groups={groups} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
          }}
        >
          <Toolbar />
          <Routes>
            <Route
              path="/"
              element={<Navigate to={`/groups/${groups[0].id}`} replace />}
            />
            <Route
              path="/groups/:id"
              element={<GroupPageWrapper groups={groups} />}
            />
            <Route path="*" element={<div>Page non trouvée.</div>} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

const GroupPageWrapper: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const { id } = useParams<{ id: string }>();
  const group = groups.find((g) => g.id === id);
  if (!group) return <div>Groupe introuvable.</div>;
  return <GroupPage group={group} />;
};

const App: React.FC = () => <AppLayout />;

export default App;
