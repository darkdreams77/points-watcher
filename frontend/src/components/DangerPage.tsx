// src/DangerPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import type { Group, Member } from '../types';
import { fetchGroupMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { computeStatus } from '../helpers/status';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { useIsMobile } from '../hooks/useIsMobile';

interface MemberWithGroup extends Member {
  groupId: string;
}

interface Props {
  groups: Group[];
}

export const DangerPage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { showAuthModal } = useAuth();
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

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

      // On ne garde que les membres en danger
      const dangerOnly = flat.filter((m) => computeStatus(m) === 'enDanger');

      setMembers(dangerOnly);
    } catch (e) {
      if (e instanceof UnauthorizedError) showAuthModal(refresh);
    } finally {
      setLoading(false);
    }
  }, [groups, showAuthModal]);

  const applyBulkStatus = useCallback(
    async (status: 'absent' | 'toDelete' | null) => {
      const ids = Array.from(selectionModel.ids) as string[];
      try {
        await Promise.all(ids.map((id) => updateMemberStatus(id, status)));
        setSelectionModel({ type: 'include', ids: new Set() });
        await refresh();
      } catch (e) {
        if (e instanceof UnauthorizedError) showAuthModal(() => applyBulkStatus(status));
      }
    },
    [selectionModel, refresh, showAuthModal]
  );

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
          const color = group ? getGroupColor(group) : '#1976d2';

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
          const m = params.row as Member & { lastChangeAtRaw: string | null };

          const setStatus = async (status: 'absent' | 'toDelete' | null) => {
            try {
              await updateMemberStatus(m.id, status);
              await refresh();
            } catch (e) {
              if (e instanceof UnauthorizedError) showAuthModal(() => setStatus(status));
            }
          };

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StatusMenu status={m.manualStatus} onChange={setStatus} />
              <EditDateAction
                memberId={m.id}
                currentLastChangeAt={m.lastChangeAtRaw}
                onSaved={refresh}
              />
            </Box>
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
      lastChangeAtRaw: lastChangeAt,
      lastScanAt: formatDateWithHours(lastScanAt),
      status: computeStatus(m),
      ...rest,
    };
  });

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Membres en danger
        </Typography>
        <Chip
          label={`${rows.length} membre${rows.length > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: '#F44336', color: '#fff' }}
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
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
