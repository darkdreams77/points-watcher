import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

export type ManualStatus = 'absent' | 'toDelete' | null | undefined;

const LABELS = {
  active: 'Marquer actif',
  absent: 'Mettre en absence',
  toDelete: 'Marquer à supprimer',
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

interface Props {
  status: ManualStatus;
  onChange: (status: 'absent' | 'toDelete' | null) => void;
}

export const StatusMenu: React.FC<Props> = ({ status, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = keyFor(status);
  // Le badge de statut affiche déjà l'état courant — ce menu ne propose
  // que les transitions possibles, pas l'état déjà actif.
  const options = (Object.keys(LABELS) as StatusKey[]).filter((k) => k !== current);

  return (
    <>
      <Tooltip title="Actions">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ minWidth: 40, minHeight: 40 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {options.map((k) => (
          <MenuItem
            key={k}
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
