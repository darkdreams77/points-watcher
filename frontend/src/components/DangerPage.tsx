// src/DangerPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from '@mui/x-data-grid';
import type { Group, Member } from '../types';
import {
  fetchGroupMembers,
  updateMemberStatus,
  UnauthorizedError,
} from '../api';
import { useAuth } from '../auth-context';
import { getGroupColor } from '../helpers/groupColors';
import { computeStatus, type ComputedStatus } from '../helpers/status';
import { StatusMenu } from './StatusMenu';
import { BulkActionsBar } from './BulkActionsBar';
import { EditDateAction } from './EditDateAction';
import { CopyDangerCodeAction } from './CopyDangerCodeAction';
import { buildDangerCopyText } from '../helpers/dangerCopyText';
import { MemberCard } from './MemberCard';
import { formatDateParis, formatDateWithHours } from '../helpers/formatDate';
import { getStatusColors } from '../theme';
import { StatusTag } from './StatusTag';
import { GroupTag } from './GroupTag';
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
  const { showAuthModal, isAuthenticated } = useAuth();
  const theme = useTheme();
  const colors = getStatusColors(theme.palette.mode);
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
              }) as MemberWithGroup
          );
        })
      );

      const flat = results.flat();

      // On ne garde que les membres en danger
      const dangerOnly = flat.filter((m) => computeStatus(m) === 'enDanger');

      setMembers(dangerOnly);
    } finally {
      setLoading(false);
    }
  }, [groups]);

  const applyBulkStatus = useCallback(
    async (status: 'absent' | 'toDelete' | null) => {
      const ids = Array.from(selectionModel.ids) as string[];
      try {
        await Promise.all(ids.map((id) => updateMemberStatus(id, status)));
        setSelectionModel({ type: 'include', ids: new Set() });
        await refresh();
      } catch (e) {
        if (e instanceof UnauthorizedError)
          showAuthModal(() => applyBulkStatus(status));
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
          const color = group ? getGroupColor(group) : '#1976d2';

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
                  color,
                  fontWeight: 500,
                }}
              >
                {params.value}
              </a>
              {row.faceClaim && (
                <Box
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                  }}
                >
                  {row.faceClaim}
                </Box>
              )}
            </Box>
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

          return <GroupTag name={group.name} color={color} />;
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
                  onSaved={refresh}
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
              await refresh();
            } catch (e) {
              if (e instanceof UnauthorizedError)
                showAuthModal(() => setStatus(status));
            }
          };

          return <StatusMenu status={m.manualStatus} onChange={setStatus} />;
        },
      },
    ];
    return allColumns.filter(
      (col) => isAuthenticated || col.field !== 'actions'
    );
  }, [groups, isMobile, colors, isAuthenticated]);

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
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Membres en danger
        </Typography>
        <StatusTag
          status="enDanger"
          color={colors.enDanger}
          label={`${rows.length} membre${rows.length > 1 ? 's' : ''}`}
        />
        {rows.length > 0 && (
          <CopyDangerCodeAction
            label="Copier la liste"
            text={rows
              .map((row) =>
                buildDangerCopyText(
                  row.username,
                  row.faceClaim,
                  row.lastPoints,
                  row.lastChangeAt
                )
              )
              .join('\n')}
          />
        )}
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
                usernameColor={group ? getGroupColor(group) : '#1976d2'}
                groupName={group?.name}
                groupColor={group ? getGroupColor(group) : undefined}
                faceClaim={row.faceClaim}
                lastPoints={row.lastPoints}
                status={row.status}
                statusColor={colors[row.status]}
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
                    await refresh();
                  } catch (e) {
                    if (e instanceof UnauthorizedError) {
                      showAuthModal(() =>
                        updateMemberStatus(row.id, status).then(refresh)
                      );
                    }
                  }
                }}
                onDateSaved={refresh}
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
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
