import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { MemberWithGroup, Group, Member } from '../types';
import { fetchAllMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { formatDateParis } from '../helpers/formatDate';
import { computeStatus, type ComputedStatus } from '../helpers/status';
import { getStatusColors } from '../theme';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { MemberCard } from './MemberCard';
import { useIsMobile } from '../hooks/useIsMobile';

function statusLabel(status: ComputedStatus): string {
  return status === 'actif'
    ? 'Actif·ve'
    : status === 'enDanger'
    ? 'En danger'
    : status === 'absent'
    ? 'Absent·e'
    : 'Inactif·ve';
}

interface Props {
  groups: Group[];
}

export const AllMembersPage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { showAuthModal, isAuthenticated } = useAuth();
  const theme = useTheme();
  const colors = getStatusColors(theme.palette.mode);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  // 1) Fonction de refresh factorisée
  const refreshMembers = useCallback(() => {
    setLoading(true);
    fetchAllMembers()
      .then(setMembers)
      .finally(() => setLoading(false));
  }, []);

  // 2) Chargement initial + quand le groupe change
  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const applyBulkStatus = useCallback(
    async (status: 'absent' | 'toDelete' | null) => {
      const ids = Array.from(selectionModel.ids) as string[];
      try {
        await Promise.all(ids.map((id) => updateMemberStatus(id, status)));
        setSelectionModel({ type: 'include', ids: new Set() });
        await refreshMembers();
      } catch (e) {
        if (e instanceof UnauthorizedError) showAuthModal(() => applyBulkStatus(status));
      }
    },
    [selectionModel, refreshMembers, showAuthModal]
  );

  const columns: GridColDef[] = useMemo(() => {
    const allColumns: GridColDef[] = [
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
                fontWeight: 700,
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
          const status = params.value as ComputedStatus;
          const config = { label: statusLabel(status), bg: colors[status] };

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
        ...(isMobile ? { width: 150 } : { flex: 1 }),
        renderCell: (params) => {
          const m = params.row as Member & { lastChangeAtRaw: string | null };
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>{params.value as string}</span>
              {isAuthenticated && (
                <EditDateAction
                  memberId={m.id}
                  currentLastChangeAt={m.lastChangeAtRaw}
                  onSaved={refreshMembers}
                />
              )}
            </Box>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        ...(isMobile ? { width: 80 } : { flex: 0.6 }),
        renderCell: (params) => {
          const m = params.row as Member & { lastChangeAtRaw: string | null };

          const setStatus = async (status: 'absent' | 'toDelete' | null) => {
            try {
              await updateMemberStatus(m.id, status);
              await refreshMembers();
            } catch (e) {
              if (e instanceof UnauthorizedError) showAuthModal(() => setStatus(status));
            }
          };

          return <StatusMenu status={m.manualStatus} onChange={setStatus} />;
        },
      },
    ];
    return allColumns.filter((col) => isAuthenticated || col.field !== 'actions');
  }, [groups, isMobile, colors, isAuthenticated]);

  const sortedMembers = [...members].sort((a, b) =>
    a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' })
  );

  const rows = sortedMembers.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDateParis(lastChangeAt),
      lastChangeAtRaw: lastChangeAt,
      status: computeStatus(m),
      ...rest,
    };
  });

  const stats = useMemo(() => {
    let actifs = 0;
    let absents = 0;
    let enDanger = 0;
    let inactifs = 0;

    for (const m of members) {
      const status = computeStatus(m);
      if (status === 'actif') actifs++;
      else if (status === 'absent') absents++;
      else if (status === 'toDelete') inactifs++;
      else enDanger++;
    }

    return { actifs, absents, enDanger, inactifs };
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
          Tous les membres
        </Typography>
        <Chip
          label={`${rows.length} membres`}
          size="small"
          sx={{ backgroundColor: '#343434', color: '#fff' }}
        />
        <Chip
          label={`${stats.actifs} actif·ve·s`}
          size="small"
          sx={{ backgroundColor: colors.actif, color: '#fff' }}
        />
        <Chip
          label={`${stats.absents} absent·e·s`}
          size="small"
          sx={{ backgroundColor: colors.absent, color: '#fff' }}
        />
        <Chip
          label={`${stats.enDanger} en danger`}
          size="small"
          sx={{ backgroundColor: colors.enDanger, color: '#fff' }}
        />
        <Chip
          label={`${stats.inactifs} à supprimer`}
          size="small"
          sx={{ backgroundColor: colors.toDelete, color: '#fff' }}
        />
      </Box>

      {isAuthenticated && (
        <BulkActionsBar
          count={selectionModel.ids.size}
          onApply={applyBulkStatus}
          onClear={() => setSelectionModel({ type: 'include', ids: new Set() })}
        />
      )}

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map((row) => {
            const group = groups.find((g) => g.id === row.groupId);
            return (
              <MemberCard
                key={row.id}
                memberId={row.id}
                username={row.username}
                profileUrl={row.profileUrl}
                usernameColor={group ? getGroupColor(group) : '#000000'}
                groupName={group?.name}
                groupColor={group ? getGroupColor(group) : undefined}
                lastPoints={row.lastPoints}
                statusColor={colors[row.status]}
                statusLabel={statusLabel(row.status)}
                lastChangeAtDisplay={row.lastChangeAt}
                lastChangeAtRaw={row.lastChangeAtRaw}
                manualStatus={row.manualStatus}
                isAuthenticated={isAuthenticated}
                selected={selectionModel.ids.has(row.id)}
                onSelectChange={(checked) => {
                  setSelectionModel((prev) => {
                    const ids = new Set(prev.ids);
                    if (checked) ids.add(row.id);
                    else ids.delete(row.id);
                    return { type: 'include', ids };
                  });
                }}
                onStatusChange={async (status) => {
                  try {
                    await updateMemberStatus(row.id, status);
                    await refreshMembers();
                  } catch (e) {
                    if (e instanceof UnauthorizedError) {
                      showAuthModal(() => updateMemberStatus(row.id, status).then(refreshMembers));
                    }
                  }
                }}
                onDateSaved={refreshMembers}
              />
            );
          })}
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: 'calc(100vh - 200px)',
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
                key="all-members"
                rows={rows}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                checkboxSelection={isAuthenticated}
                rowSelectionModel={selectionModel}
                onRowSelectionModelChange={setSelectionModel}
                sortingOrder={['asc', 'desc']}
                initialState={{
                  sorting: {
                    sortModel: [{ field: 'username', sort: 'asc' }],
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                showToolbar
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
