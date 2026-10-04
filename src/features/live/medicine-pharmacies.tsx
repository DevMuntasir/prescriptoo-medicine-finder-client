'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { api, json } from '@/lib/api';

type Shop = { id: string; name_en: string; address_en: string; archived_at?: string };
type Mapping = {
  id: string;
  medicine_id: string;
  pharmacy_id: string;
  active: boolean;
  revision: number;
  stock_status: string | null;
};

export function MedicinePharmacies({
  medicineId,
  medicineName,
  onClose,
  onSaved,
}: {
  medicineId: string;
  medicineName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const all: Shop[] = [];
      for (;;) {
        const page = await api<{ items: Shop[]; total: number }>(
          `admin/pharmacies?limit=100&offset=${all.length}`,
        );
        if (!active) return;
        all.push(...page.items);
        if (!page.items.length || all.length >= page.total) break;
      }
      const links = await api<Mapping[]>('admin/mappings');
      if (!active) return;
      setShops(all.filter((shop) => !shop.archived_at));
      setMappings(links.filter((link) => link.medicine_id === medicineId));
    }
    void load()
      .catch((e: Error) => {
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [medicineId, retry]);

  async function save() {
    if (saving.current || loading || loadError || !selected.length) return;
    saving.current = true;
    setBusy(true);
    setError('');
    let completed = 0;
    try {
      for (const pharmacyId of selected) {
        // Refresh before each write, including retries after a partial save or stale revision.
        const links = await api<Mapping[]>('admin/mappings');
        const current = links.find(
          (m) => m.medicine_id === medicineId && m.pharmacy_id === pharmacyId,
        );
        const saved = current?.active
          ? current
          : await api<Mapping>(`admin/mappings${current ? `/${current.id}` : ''}`, {
              method: current ? 'PATCH' : 'POST',
              body: json({
                medicineId,
                pharmacyId,
                active: true,
                stockStatus: current?.stock_status ?? null,
                ...(current ? { revision: current.revision } : {}),
              }),
            });
        setMappings((previous) => [...previous.filter((m) => m.pharmacy_id !== pharmacyId), saved]);
        setSelected((previous) => previous.filter((id) => id !== pharmacyId));
        completed++;
      }
      onSaved();
    } catch (e) {
      setError(
        `${completed ? `${completed} pharmacy location(s) added. ` : ''}${(e as Error).message} Remaining selections are kept; retry to finish.`,
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const visible = shops.filter((shop) =>
    `${shop.name_en} ${shop.address_en}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Modal
      open
      title={`Add pharmacies · ${medicineName}`}
      onOpenChange={(open) => {
        if (!open && !saving.current) onClose();
      }}
    >
      <div className="setup-wizard">
        <p>
          Select pharmacy locations to add to this medicine. Existing active links are shown as
          already linked.
        </p>
        <label>
          Find a pharmacy
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pharmacy name or address"
          />
        </label>
        {loading && <p role="status">Loading pharmacies…</p>}
        {loadError && (
          <p role="alert">
            {loadError}{' '}
            <button
              className="text-link"
              onClick={() => {
                setLoading(true);
                setLoadError('');
                setRetry(retry + 1);
              }}
            >
              Retry loading
            </button>
          </p>
        )}
        {!loading && !loadError && (
          <div className="setup-shop-list">
            {visible.map((shop) => {
              const linked = mappings.some((m) => m.pharmacy_id === shop.id && m.active);
              return (
                <label className="setup-shop-choice" key={shop.id}>
                  <input
                    type="checkbox"
                    disabled={busy || linked}
                    checked={linked || selected.includes(shop.id)}
                    onChange={(e) => {
                      setSelected((previous) =>
                        e.target.checked
                          ? [...previous, shop.id]
                          : previous.filter((id) => id !== shop.id),
                      );
                    }}
                  />
                  <span>
                    <strong>{shop.name_en}</strong>
                    <small>{shop.address_en}</small>
                    {linked && <small>Already linked</small>}
                  </span>
                </label>
              );
            })}
            {!visible.length && (
              <p>
                {shops.length
                  ? 'No matching pharmacies.'
                  : 'No active pharmacies. Add a pharmacy in Pharmacies, then return here.'}
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="live-error">
            {error}
          </p>
        )}
        <div className="setup-actions">
          <button className="button button-outline" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button
            className="button"
            disabled={busy || loading || !!loadError || !selected.length}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : `Add selected pharmacies (${selected.length})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
