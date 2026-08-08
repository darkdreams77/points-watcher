import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Group, Member } from '../types';
import {
  fetchGroupMembers,
  updateMemberStatus,
  UnauthorizedError,
} from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { computeStatus, type ComputedStatus } from '../helpers/status';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { MemberCard } from './MemberCard';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { getStatusColors } from '../theme';
import { getBadgeColors } from '../helpers/badgeStyle';
import { StatusTag } from './StatusTag';
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
  const groupBadge = getBadgeColors(accentColor, theme.palette.mode);
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
        if (e instanceof UnauthorizedError)
          showAuthModal(() => applyBulkStatus(status));
      }
    },
    [selectionModel, refreshMembers, showAuthModal]
  );

  const sortedMembers = [...members].sort((a, b) =>
    a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' })
  );

  const rows = sortedMembers.map((m) => {
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
        renderCell: (params) => {
          const row = params.row as Member;
          return (
            <Box
              sx={{
                lineHeight: 1.2,
                py: 0.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <a
                href={row.profileUrl}
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
              {row.faceClaim && (
                <Box sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {row.faceClaim}
                </Box>
              )}
            </Box>
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
          return <StatusTag status={status} color={colors[status]} />;
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
              if (e instanceof UnauthorizedError)
                showAuthModal(() => setStatus(status));
            }
          };

          return <StatusMenu status={m.manualStatus} onChange={setStatus} />;
        },
      },
      {
        field: 'lastScanAt',
        headerName: 'Dernier scan',
        ...(isMobile ? { width: 160 } : { flex: 1 }),
      },
    ];
    return allColumns.filter(
      (col) => isAuthenticated || col.field !== 'actions'
    );
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
            backgroundColor: groupBadge.bg,
            border: `1px solid ${groupBadge.border}`,
            color: groupBadge.text,
          }}
        />
        <StatusTag
          status="actif"
          color={colors.actif}
          label={`${stats.actifs} actif·s`}
        />
        <StatusTag
          status="absent"
          color={colors.absent}
          label={`${stats.absents} absent·e${stats.absents > 1 ? 's' : ''}`}
        />
        <StatusTag
          status="enDanger"
          color={colors.enDanger}
          label={`${stats.enDanger} en danger`}
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
          {rows.map((row) => (
            <MemberCard
              key={row.id}
              memberId={row.id}
              username={row.username}
              profileUrl={row.profileUrl}
              usernameColor={accentColor}
              faceClaim={row.faceClaim}
              lastPoints={row.lastPoints}
              status={row.status}
              statusColor={colors[row.status]}
              lastChangeAtDisplay={row.lastChangeAt}
              lastChangeAtRaw={row.lastChangeAtRaw}
              lastScanAtDisplay={row.lastScanAt}
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
                    showAuthModal(() =>
                      updateMemberStatus(row.id, status).then(refreshMembers)
                    );
                  }
                }
              }}
              onDateSaved={refreshMembers}
            />
          ))}
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
      )}
    </Box>
  );
};
