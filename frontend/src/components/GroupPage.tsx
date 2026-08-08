import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Group, Member } from '../types';
import { fetchGroupMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import { computeStatus } from '../helpers/status';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  group: Group;
}

export const GroupPage: React.FC<Props> = ({ group }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = getGroupColor(group);
  const isMobile = useIsMobile();
  const { showAuthModal } = useAuth();

  // 1) Fonction de refresh factorisée
  const refreshMembers = useCallback(() => {
    setLoading(true);
    fetchGroupMembers(group.id)
      .then(setMembers)
      .catch((e) => {
        if (e instanceof UnauthorizedError) showAuthModal(refreshMembers);
      })
      .finally(() => setLoading(false));
  }, [group.id, showAuthModal]);

  // 2) Chargement initial + quand le groupe change
  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const rows = members.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDateParis(lastChangeAt),
      lastScanAt: formatDateWithHours(lastScanAt),
      status: computeStatus(m),
      ...rest,
    };
  });

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'username',
        headerName: 'Membre',
        ...(isMobile ? { width: 150 } : { flex: 1.5 }),
        sortable: true,
        renderCell: (params) => (
          <a
            href={params.row.profileUrl as string}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              color: accentColor,
              fontWeight: 700,
            }}
          >
            {params.value}
          </a>
        ),
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
          const status = params.value;

          const config =
            status === 'actif'
              ? { label: 'Actif·ve', bg: '#4CAF50' }
              : status === 'enDanger'
              ? { label: 'En danger', bg: '#F44336' }
              : status === 'absent'
              ? { label: 'Absent·e', bg: '#636363' }
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
              await refreshMembers();
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
      {
        field: 'lastScanAt',
        headerName: 'Dernier scan',
        ...(isMobile ? { width: 160 } : { flex: 1 }),
      },
    ],
    [accentColor]
  );

  const stats = useMemo(() => {
    let actifs = 0;
    let absents = 0;
    let enDanger = 0;

    for (const m of members) {
      const status = computeStatus(m);
      if (status === 'actif') actifs++;
      else if (status === 'absent') absents++;
      else enDanger++;
    }

    return { actifs, absents, enDanger };
  }, [members]);

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, flex: '1 1 100%' }}>
          {group.name}
        </Typography>
        <Chip
          label={`${members.length} membre${members.length > 1 ? 's' : ''}`}
          size="small"
          sx={{
            backgroundColor: accentColor,
            color: '#fff',
          }}
        />
        <Chip
          label={`${stats.actifs} actif·s`}
          size="small"
          sx={{ backgroundColor: '#4CAF50', color: '#fff' }}
        />
        <Chip
          label={`${stats.absents} absent·e${stats.absents > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: '#636363', color: '#fff' }}
        />
        <Chip
          label={`${stats.enDanger} en danger`}
          size="small"
          sx={{ backgroundColor: '#F44336', color: '#fff' }}
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
              initialState={{
                sorting: {
                  sortModel: [{ field: 'username', sort: 'asc' }],
                },
              }}
              hideFooterPagination
              hideFooter
              showToolbar
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
