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
};

export const Sidebar = ({ groups }: SidebarProps) => {
  const navigate = useNavigate();

  return (
    <Drawer
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
                onClick={() => navigate(`/groups/${g.id}`)}
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
    </Drawer>
  );
};
