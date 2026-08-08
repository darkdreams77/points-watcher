import React from 'react';
import { Box, Checkbox, Typography } from '@mui/material';
import { StatusMenu, type ManualStatus } from './StatusMenu';
import { EditDateAction } from './EditDateAction';

interface Props {
  username: string;
  profileUrl: string;
  usernameColor: string;
  groupName?: string;
  groupColor?: string;
  lastPoints: number | null;
  statusColor: string;
  statusLabel: string;
  lastChangeAtDisplay: string;
  lastChangeAtRaw: string | null;
  lastScanAtDisplay?: string;
  manualStatus: ManualStatus;
  isAuthenticated: boolean;
  memberId: string;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onStatusChange: (status: 'absent' | 'toDelete' | null) => void;
  onDateSaved: () => void | Promise<void>;
}

export const MemberCard: React.FC<Props> = ({
  username,
  profileUrl,
  usernameColor,
  groupName,
  groupColor,
  lastPoints,
  statusColor,
  statusLabel,
  lastChangeAtDisplay,
  lastChangeAtRaw,
  lastScanAtDisplay,
  manualStatus,
  isAuthenticated,
  memberId,
  selected,
  onSelectChange,
  onStatusChange,
  onDateSaved,
}) => {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        {isAuthenticated && onSelectChange && (
          <Checkbox
            size="small"
            checked={!!selected}
            onChange={(e) => onSelectChange(e.target.checked)}
            sx={{ p: 0.5, mt: -0.5 }}
          />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              component="a"
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              sx={{
                fontWeight: 700,
                color: usernameColor,
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              {username}
            </Typography>
            <span
              style={{
                backgroundColor: statusColor,
                color: '#fff',
                borderRadius: 999,
                padding: '1px 8px',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              {statusLabel}
            </span>
          </Box>

          {groupName && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                backgroundColor: groupColor,
                color: '#fff',
                borderRadius: 999,
                padding: '1px 8px',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              {groupName}
            </span>
          )}
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {lastPoints ?? '-'} RPs
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          pt: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            RP : {lastChangeAtDisplay}
          </Typography>
          {isAuthenticated && (
            <EditDateAction
              memberId={memberId}
              currentLastChangeAt={lastChangeAtRaw}
              onSaved={onDateSaved}
            />
          )}
        </Box>

        {lastScanAtDisplay && (
          <Typography variant="caption" color="text.secondary">
            Scan : {lastScanAtDisplay}
          </Typography>
        )}

        {isAuthenticated && (
          <StatusMenu status={manualStatus} onChange={onStatusChange} compact />
        )}
      </Box>
    </Box>
  );
};
