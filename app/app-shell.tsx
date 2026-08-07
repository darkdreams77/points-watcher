'use client';

import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
import { useGroups } from './groups-context';
import { useIsMobile } from '../hooks/useIsMobile';

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const groups = useGroups();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
