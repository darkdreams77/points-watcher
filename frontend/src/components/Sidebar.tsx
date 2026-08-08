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
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';

const drawerWidth = 350;

type SidebarProps = {
  groups: Group[];
  isMobile: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
};

export const Sidebar = ({
  groups,
  isDrawerOpen,
  setIsDrawerOpen,
}: SidebarProps) => {
  const navigate = useNavigate();

  const handleNavClick = (id: string) => {
    navigate(`/groups/${id}`);
    setIsDrawerOpen(false);
  };

  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto', px: 1 }}>
      <List sx={{ '& .MuiListItemButton-root': { borderRadius: 1 } }}>
        <ListItemButton
          onClick={() => handleNavClick(`../all-members`)}
          sx={{
            backgroundColor: isActive('/all-members')
              ? 'action.selected'
              : 'transparent',
            '&:hover': {
              backgroundColor: isActive('/all-members')
                ? 'action.selected'
                : 'action.hover',
            },
          }}
        >
          <GroupsIcon sx={{ color: 'text.secondary', mr: 1.5 }} />
          <ListItemText primary="Tous les membres" />
        </ListItemButton>
        <ListItemButton
          onClick={() => handleNavClick(`../in-danger`)}
          sx={{
            backgroundColor: isActive('/in-danger')
              ? 'action.selected'
              : 'transparent',
            '&:hover': {
              backgroundColor: isActive('/in-danger')
                ? 'action.selected'
                : 'action.hover',
            },
          }}
        >
          <WarningIcon sx={{ color: 'orange', mr: 1.5 }} />
          <ListItemText primary="Membres en danger" />
        </ListItemButton>

        <ListItemButton
          onClick={() => handleNavClick(`../to-delete`)}
          sx={{
            backgroundColor: isActive('/to-delete')
              ? 'action.selected'
              : 'transparent',
            '&:hover': {
              backgroundColor: isActive('/to-delete')
                ? 'action.selected'
                : 'action.hover',
            },
          }}
        >
          <GroupRemoveIcon sx={{ color: '#992e2e', mr: 1.5 }} />
          <ListItemText primary="Membres à supprimer" />
        </ListItemButton>

        {groups.map((g) => {
          const color = getGroupColor(g);
          return (
            <ListItemButton
              key={g.id}
              onClick={() => handleNavClick(g.forumId)}
              sx={{
                backgroundColor: isActive(g.forumId)
                  ? 'action.selected'
                  : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(g.forumId)
                    ? 'action.selected'
                    : 'action.hover',
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
