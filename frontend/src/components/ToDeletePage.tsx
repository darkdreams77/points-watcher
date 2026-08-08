// src/ToDeletePage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Group, Member } from '../types';
import { fetchGroupMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { computeStatus } from '../helpers/status';
import { useIsMobile } from '../hooks/useIsMobile';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';

interface MemberWithGroup extends Member {
  groupId: string;
}

interface Props {
  groups: Group[];
}

export const ToDeletePage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { showAuthModal } = useAuth();

  const refresh = useCallback(async () => {
    if (!groups.length) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        groups.map(async (g) => {
          const ms = await fetchGroupMembers(g.id);
          return ms.map(
            (m) =>
              ({
                ...m,
                groupId: g.id,
              } as MemberWithGroup)
          );
        })
      );

      const flat = results.flat();

      // On ne garde que ceux marqués "toDelete"
      const toDeleteOnly = flat.filter((m) => m.manualStatus === 'toDelete');

      setMembers(toDeleteOnly);
    } catch (e) {
      if (e instanceof UnauthorizedError) showAuthModal(refresh);
    } finally {
      setLoading(false);
    }
  }, [groups, showAuthModal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.username.localeCompare(b.username, 'fr', {
          sensitivity: 'base',
        })
      ),
    [members]
  );

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'username',
        headerName: 'Membre',
        ...(isMobile ? { width: 150 } : { flex: 1.5 }),
        sortable: true,
        sortComparator: (a, b) =>
          (a as string).localeCompare(b as string, 'fr', {
            sensitivity: 'base',
          }),
        renderCell: (params) => {
          const row = params.row as MemberWithGroup;
          const group = groups.find((g) => g.id === row.groupId);
          const color = group ? getGroupColor(group) : '#000000';

          return (
            <a
              href={row.profileUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                color,
                fontWeight: 500,
              }}
            >
              {params.value}
            </a>
          );
        },
      },
      {
        field: 'groupName',
        headerName: 'Groupe',
        ...(isMobile ? { width: 150 } : { flex: 1 }),
        sortable: true,
        renderCell: (params) => {
          const row = params.row as MemberWithGroup;
          const group = groups.find((g) => g.id === row.groupId);
          if (!group) return <span>-</span>;
          const color = getGroupColor(group);

          return (
            <Chip
              label={group.name}
              size="small"
              sx={{
                backgroundColor: color,
                color: '#fff',
                height: 24,
              }}
            />
          );
        },
      },
      {
        field: 'lastPoints',
        headerName: 'RPs',
        type: 'number',
        ...(isMobile ? { width: 100 } : { flex: 0.7 }),
      },
      {
        field: 'status',
        headerName: 'Statut',
        ...(isMobile ? { width: 120 } : { flex: 0.8 }),
        sortable: false,
        renderCell: (params) => {
          const status = params.value as
            | 'actif'
            | 'enDanger'
            | 'absent'
            | 'toDelete';

          const config =
            status === 'actif'
              ? { label: 'Actif·ve', bg: '#4CAF50' }
              : status === 'enDanger'
              ? { label: 'En danger', bg: '#F44336' }
              : status === 'absent'
              ? { label: 'Absent·e', bg: '#9E9E9E' }
              : { label: 'Inactif·ve', bg: '#000000' };

          return (
            <span
              style={{
                backgroundColor: config.bg,
                color: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {config.label}
            </span>
          );
        },
      },
      {
        field: 'lastChangeAt',
        headerName: 'Date du dernier RP',
        ...(isMobile ? { width: 120 } : { flex: 1 }),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        ...(isMobile ? { width: 100 } : { flex: 0.8 }),
        renderCell: (params) => {
          const m = params.row as Member;
          const isAbsent = m.manualStatus === 'absent';
          const isToDelete = m.manualStatus === 'toDelete';

          const setStatus = async (status: 'absent' | 'toDelete' | null) => {
            try {
              await updateMemberStatus(m.id, status);
              await refresh();
            } catch (e) {
              if (e instanceof UnauthorizedError) showAuthModal(() => setStatus(status));
            }
          };

          return (
            <div
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                height: '100%',
              }}
            >
              <button
                onClick={() => setStatus(isAbsent ? null : 'absent')}
                style={{
                  padding: '8px 12px',
                  lineHeight: 1,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  background: isAbsent ? '#506845' : '#2c2b2b',
                }}
                title={isAbsent ? 'Réactiver' : 'Mettre en absent·e'}
              >
                {isAbsent ? (
                  <PlayCircleOutlinedIcon />
                ) : (
                  <PauseCircleOutlineIcon />
                )}
              </button>
              {!isToDelete && (
                <button
                  onClick={() => setStatus(isToDelete ? null : 'toDelete')}
                  style={{
                    padding: '8px 12px',
                    lineHeight: 1,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    background: isToDelete ? '#362d2d' : '#00000015',
                    color: isToDelete ? '#fff' : 'inherit',
                  }}
                  title="Membre à supprimer"
                >
                  <PersonRemoveIcon />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [groups]
  );

  const rows = sorted.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDateParis(lastChangeAt),
      lastScanAt: formatDateWithHours(lastScanAt),
      status: computeStatus(m),
      ...rest,
    };
  });

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Membres à supprimer
        </Typography>
        <Chip
          label={`${rows.length} membre${rows.length > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: '#000000', color: '#fff' }}
        />
      </Box>

      <Box
        sx={{
          width: '100%',
          height: isMobile ? 'auto' : 'calc(100vh - 200px)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          <Box
            sx={{
              minWidth: '100%',
              height: '100%',
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              sortingOrder={['asc', 'desc']}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'username', sort: 'asc' }],
                },
              }}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
