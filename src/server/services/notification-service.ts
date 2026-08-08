import type { Notification } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { NotificationRepository } from "../repositories/types";

/**
 * Notification dispatch.
 *
 * Sending is queued rather than inline: a slow SMS gateway must never hold open
 * the transaction that issues a ticket. `send` records the intent; the delivery
 * worker drains the queue and is safe to retry because delivery is keyed on the
 * notification id.
 */

export type NotificationTemplate =
  | "order.confirmed"
  | "booking.confirmed"
  | "booking.cancelled"
  | "rsvp.reminder"
  | "event.reminder"
  | "invite.issued"
  | "transfer.received"
  | "transfer.accepted"
  | "resale.completed"
  | "refund.processed"
  | "payout.paid"
  | "payout.destination_changed"
  | "organizer.verification_updated"
  | "security.alert"
  | "marketing.campaign";

export interface SendNotificationInput {
  userId: string | null;
  to: string;
  channel: Notification["channel"];
  template: NotificationTemplate;
  payload?: Record<string, string>;
}

export interface NotificationTransport {
  deliver(notification: Notification): Promise<void>;
}

/** Development transport: records deliveries instead of sending them. */
export class ConsoleTransport implements NotificationTransport {
  readonly delivered: Notification[] = [];
  async deliver(notification: Notification): Promise<void> {
    this.delivered.push(notification);
  }
}

export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly transport: NotificationTransport = new ConsoleTransport(),
    private readonly clock: Clock = systemClock,
  ) {}

  async send(input: SendNotificationInput): Promise<Notification> {
    return this.repo.enqueue({
      id: newId("ntf"),
      userId: input.userId,
      channel: input.channel,
      template: input.template,
      to: input.to,
      payload: input.payload ?? {},
      sentAt: null,
      createdAt: this.clock.nowIso(),
    });
  }

  /** Drains the queue. Retry-safe: already-sent notifications are skipped. */
  async drain(): Promise<number> {
    const pending = await this.repo.listPending();
    let sent = 0;
    for (const notification of pending) {
      await this.transport.deliver(notification);
      await this.repo.markSent(notification.id, this.clock.nowIso());
      sent += 1;
    }
    return sent;
  }

  listForUser(userId: string) {
    return this.repo.listForUser(userId);
  }
}
