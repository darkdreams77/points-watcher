import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { MemberWithGroup, Group, Member } from '../types';
import { fetchAllMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { formatDateParis } from '../helpers/formatDate';
import { computeStatus } from '../helpers/status';
import { getStatusColors } from '../theme';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  groups: Group[];
}

export const AllMembersPage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { showAuthModal } = useAuth();
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
          const row = params.row as MemberWithGroup;
          const status = computeStatus(row);
          const label =
            status === 'actif'
              ? 'Actif·ve'
              : status === 'enDanger'
              ? 'En danger'
              : status === 'absent'
              ? 'Absent·e'
              : 'Inactif·ve';
          const config = { label, bg: colors[status] };

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
        ...(isMobile ? { width: 120 } : { flex: 0.8 }),
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

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StatusMenu status={m.manualStatus} onChange={setStatus} compact={isMobile} />
              <EditDateAction
                memberId={m.id}
                currentLastChangeAt={m.lastChangeAtRaw}
                onSaved={refreshMembers}
              />
            </Box>
          );
        },
      },
    ],
    [groups, isMobile, colors]
  );

  const rows = members.map((m) => {
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

      <BulkActionsBar
        count={selectionModel.ids.size}
        onApply={applyBulkStatus}
        onClear={() => setSelectionModel({ type: 'include', ids: new Set() })}
      />

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
              key="all-members"
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              checkboxSelection
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
    </Box>
  );
};
