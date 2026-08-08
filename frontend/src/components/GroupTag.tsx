import React from 'react';
import { useTheme } from '@mui/material/styles';
import { getBadgeColors } from '../helpers/badgeStyle';

interface Props {
  name: string;
  color: string;
}

export const GroupTag: React.FC<Props> = ({ name, color }) => {
  const theme = useTheme();
  const { bg, border, text } = getBadgeColors(color, theme.palette.mode);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 999,
        padding: '1px 7px',
        fontSize: '0.65rem',
        fontWeight: 600,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  );
};
