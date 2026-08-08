import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { getStatusColors } from '../theme';

export type ManualStatus = 'absent' | 'toDelete' | null | undefined;

const LABELS = {
  active: 'Actif',
  absent: 'En absence',
  toDelete: 'À supprimer',
} as const;

const ICONS = {
  active: <CheckCircleOutlineIcon fontSize="small" />,
  absent: <PauseCircleOutlineIcon fontSize="small" />,
  toDelete: <PersonRemoveIcon fontSize="small" />,
} as const;

type StatusKey = keyof typeof LABELS;

function keyFor(status: ManualStatus): StatusKey {
  return status ?? 'active';
}

// Point qui pulse doucement sur le statut actif — respecte
// prefers-reduced-motion (voir index.css / @media reduce plus bas).
const PulseDot: React.FC<{ color: string }> = ({ color }) => (
  <Box
    sx={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
      '@media (prefers-reduced-motion: no-preference)': {
        animation: 'status-pulse 2s ease-in-out infinite',
      },
      '@keyframes status-pulse': {
        '0%, 100%': { opacity: 1, boxShadow: `0 0 0 0 ${color}66` },
        '50%': { opacity: 0.7, boxShadow: `0 0 0 4px ${color}00` },
      },
    }}
  />
);

interface Props {
  status: ManualStatus;
  onChange: (status: 'absent' | 'toDelete' | null) => void;
  compact?: boolean;
}

export const StatusMenu: React.FC<Props> = ({ status, onChange, compact }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = useTheme();
  const colors = getStatusColors(theme.palette.mode);
  const key = keyFor(status);
  const color = colors[key === 'active' ? 'actif' : key];

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={
          key === 'active' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PulseDot color={color} />
              {!compact && ICONS[key]}
            </Box>
          ) : (
            ICONS[key]
          )
        }
        endIcon={compact ? undefined : <KeyboardArrowDownIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          color,
          borderColor: color,
          minWidth: compact ? 0 : undefined,
          minHeight: 40,
          px: compact ? 1 : 1.5,
          '&:hover': { borderColor: color },
        }}
      >
        {!compact && LABELS[key]}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {(Object.keys(LABELS) as StatusKey[]).map((k) => (
          <MenuItem
            key={k}
            selected={key === k}
            onClick={() => {
              setAnchorEl(null);
              onChange(k === 'active' ? null : k);
            }}
          >
            <ListItemIcon>{ICONS[k]}</ListItemIcon>
            <ListItemText>{LABELS[k]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
