import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
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
  onChange: (status: 'absent' | 'toDelete' | null, absenceEndDate?: string) => void;
}

export const StatusMenu: React.FC<Props> = ({ status, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [absenceDate, setAbsenceDate] = useState('');
  const current = keyFor(status);
  // Le badge de statut affiche déjà l'état courant — ce menu ne propose
  // que les transitions possibles, pas l'état déjà actif.
  const options = (Object.keys(LABELS) as StatusKey[]).filter((k) => k !== current);

  const handleSelect = (k: StatusKey) => {
    setAnchorEl(null);
    if (k === 'absent') {
      setAbsenceDate('');
      setAbsenceDialogOpen(true);
      return;
    }
    onChange(k === 'active' ? null : k);
  };

  const confirmAbsence = () => {
    setAbsenceDialogOpen(false);
    onChange('absent', absenceDate || undefined);
  };

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
          <MenuItem key={k} onClick={() => handleSelect(k)}>
            <ListItemIcon>{ICONS[k]}</ListItemIcon>
            <ListItemText>{LABELS[k]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Dialog
        open={absenceDialogOpen}
        onClose={() => setAbsenceDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Date de fin d'absence (optionnel)</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            fullWidth
            value={absenceDate}
            onChange={(e) => setAbsenceDate(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbsenceDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={confirmAbsence}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
