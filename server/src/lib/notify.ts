import { q } from './db.ts';
import { newId } from './auth.ts';
import { toNotification } from './repo.ts';
import { toUser } from './ws.ts';
import type { NotificationKind } from '../../../shared/types.ts';

export function notify(
  userId: string,
  kind: NotificationKind,
  opts: { actorId?: string; pinId?: string; body?: string } = {},
): void {
  if (opts.actorId === userId) return; // never notify people about their own actions
  const id = newId('n');
  q(
    'INSERT INTO notifications (id, user_id, kind, actor_id, pin_id, body, created_at, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
  ).run(id, userId, kind, opts.actorId ?? null, opts.pinId ?? null, opts.body ?? '', Date.now());
  const row = q('SELECT * FROM notifications WHERE id = ?').get(id);
  if (row) toUser(userId, { t: 'notification', notification: toNotification(row as never) });
}
