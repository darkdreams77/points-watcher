import React from 'react';
import { getBadgeColors } from '../helpers/badgeStyle';

interface Props {
  name: string;
  color: string;
}

export const GroupTag: React.FC<Props> = ({ name, color }) => {
  const { bg, border, text } = getBadgeColors(color);

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
