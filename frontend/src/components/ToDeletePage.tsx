import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { Group, Member } from '../types';
import { fetchGroupMembers } from '../api';
import { getGroupColor } from '../helpers/groupColors';
import { formatDateParis } from '../helpers/formatDate';

interface MemberWithGroup extends Member {
  groupId: string;
}

interface Props {
  groups: Group[];
}

export const ToDeletePage: React.FC<Props> = ({ groups }) => {
  const [members, setMembers] = useState<MemberWithGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

      // Ici on ne prend que ceux avec manualStatus === "toDelete"
      const toDeleteOnly = flat.filter((m) => m.manualStatus === 'toDelete');

      setMembers(toDeleteOnly);
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
    return <Box sx={{ p: 2 }}>Chargement des membres à supprimer…</Box>;
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Membres à supprimer
        </Typography>
        <Chip
          label={`${sorted.length} membre${sorted.length > 1 ? 's' : ''}`}
          size="small"
          sx={{ backgroundColor: '#000', color: '#fff' }}
        />
      </Box>

      {sorted.length === 0 ? (
        <Typography variant="body2">
          Aucun membre marqué “à supprimer” pour le moment.
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
                  {group && (
                    <Chip
                      label={group.name}
                      size="small"
                      sx={{
                        backgroundColor: color,
                        color: '#fff',
                        height: 20,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Dernier RP : {formatDateParis(m.lastChangeAt ?? null)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
