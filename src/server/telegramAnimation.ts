import { readFile } from 'node:fs/promises';

type Call = (method: string, body: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<any>;

/** Upload the bundled silent H.264 animation once, then reuse Telegram's file_id. */
export function createAnimationSender(token: string, call: Call) {
  let fileId: string | undefined;
  let asset: Promise<Buffer> | undefined;
  return async (chatId: number): Promise<number | undefined> => {
    let message: any;
    if (fileId) {
      try {
        message = await call('sendAnimation', { chat_id: chatId, animation: fileId, disable_notification: true }, { timeoutMs: 10_000 });
      } catch { fileId = undefined; throw new Error('Animation unavailable'); }
    } else {
      asset ??= readFile(new URL('../../public/assets/telegram/processing.mp4', import.meta.url))
        .catch(error => { asset = undefined; throw error; });
      const bytes = await asset;
      const form = new FormData();
      form.set('chat_id', String(chatId));
      form.set('disable_notification', 'true');
      form.set('animation', new Blob([new Uint8Array(bytes)], { type: 'video/mp4' }), 'argus-processing.mp4');
      form.set('width', '1080');
      form.set('height', '720');
      form.set('duration', '3');
      const response = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, {
        method: 'POST', body: form, signal: AbortSignal.timeout(10_000),
      });
      const data: any = await response.json();
      if (!response.ok || !data.ok) throw new Error('Animation unavailable');
      message = data.result;
      if (typeof message?.animation?.file_id === 'string') fileId = message.animation.file_id;
    }
    return Number.isSafeInteger(message?.message_id) ? message.message_id : undefined;
  };
}

/** A late upload is cleaned up too; failures never delay or reject the analysis. */
export function startProcessingAnimation(upload: () => Promise<number | undefined>, remove: (id: number) => Promise<unknown>) {
  let ended = false;
  let cleanup: Promise<void> | undefined;
  const uploaded = Promise.resolve().then(() => ended ? undefined : upload()).catch(() => undefined);
  return {
    dispose(): Promise<void> {
      ended = true;
      cleanup ??= uploaded.then(async id => {
        if (id !== undefined) { try { await remove(id); } catch { /* best effort */ } }
      });
      return cleanup;
    },
  };
}
