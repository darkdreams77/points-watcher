import React, { useState } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
} from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { updateMemberLastChangeAt, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';

interface Props {
  memberId: string;
  currentLastChangeAt: string | null;
  onSaved: () => void | Promise<void>;
}

function toInputDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export const EditDateAction: React.FC<Props> = ({
  memberId,
  currentLastChangeAt,
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const { showAuthModal } = useAuth();

  const handleOpen = () => {
    setDate(toInputDate(currentLastChangeAt));
    setOpen(true);
  };

  const save = async () => {
    if (!date) return;
    setSaving(true);
    try {
      await updateMemberLastChangeAt(memberId, date);
      setOpen(false);
      await onSaved();
    } catch (e) {
      if (e instanceof UnauthorizedError) showAuthModal(save);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title="Modifier la date du dernier RP">
        <IconButton size="small" onClick={handleOpen} sx={{ minWidth: 40, minHeight: 40 }}>
          <EditCalendarIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Modifier la date du dernier RP</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            fullWidth
            value={date}
            onChange={(e) => setDate(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!date || saving} onClick={save}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
