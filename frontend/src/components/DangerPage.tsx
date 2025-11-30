import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { Group, Member } from '../types';
import { fetchGroupMembers } from '../api';
import { getGroupColor } from '../helpers/groupColors';
import { computeStatus } from '../helpers/status';

interface DangerMember extends Member {
  groupId: string;
}

interface Props {
  groups: Group[];
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const DangerPage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<DangerMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        groups.map(async (g) => {
          const ms = await fetchGroupMembers(g.id);
          return ms.map((m) => ({ ...m, groupId: g.id } as DangerMember));
        })
      );

      const flat = results.flat();

      const dangerOnly = flat.filter((m) => computeStatus(m) === 'enDanger');

      setMembers(dangerOnly);
    } finally {
      setLoading(false);
    }
  }, [groups]);

  useEffect(() => {
    if (!groups.length) return;
    refresh();
  }, [groups, refresh]);

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' })
      ),
    [members]
  );

  if (loading) {
    return <Box sx={{ p: 2 }}>Chargement des membres en danger…</Box>;
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Membres en danger
        </Typography>
        <Chip
          label={`${sorted.length} membre${sorted.length > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: '#F44336', color: '#fff' }}
        />
      </Box>

      {sorted.length === 0 ? (
        <Typography variant="body2">
          Aucun membre en danger pour le moment.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sorted.map((m) => {
            const group = groups.find((g) => g.id === m.groupId);
            const color = group ? getGroupColor(group) : '#666';

            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  p: 1,
                  borderRadius: 1,
                  border: '1px solid #2c2c2c',
                  gap: 0.3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <a
                    href={m.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color,
                      fontWeight: 600,
                    }}
                  >
                    {m.username}
                  </a>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Dernier RP : {formatDate(m.lastChangeAt)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
