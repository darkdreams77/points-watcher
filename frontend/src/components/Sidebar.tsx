import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { getGroupColor } from '../groupColors';
import { useNavigate } from 'react-router-dom';
import type { Group } from '../types';

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

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        {groups.map((g) => {
          const color = getGroupColor(g);
          return (
            <ListItemButton
              key={g.id}
              onClick={() => handleNavClick(g.forumId)}
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

      {/* <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {groups.map((g) => {
            const color = getGroupColor(g);
            return (
              <ListItemButton
                key={g.id}
                onClick={() => navigate(`/groups/${g.forumId}`)}
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
                <ListItemText primary={g.name} secondary={`${g.forumId}`} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer> */}
    </>
  );
};
