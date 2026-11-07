import type { ArgusFaceMatch } from '../types/argusFaceMatch';
import { extractFaceEmbedding, FACE_ENGINE_VERSION } from './faceEngine';
import { approvedFaceRecords } from './sharedDatabase';

const GALLERY_LIMIT = 100;
const INDEX_PER_SEARCH = 4;
// Conservative starting rules for a candidate, not a calibrated identification probability.
const MIN_SIMILARITY = 0.60;
const MIN_LEAD = 0.08;
let comparing = false;

function isEmbedding(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 128 && value.every(Number.isFinite) && value.some(x => x !== 0);
}

function cosine(a: number[], b: number[]): number {
  let product = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return product / Math.sqrt(normA * normB);
}

export function selectFaceCandidate(query: number[], records: { id: string; embedding: number[] }[]) {
  const ranked = records.map(record => ({ id: record.id, similarity: cosine(query, record.embedding) }))
    .sort((a, b) => b.similarity - a.similarity);
  const [first, second] = ranked;
  if (!first || first.similarity < MIN_SIMILARITY) return { status: 'no_match' as const };
  if (second && first.similarity - second.similarity < MIN_LEAD) return { status: 'ambiguous' as const };
  return { status: 'candidate' as const, id: first.id };
}

/** Invoked only after the caller has authenticated the administrator. */
export async function findArgusFaceMatch(photo: Buffer): Promise<ArgusFaceMatch> {
  if (process.env.ARGUS_FACE_MATCH_ENABLED !== 'true') return { status: 'disabled' };
  if (comparing) return { status: 'busy' };
  comparing = true;
  try {
    const exact = await approvedFaceRecords.exactPhoto(photo);
    const approved = exact.filter(item => item.status === 'approved');
    if (approved.length > 1) return { status: 'ambiguous', checked: approved.length };
    if (approved.length === 1) {
      const record = await approvedFaceRecords.record(approved[0].id);
      return record ? { status: 'exact_file', record } : { status: 'unavailable' };
    }
    if (exact.some(item => item.status === 'pending')) return { status: 'pending_photo' };
    if (exact.some(item => item.status === 'rejected')) return { status: 'rejected_photo' };
    const gallery = await approvedFaceRecords.list(FACE_ENGINE_VERSION, GALLERY_LIMIT + 1);
    if (!gallery.length) return { status: 'empty' };
    if (gallery.length > GALLERY_LIMIT) return { status: 'limit' };
    const query = await extractFaceEmbedding(photo);
    if (query.status !== 'ok') {
      return { status: query.status === 'invalid_image' ? 'poor_quality' : query.status };
    }
    const unindexed = gallery.filter(item => item.embedding === null || !Array.isArray(item.embedding) ||
      (item.embedding.length > 0 && !isEmbedding(item.embedding)));
    for (const item of unindexed.slice(0, INDEX_PER_SEARCH)) {
      const dataUrl = await approvedFaceRecords.photo(item.id);
      if (!dataUrl) return { status: 'unavailable' };
      const result = await extractFaceEmbedding(Buffer.from(dataUrl.split(',')[1] || '', 'base64'));
      const embedding = result.status === 'ok' ? result.embedding : [];
      await approvedFaceRecords.saveEmbedding(item.id, FACE_ENGINE_VERSION, embedding);
      item.embedding = embedding;
    }
    if (unindexed.length > INDEX_PER_SEARCH) {
      return { status: 'indexing', indexed: gallery.length - unindexed.length + INDEX_PER_SEARCH, total: gallery.length };
    }
    const searchable = gallery.flatMap(item => isEmbedding(item.embedding) ? [{ id: item.id, embedding: item.embedding }] : []);
    if (!searchable.length) return { status: 'empty' };
    const selection = selectFaceCandidate(query.embedding, searchable);
    if (selection.status !== 'candidate') return { status: selection.status, checked: searchable.length };
    // Re-read the selected row in case approval or membership changed during inference.
    const record = await approvedFaceRecords.record(selection.id);
    return record ? { status: 'candidate', record, checked: searchable.length } : { status: 'unavailable' };
  } catch {
    console.error('[Argus] Face comparison unavailable; check local engine and database');
    return { status: 'unavailable' };
  } finally { comparing = false; }
}
