import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { getGroupColor } from '../helpers/groupColors';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Group } from '../types';
import WarningIcon from '@mui/icons-material/Warning';

const drawerWidth = 350;

type SidebarProps = {
  groups: Group[];
  isMobile: boolean;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
};

export const Sidebar = ({
  groups,
  isMobile,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) => {
  const navigate = useNavigate();

  const handleNavClick = (id: string) => {
    navigate(`/groups/${id}`);
    if (isMobile) setIsMobileOpen(false);
  };

  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        <ListItemButton
          onClick={() => handleNavClick(`../in-danger`)}
          sx={{
            backgroundColor: isActive('/in-danger') ? '#1f1f1f' : 'transparent',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <WarningIcon sx={{ color: 'orange', mr: 1.5 }} />
          <ListItemText primary="Membres en danger" />
        </ListItemButton>

        {groups.map((g) => {
          const color = getGroupColor(g);
          return (
            <ListItemButton
              key={g.id}
              onClick={() => handleNavClick(g.forumId)}
              sx={{
                backgroundColor: isActive(g.forumId)
                  ? '#1f1f1f'
                  : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: color,
                  mr: 1.5,
                }}
              />
              <ListItemText
                primary={g.name}
                secondary={`ForumId: ${g.forumId}`}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      {/* Drawer mobile (temporary) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          ModalProps={{
            keepMounted: true, // meilleur perf mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}

      {/* Drawer desktop (permanent) */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};
