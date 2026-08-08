import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  count: number;
  onApply: (status: 'absent' | 'toDelete' | null) => void;
  onClear: () => void;
}

export const BulkActionsBar: React.FC<Props> = ({ count, onApply, onClear }) => {
  if (count === 0) return null;

  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        borderRadius: 1,
        backgroundColor: 'action.selected',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
        {count} membre{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CheckCircleOutlineIcon />}
        onClick={() => onApply(null)}
      >
        Actif
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PauseCircleOutlineIcon />}
        onClick={() => onApply('absent')}
      >
        En absence
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={<PersonRemoveIcon />}
        onClick={() => onApply('toDelete')}
      >
        À supprimer
      </Button>
      <Button size="small" startIcon={<CloseIcon />} onClick={onClear}>
        Annuler
      </Button>
    </Box>
  );
};
