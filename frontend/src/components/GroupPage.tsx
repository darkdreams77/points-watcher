import React, { useEffect, useState, useMemo } from 'react';
import type { Group, Member } from '../types';
import { fetchGroupMembers } from '../api';
import { getGroupColor } from '../groupColors';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box, Typography, Chip } from '@mui/material';

interface Props {
  group: Group;
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

function getStatus(member: Member): 'actif' | 'enDanger' {
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
  if (!member.lastChangeAt) return 'enDanger';

  const lastChange = new Date(member.lastChangeAt).getTime();
  const now = Date.now();

  return now - lastChange <= THREE_WEEKS_MS ? 'actif' : 'enDanger';
}

export const GroupPage: React.FC<Props> = ({ group }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = getGroupColor(group);

  useEffect(() => {
    setLoading(true);
    fetchGroupMembers(group.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [group.id]);

  const rows = members.map((m) => {
    const { id, lastChangeAt, lastScanAt, ...rest } = m;
    return {
      id,
      lastChangeAt: formatDate(lastChangeAt),
      lastScanAt: formatDateWithHours(lastScanAt),
      status: getStatus(m), // 'actif' | 'enDanger'
      ...rest,
    };
  });

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'username',
        headerName: 'Membre',
        flex: 1.5,
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
        flex: 0.7,
      },
      {
        field: 'status',
        headerName: 'Statut',
        flex: 0.8,
        sortable: false,
        renderCell: (params) => {
          const status = params.value as 'actif' | 'enDanger';
          const label = status === 'actif' ? 'Actif' : 'En danger';
          const bg = status === 'actif' ? '#4CAF50' : '#F44336';

          return (
            <span
              style={{
                backgroundColor: bg,
                color: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          );
        },
      },
      {
        field: 'lastChangeAt',
        headerName: 'Dernière incrémentation',
        flex: 1,
      },
      {
        field: 'lastScanAt',
        headerName: 'Dernier scan',
        flex: 1,
      },
    ],
    [accentColor]
  );

  const stats = useMemo(() => {
    let actifs = 0;
    let enDanger = 0;

    for (const m of members) {
      const status = getStatus(m);
      if (status === 'actif') actifs++;
      else enDanger++;
    }

    return { actifs, enDanger };
  }, [members]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
        />
      </div>
    </Box>
  );
};
