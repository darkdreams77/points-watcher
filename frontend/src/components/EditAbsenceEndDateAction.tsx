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
import { updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';

interface Props {
  memberId: string;
  currentAbsenceEndDate: string | null;
  onSaved: () => void | Promise<void>;
}

function toInputDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export const EditAbsenceEndDateAction: React.FC<Props> = ({
  memberId,
  currentAbsenceEndDate,
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const { showAuthModal } = useAuth();

  const handleOpen = () => {
    setDate(toInputDate(currentAbsenceEndDate));
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMemberStatus(memberId, 'absent', date);
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
      <Tooltip title="Modifier la date de fin d'absence">
        <IconButton size="small" onClick={handleOpen} sx={{ minWidth: 40, minHeight: 40 }}>
          <EditCalendarIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Modifier la date de fin d'absence</DialogTitle>
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
          <Button variant="contained" disabled={saving} onClick={save}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
