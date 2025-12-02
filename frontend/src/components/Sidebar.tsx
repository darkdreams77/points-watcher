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
import GroupsIcon from '@mui/icons-material/Groups';

const drawerWidth = 350;

type SidebarProps = {
  groups: Group[];
  isMobile: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
};

export const Sidebar = ({
  groups,
  isMobile,
  isDrawerOpen,
  setIsDrawerOpen,
}: SidebarProps) => {
  const navigate = useNavigate();

  const handleNavClick = (id: string) => {
    navigate(`/groups/${id}`);
    if (isMobile) setIsDrawerOpen(false);
  };

  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        <ListItemButton
          onClick={() => handleNavClick(`../all-members`)}
          sx={{
            backgroundColor: isActive('/all-members')
              ? 'action.selected'
              : 'transparent',
            '&:hover': {
              backgroundColor: isActive('/members')
                ? 'action.selected'
                : 'action.hover',
            },
          }}
        >
          <GroupsIcon sx={{ color: 'white', mr: 1.5 }} />
          <ListItemText primary="Tous les membres" />
        </ListItemButton>
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
    <Drawer
      variant="temporary"
      open={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
      ModalProps={{
        keepMounted: true, // meilleur perf mobile
      }}
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
  );
};
