import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export type ManualStatus = 'absent' | 'toDelete' | null | undefined;

const STATUS_CONFIG = {
  active: { label: 'Actif', icon: <CheckCircleOutlineIcon fontSize="small" />, color: '#66bb6a' },
  absent: { label: 'En absence', icon: <PauseCircleOutlineIcon fontSize="small" />, color: '#ffa726' },
  toDelete: { label: 'À supprimer', icon: <PersonRemoveIcon fontSize="small" />, color: '#ef5350' },
} as const;

function keyFor(status: ManualStatus): keyof typeof STATUS_CONFIG {
  return status ?? 'active';
}

interface Props {
  status: ManualStatus;
  onChange: (status: 'absent' | 'toDelete' | null) => void;
}

export const StatusMenu: React.FC<Props> = ({ status, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = STATUS_CONFIG[keyFor(status)];

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={current.icon}
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          color: current.color,
          borderColor: current.color,
          '&:hover': { borderColor: current.color },
        }}
      >
        {current.label}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((key) => (
          <MenuItem
            key={key}
            selected={keyFor(status) === key}
            onClick={() => {
              setAnchorEl(null);
              onChange(key === 'active' ? null : key);
            }}
          >
            <ListItemIcon>{STATUS_CONFIG[key].icon}</ListItemIcon>
            <ListItemText>{STATUS_CONFIG[key].label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
