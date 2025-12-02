import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';
import type { MemberWithGroup, Group, Member } from '../types';
import { fetchAllMembers, updateMemberStatus } from '../api';
import { getGroupColor } from '../helpers/groupColors';
import { formatDateParis } from '../helpers/formatDate';
import { computeStatus } from '../helpers/status';

interface Props {
  groups: Group[];
  isMobile: boolean;
}

export const AllMembersPage: React.FC<Props> = ({ groups, isMobile }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

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
          const config =
            status === 'actif'
              ? { label: 'Actif·ve', bg: '#4CAF50' }
              : status === 'enDanger'
              ? { label: 'En danger', bg: '#F44336' }
              : { label: 'Absent·e', bg: '#636363' };

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
        headerName: 'Déclarer absent·e',
        sortable: false,
        ...(isMobile ? { width: 100 } : { flex: 0.8 }),
        renderCell: (params) => {
          const m = params.row as Member;
          const isAbsent = m.manualStatus === 'absent';

          const handleClick = async () => {
            const newStatus = isAbsent ? null : 'absent';
            await updateMemberStatus(m.id, newStatus);
            await refreshMembers(); // <-- ici
          };

          return (
            <button
              style={{
                padding: '8px 12px',
                lineHeight: 1,
                borderRadius: 4,
                background: isAbsent ? '#506845' : '#2c2b2b',
                cursor: 'pointer',
                border: 'none',
                fontSize: '14px',
              }}
              onClick={handleClick}
            >
              {isAbsent ? 'Réactiver' : 'Absent·e ?'}
            </button>
          );
        },
      },
    ],
    [groups]
  );

  const rows = members.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDateParis(lastChangeAt),
      status: computeStatus(m),
      ...rest,
    };
  });

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
          sx={{ backgroundColor: '#4CAF50', color: '#fff' }}
        />
        <Chip
          label={`${stats.absents} absent·e·s`}
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
              key="all-members"
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
              showToolbar
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
