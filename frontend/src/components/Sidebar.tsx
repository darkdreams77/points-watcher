import {
  Box,
  Divider,
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

// Ordre d'affichage voulu dans le side menu, par forumId, groupé par section
// (une ligne de séparation est ajoutée entre chaque section). Les groupes
// absents de cette liste (nouveaux ajouts non encore rangés) s'affichent
// après, dans l'ordre reçu de l'API.
const GROUP_SECTIONS: string[][] = [
  [
    '3-adams-house',
    '464-bizuts-adams-house',
    '463-franklin-house',
    '465-bizuts-franklin-house',
    '432-kirkland-house',
    '466-bizuts-kirkland-house',
    '4-pforzheimer-house',
    '467-bizuts-pforzheimer-house',
    '7-students',
  ],
  [
    '468-dream-chasers',
    '469-power-circle',
    '470-city-spotlight',
    '471-good-souls',
    '472-everyday-heroes',
  ],
  [
    '401-dark-rises',
    '390-fire-starter',
    '388-i-want-it-i-got-it',
    '389-love-shot',
    '391-wrecked-souls',
  ],
];

function sortGroupsIntoSections(groups: Group[]): Group[][] {
  const byForumId = new Map(groups.map((g) => [g.forumId, g]));
  const used = new Set<string>();

  const sections = GROUP_SECTIONS.map((forumIds) =>
    forumIds
      .map((forumId) => byForumId.get(forumId))
      .filter((g): g is Group => {
        if (!g) return false;
        used.add(g.forumId);
        return true;
      })
  );

  const rest = groups.filter((g) => !used.has(g.forumId));
  if (rest.length > 0) sections.push(rest);

  return sections.filter((section) => section.length > 0);
}

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

        <Divider sx={{ my: 1 }} />

        {sortGroupsIntoSections(groups).map((section, sectionIndex) => (
          <Box key={sectionIndex}>
            {sectionIndex > 0 && <Divider sx={{ my: 1 }} />}
            {section.map((g) => {
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
                  <ListItemText primary={g.name} />
                </ListItemButton>
              );
            })}
          </Box>
        ))}
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
