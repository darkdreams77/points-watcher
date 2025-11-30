import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Group, Member } from '../types';
import { API_BASE, fetchGroupMembers, updateMemberStatus } from '../api';
import { getGroupColor } from '../groupColors';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';

interface Props {
  group: Group;
  isMobile: boolean;
}

function formatDateWithHours(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeStatus(member: Member): 'actif' | 'enDanger' | 'absent' {
  if (member.manualStatus === 'absent') return 'absent';

  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
  if (!member.lastChangeAt) return 'enDanger';

  const lastChange = new Date(member.lastChangeAt).getTime();
  const now = Date.now();

  return now - lastChange <= THREE_WEEKS_MS ? 'actif' : 'enDanger';
}

export const GroupPage: React.FC<Props> = ({ group, isMobile }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = getGroupColor(group);

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

  const rows = members.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDate(lastChangeAt),
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
                background: isAbsent ? '#999' : '#00000015',
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

      <div style={{ width: '100%' }}>
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
      </div>
    </Box>
  );
};
