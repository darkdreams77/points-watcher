import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Group, Member } from '../types';
import { fetchGroupMembers, updateMemberStatus, UnauthorizedError } from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { computeStatus } from '../helpers/status';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { getStatusColors } from '../theme';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  group: Group;
}

export const GroupPage: React.FC<Props> = ({ group }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = getGroupColor(group);
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
    fetchGroupMembers(group.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [group.id]);

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

  const rows = members.map((m) => {
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

  const columns: GridColDef[] = useMemo(() => {
    const allColumns: GridColDef[] = [
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

          const label =
            status === 'actif'
              ? 'Actif·ve'
              : status === 'enDanger'
              ? 'En danger'
              : status === 'absent'
              ? 'Absent·e'
              : 'Inactif·ve';
          const config = { label, bg: colors[status as keyof typeof colors] };

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

          return <StatusMenu status={m.manualStatus} onChange={setStatus} compact={isMobile} />;
        },
      },
      {
        field: 'lastScanAt',
        headerName: 'Dernier scan',
        ...(isMobile ? { width: 160 } : { flex: 1 }),
      },
    ];
    return allColumns.filter((col) => isAuthenticated || col.field !== 'actions');
  }, [accentColor, isMobile, colors, isAuthenticated]);

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
          sx={{ backgroundColor: colors.actif, color: '#fff' }}
        />
        <Chip
          label={`${stats.absents} absent·e${stats.absents > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: colors.absent, color: '#fff' }}
        />
        <Chip
          label={`${stats.enDanger} en danger`}
          size="small"
          sx={{ backgroundColor: colors.enDanger, color: '#fff' }}
        />
      </Box>

      {isAuthenticated && (
        <BulkActionsBar
          count={selectionModel.ids.size}
          onApply={applyBulkStatus}
          onClear={() => setSelectionModel({ type: 'include', ids: new Set() })}
        />
      )}

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
              checkboxSelection={isAuthenticated}
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={setSelectionModel}
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
