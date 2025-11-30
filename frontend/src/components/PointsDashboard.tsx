import React, { useEffect, useState } from 'react';
import { DataGrid, type GridRowsProp, type GridColDef } from '@mui/x-data-grid';
import type { Group, Member } from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'https://points-watcher.onrender.com';


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

export const PointsDashboard: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/groups`)
      .then((r) => r.json())
      .then((data: Group[]) => {
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(data[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;

    setLoading(true);
    fetch(`${API_BASE}/groups/${selectedGroupId}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => setMembers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedGroupId]);

  const columns: GridColDef[] = [
    { field: 'members', headerName: 'Membres', width: 200 },
    { field: 'points', headerName: 'RPs', width: 100 },
    { field: 'lastChangeAt', headerName: 'Dernière incrémentation', width: 200 },
    { field: 'lastScanAt', headerName: 'Dernier scan', width: 200 },
  ];

  const rows: GridRowsProp = members.map((m) => ({
    id: m.id,
    members: m.username,
    points: m.lastPoints ?? '-',
    lastChangeAt: formatDate(m.lastChangeAt),
    lastScanAt: formatDateWithHours(m.lastScanAt),
  }));

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', margin: '0 auto', maxWidth: '800px' }}>
      <header style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Suivi des RPs / points ILH</h1>

        <select
          value={selectedGroupId ?? ''}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          style={{ padding: '0.3rem 0.6rem' }}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </header>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <DataGrid 
          columns={columns} 
          rows={rows} 
          hideFooterPagination 
          disableRowSelectionOnClick 
          initialState={{
            sorting: {
              sortModel: [{ field: 'members', sort: 'asc' }],
            },
          }} 
        />
      )}
    </div>
  );
};
