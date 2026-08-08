import React from 'react';
import { Box, Checkbox, Typography } from '@mui/material';
import { StatusMenu, type ManualStatus } from './StatusMenu';
import { EditDateAction } from './EditDateAction';
import { EditAbsenceEndDateAction } from './EditAbsenceEndDateAction';
import { StatusTag } from './StatusTag';
import { GroupTag } from './GroupTag';
import type { ComputedStatus } from '../helpers/status';

interface Props {
  username: string;
  profileUrl: string;
  usernameColor: string;
  groupName?: string;
  groupColor?: string;
  faceClaim?: string | null;
  lastPoints: number | null;
  status: ComputedStatus;
  statusColor: string;
  lastChangeAtDisplay: string;
  lastChangeAtRaw: string | null;
  lastScanAtDisplay?: string;
  manualStatus: ManualStatus;
  absenceEndDateDisplay?: string;
  absenceEndDateRaw?: string | null;
  isAuthenticated: boolean;
  memberId: string;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onStatusChange: (
    status: 'absent' | 'toDelete' | null,
    absenceEndDate?: string
  ) => void;
  onDateSaved: () => void | Promise<void>;
}

export const MemberCard: React.FC<Props> = ({
  username,
  profileUrl,
  usernameColor,
  groupName,
  groupColor,
  faceClaim,
  lastPoints,
  status,
  statusColor,
  lastChangeAtDisplay,
  lastChangeAtRaw,
  lastScanAtDisplay,
  manualStatus,
  absenceEndDateDisplay,
  absenceEndDateRaw,
  isAuthenticated,
  memberId,
  selected,
  onSelectChange,
  onStatusChange,
  onDateSaved,
}) => {
  const selectable = isAuthenticated && !!onSelectChange;

  return (
    <Box
      onClick={() => {
        if (selectable) onSelectChange!(!selected);
      }}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        cursor: selectable ? 'pointer' : 'default',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        {selectable && (
          <Checkbox
            size="small"
            checked={!!selected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onSelectChange!(e.target.checked)}
            sx={{ p: 0.5, mt: -0.5 }}
          />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="a"
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontWeight: 700,
              color: usernameColor,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            {username}
          </Typography>
          {faceClaim && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              {faceClaim}
            </Typography>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              mt: 0.5,
            }}
          >
            <StatusTag status={status} color={statusColor} />
            {groupName && groupColor && (
              <GroupTag name={groupName} color={groupColor} />
            )}
          </Box>
        </Box>

        <Typography
          variant="body2"
          sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {lastPoints ?? '-'} RPs
        </Typography>
      </Box>

      <Box
        sx={{
          pt: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
            }}
          >
            <Typography variant="caption" color="text.secondary" noWrap>
              RP : {lastChangeAtDisplay}
            </Typography>
            {isAuthenticated && (
              <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
                <EditDateAction
                  memberId={memberId}
                  currentLastChangeAt={lastChangeAtRaw}
                  onSaved={onDateSaved}
                />
              </Box>
            )}
          </Box>

          {isAuthenticated && (
            <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
              <StatusMenu status={manualStatus} onChange={onStatusChange} />
            </Box>
          )}
        </Box>

        {lastScanAtDisplay && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5 }}
          >
            Scan : {lastScanAtDisplay}
          </Typography>
        )}

        {manualStatus === 'absent' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              Retour prévu : {absenceEndDateDisplay ?? '-'}
            </Typography>
            {isAuthenticated && (
              <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
                <EditAbsenceEndDateAction
                  memberId={memberId}
                  currentAbsenceEndDate={absenceEndDateRaw ?? null}
                  onSaved={onDateSaved}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
