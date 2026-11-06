/** Small bounded control queues: preserve each chat's ordering without blocking polling. */
export function createChatDispatcher(onError: () => void) {
  const tails = new Map<number, Promise<void>>();
  const counts = new Map<number, number>();
  let total = 0;
  return (chatId: number, task: () => Promise<void>): boolean => {
    if (total >= 100 || (counts.get(chatId) || 0) >= 5) return false;
    total++;
    counts.set(chatId, (counts.get(chatId) || 0) + 1);
    const job = (tails.get(chatId) || Promise.resolve()).then(task).catch(onError).finally(() => {
      total--;
      const remaining = (counts.get(chatId) || 1) - 1;
      if (remaining) counts.set(chatId, remaining); else counts.delete(chatId);
      if (tails.get(chatId) === job) tails.delete(chatId);
    });
    tails.set(chatId, job);
    return true;
  };
}

export function createAnalysisSlots(limit = 2) {
  const active = new Set<number>();
  return {
    acquire(chatId: number): 'ok' | 'chat_busy' | 'server_busy' {
      if (active.has(chatId)) return 'chat_busy';
      if (active.size >= limit) return 'server_busy';
      active.add(chatId); return 'ok';
    },
    release(chatId: number) { active.delete(chatId); },
  };
}
