import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ClipboardList, Database, LockKeyhole, RefreshCw, ScanFace, ShieldCheck, Trash2, X } from 'lucide-react';
import './SharedDatabaseAdmin.css';
import { faceMatchDescription, type ArgusFaceMatch } from '../types/argusFaceMatch';

type Status = 'pending' | 'approved' | 'rejected';
type RecordItem = {
  id: string; fullName: string; birthDate: string; schoolOrOrg: string;
  vkUrl: string; photoUrl: string; status: Status;
};
const statusLabels: Record<Status, string> = {
  pending: 'Ожидает проверки', approved: 'Одобрена', rejected: 'Отклонена',
};
const filters = [
  { id: 'all', label: 'Все' }, { id: 'pending', label: 'На проверке' },
  { id: 'approved', label: 'Одобрены' }, { id: 'rejected', label: 'Отклонены' },
] as const;

/** Administrative access is kept in component memory only. */
export function SharedDatabaseAdmin({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState('');
  const [records, setRecords] = useState<RecordItem[] | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [faceMatch, setFaceMatch] = useState<ArgusFaceMatch | null>(null);

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function request(path: string, method = 'GET', body?: object) {
    const response = await fetch(`/api/shared${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Проверьте ключ администратора.'
      : response.status === 404 ? 'Запись уже обработана или удалена. Обновите список.'
      : 'Не удалось выполнить запрос. Повторите попытку.');
    return response;
  }
  async function refreshRecords() {
    const response = await request('/records');
    const data = await response.json();
    if (!Array.isArray(data?.records)) throw new Error('Сервер вернул неверный список заявок.');
    setRecords(data.records);
  }
  async function load() {
    setBusy(true); setError(''); setNotice('');
    try { await refreshRecords(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки.'); }
    finally { setBusy(false); }
  }
  async function comparePhoto() {
    if (!facePhoto || busy) return;
    setError(''); setNotice(''); setFaceMatch(null);
    if (facePhoto.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(facePhoto.type)) {
      setError('Выберите JPEG, PNG или WebP до 2 МБ.');
      return;
    }
    setBusy(true);
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Не удалось прочитать снимок.'));
        reader.readAsDataURL(facePhoto);
      });
      const response = await request('/face-match', 'POST', { photo });
      setFaceMatch(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сверить фото.'); }
    finally { setBusy(false); }
  }
  async function act(id: string, approve: boolean) {
    if (!approve && !window.confirm('Удалить эту запись?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/records/${encodeURIComponent(id)}${approve ? '/approve' : ''}`, approve ? 'PATCH' : 'DELETE');
      setRecords(previous => previous && (approve
        ? previous.map(item => item.id === id ? { ...item, status: 'approved' } : item)
        : previous.filter(item => item.id !== id)));
      setNotice(`Заявка #${id.slice(0, 8)} ${approve ? 'одобрена' : 'удалена'}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить решение.'); }
    finally { setBusy(false); }
  }

  const visibleRecords = records?.filter(record => filter === 'all' || record.status === filter) ?? [];

  return (
    <dialog className="argus-admin" ref={dialog} aria-labelledby="argus-admin-title" onCancel={event => { event.preventDefault(); close(); }}>
      <header className="argus-admin__header">
        <span className="argus-admin__emblem" aria-hidden="true"><ShieldCheck size={24} /></span>
        <div>
          <p className="argus-admin__eyebrow">АРГУС / КАБИНЕТ АДМИНИСТРАТОРА</p>
          <h2 id="argus-admin-title">Управление базой</h2>
          <p className="argus-admin__muted">Единый список заявок с сайта и из Telegram</p>
        </div>
        <button className="argus-admin__icon-button" type="button" aria-label="Закрыть панель" onClick={close}><X size={19} /></button>
      </header>

      <div className="argus-admin__body" aria-busy={busy}>
        {error && <p className="argus-admin__feedback argus-admin__feedback--error" role="alert"><AlertCircle size={16} />{error}</p>}
        {notice && <p className="argus-admin__feedback" role="status"><Check size={16} />{notice}</p>}
        {records === null ? (
          <div className="argus-admin__signin">
            <div className="argus-admin__signin-intro">
              <LockKeyhole size={27} aria-hidden="true" />
              <h3>Защищённый доступ</h3>
              <p>Войдите, чтобы просмотреть фотографии и статусы заявок.</p>
            </div>
            <form className="argus-admin__form" onSubmit={event => { event.preventDefault(); void load(); }}>
              <label htmlFor="argus-admin-token">Ключ администратора</label>
              <input id="argus-admin-token" type="password" value={token} onChange={event => setToken(event.target.value)}
                autoComplete="off" placeholder="Введите ключ" required disabled={busy} />
              <button className="argus-admin__button argus-admin__button--primary" disabled={busy || !token}>
                <LockKeyhole size={16} />{busy ? 'Открываю…' : 'Открыть базу'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <details className="argus-admin__face-match">
              <summary><ScanFace size={19} aria-hidden="true" /> Сверить лицо с базой «Аргус»</summary>
              <p className="argus-admin__muted">Загрузите чёткий снимок с одним лицом. Поиск идёт по одобренным записям.</p>
              <form onSubmit={event => { event.preventDefault(); void comparePhoto(); }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Фото для сверки" disabled={busy}
                  onChange={event => { setFacePhoto(event.target.files?.[0] ?? null); setFaceMatch(null); }} />
                <button type="submit" className="argus-admin__button argus-admin__button--primary" disabled={!facePhoto || busy}>
                  {busy ? 'Проверяю…' : 'Сравнить фото'}
                </button>
              </form>
              {faceMatch && <div role="status" className="argus-admin__face-result">
                <p>{faceMatchDescription(faceMatch)}</p>
                {faceMatch.status === 'candidate' && <>
                  <strong>Данные взяты из базы данных «Аргус»</strong>
                  <p>{faceMatch.record.fullName} · #{faceMatch.record.id.slice(0, 8)}</p>
                  <p>Дата рождения {faceMatch.record.birthDate}</p>
                  {faceMatch.record.schoolOrOrg && <p>{faceMatch.record.schoolOrOrg}</p>}
                  {faceMatch.record.vkUrl && <p>{faceMatch.record.vkUrl}</p>}
                </>}
              </div>}
            </details>
            <div className="argus-admin__toolbar">
              <div>
                <h3><ClipboardList size={19} aria-hidden="true" /> Заявки</h3>
                <p className="argus-admin__muted">До 100 последних записей</p>
              </div>
              <button type="button" className="argus-admin__button" disabled={busy} onClick={() => void load()}>
                <RefreshCw size={15} />{busy ? 'Подождите…' : 'Обновить'}
              </button>
            </div>
            <div className="argus-admin__filters" role="group" aria-label="Фильтр по статусу">
              {filters.map(({ id, label }) => (
                <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}<span>{id === 'all' ? records.length : records.filter(record => record.status === id).length}</span>
                </button>
              ))}
            </div>
            {visibleRecords.length === 0 ? (
              <div className="argus-admin__empty"><Database size={25} aria-hidden="true" />
                <h3>{records.length === 0 ? 'Заявок пока нет' : 'Нет заявок с таким статусом'}</h3>
                <p>{records.length === 0 ? 'Здесь появятся записи, добавленные с сайта или из бота.' : 'Выберите другой фильтр, чтобы посмотреть записи.'}</p>
              </div>
            ) : (
              <ul className="argus-admin__records">
                {visibleRecords.map(record => (
                  <li key={record.id} className="argus-admin__record">
                    {record.photoUrl && <img src={record.photoUrl} alt="Фото из заявки" loading="lazy" />}
                    <div className="argus-admin__record-body">
                      <div className="argus-admin__record-meta"><code>#{record.id.slice(0, 8)}</code>
                        <span className={`argus-admin__badge argus-admin__badge--${record.status}`}>{statusLabels[record.status]}</span>
                      </div>
                      <h4>{record.fullName}</h4>
                      <dl>
                        <div><dt>Дата рождения</dt><dd>{record.birthDate}</dd></div>
                        {record.schoolOrOrg && <div><dt>Организация</dt><dd>{record.schoolOrOrg}</dd></div>}
                        {record.vkUrl && <div><dt>Профиль VK</dt><dd>{record.vkUrl}</dd></div>}
                      </dl>
                      <div className="argus-admin__actions">
                        {record.status === 'pending' && <button type="button" disabled={busy} className="argus-admin__button argus-admin__button--approve" onClick={() => void act(record.id, true)}><Check size={15} />Одобрить</button>}
                        <button type="button" disabled={busy} className="argus-admin__button argus-admin__button--delete" onClick={() => void act(record.id, false)}><Trash2 size={15} />Удалить</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
