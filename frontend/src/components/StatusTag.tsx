import React from 'react';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ComputedStatus } from '../helpers/status';
import { getBadgeColors } from '../helpers/badgeStyle';

const LABELS: Record<ComputedStatus, string> = {
  actif: 'Actif·ve',
  enDanger: 'En danger',
  absent: 'Absent·e',
  toDelete: 'Inactif·ve',
};

const ICONS: Record<ComputedStatus, React.ReactNode> = {
  actif: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  absent: <PauseCircleOutlineIcon sx={{ fontSize: 14 }} />,
  enDanger: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  toDelete: <PersonRemoveIcon sx={{ fontSize: 14 }} />,
};

interface Props {
  status: ComputedStatus;
  color: string;
  label?: string;
}

export const StatusTag: React.FC<Props> = ({ status, color, label }) => {
  const theme = useTheme();
  const { bg, border, text } = getBadgeColors(color, theme.palette.mode);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 999,
        padding: '2px 10px 2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {ICONS[status]}
      {label ?? LABELS[status]}
    </span>
  );
};
