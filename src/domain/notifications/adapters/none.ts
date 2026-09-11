import type { NotificationChannel } from "../types";

/**
 * THE DEFAULT CHANNEL: sends nothing, and says so.
 *
 * NEOGEN has no approved email provider and no operations inbox. Rather than a
 * registry that is sometimes empty, the absence is an implementation — so
 * placing an order exercises the whole notification path and every owed
 * message lands in the outbox as `pending`, ready for whichever provider is
 * chosen.
 */
export const noneChannel: NotificationChannel = {
  id: "none",
  isConfigured: () => false,
  async send() {
    return { ok: false, error: { code: "unconfigured", retryable: true } };
  },
};
