import React, { useEffect, useState } from 'react';
import type { Group, Member } from '../types';

const API_BASE = 'http://localhost:4000';

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
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>
                Membre
              </th>
              <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>
                RPs / points
              </th>
              <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>
                Dernière incrémentation
              </th>
              <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>
                Dernier scan
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, index) => (
              <tr
                key={m.id}
                style={{
                  backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  <a href={m.profileUrl} target="_blank" rel="noreferrer">
                    {m.username}
                  </a>
                </td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '0.5rem',
                    textAlign: 'right',
                  }}
                >
                  {m.lastPoints ?? '-'}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  {formatDate(m.lastChangeAt)}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  {formatDateWithHours(m.lastScanAt)}
                </td>
              </tr>
            ))}

            {members.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: '0.8rem', textAlign: 'center', color: '#666' }}>
                  Aucun membre à afficher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
