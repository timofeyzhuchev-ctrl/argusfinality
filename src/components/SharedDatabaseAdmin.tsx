import React, { useState } from 'react';

type RecordItem = { id: string; fullName: string; birthDate: string; schoolOrOrg: string; vkUrl: string; photoUrl: string; status: string };

/** Administrative access is kept in component memory only. */
export function SharedDatabaseAdmin({ close }: { close: () => void }) {
  const [token, setToken] = useState('');
  const [records, setRecords] = useState<RecordItem[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function request(path: string, method = 'GET') {
    const response = await fetch(`/api/shared${path}`, { method, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? 'Неверный ключ администратора.' : 'Не удалось выполнить запрос. Проверьте настройки базы и повторите позже.');
    return response;
  }
  async function load() {
    setBusy(true); setError('');
    try { setRecords((await (await request('/records')).json()).records); }
    catch (e) { setRecords(null); setError(e instanceof Error ? e.message : 'Ошибка загрузки.'); }
    finally { setBusy(false); }
  }
  async function act(id: string, approve: boolean) {
    if (!approve && !window.confirm('Удалить эту запись?')) return;
    setBusy(true); setError('');
    try { await request(`/records/${encodeURIComponent(id)}${approve ? '/approve' : ''}`, approve ? 'PATCH' : 'DELETE'); setRecords((await (await request('/records')).json()).records); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка.'); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl argus-card p-5 text-white space-y-3">
      <div className="flex justify-between"><strong>Общая база — администратор</strong><button type="button" onClick={close}>Закрыть</button></div>
      {!records ? <form onSubmit={e => { e.preventDefault(); void load(); }} className="space-y-2">
        <label className="block">Ключ администратора<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" className="block w-full bg-slate-900 border border-cyan-700 rounded p-2" /></label>
        <button disabled={busy} className="argus-btn-primary rounded p-2">Открыть</button>
      </form> : <>
        <p className="text-xs text-cyan-200">Показаны последние 100 записей. Новые записи ожидают проверки.</p>
        {records.map(record => <div key={record.id} className="border border-cyan-800 rounded p-3 space-y-1 text-sm">
          <div>{record.fullName} · {record.birthDate}</div><div>{record.schoolOrOrg} {record.vkUrl}</div>
          <div>{record.status === 'pending' ? 'Ожидает проверки' : 'Одобрена'}</div>
          {record.photoUrl && <img src={record.photoUrl} alt="Фото записи" className="max-w-32 max-h-32 object-contain" />}
          <div className="flex gap-3">{record.status === 'pending' && <button disabled={busy} onClick={() => void act(record.id, true)}>Одобрить</button>}
            <button disabled={busy} onClick={() => void act(record.id, false)}>Удалить</button></div>
        </div>)}
      </>}
      {error && <p role="alert" className="text-rose-300">{error}</p>}
    </div>
  </div>;
}
