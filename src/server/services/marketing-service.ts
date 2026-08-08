import { validationError } from "@/domain/errors";
import type { Campaign } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import { isSegment, type CrmService, type Segment } from "./crm-service";
import type { NotificationService } from "./notification-service";

export interface CreateCampaignInput {
  segments: string[];
  channel: "EMAIL" | "SMS";
  subject: string;
  body: string;
}

export interface CampaignResult {
  campaign: Campaign;
  /** Segment members who had no address on the chosen channel — sent count excludes them. */
  skipped: number;
}

/**
 * Turns a CRM segment into a send. The audience is never persisted as a
 * list — only the campaign's own record of who it reached — because segment
 * membership is derived and shifts as customers buy again; re-running the
 * same campaign next week is meant to reach a different, current audience.
 */
export class MarketingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: { crm: CrmService; notifications: NotificationService },
    private readonly clock: Clock = systemClock,
  ) {}

  async createCampaign(
    organizerId: string,
    input: CreateCampaignInput,
  ): Promise<CampaignResult> {
    if (input.segments.length === 0) {
      throw validationError("Choose at least one segment to message");
    }
    const segments = input.segments.filter(isSegment);
    if (segments.length !== input.segments.length) {
      throw validationError("Unknown segment in selection");
    }
    if (!input.subject.trim()) throw validationError("Give your message a subject");
    if (!input.body.trim()) throw validationError("Write something to send");

    const audience = await this.deps.crm.customersInSegments(organizerId, segments as Segment[]);

    let sent = 0;
    let skipped = 0;
    for (const customer of audience) {
      const to = input.channel === "SMS" ? customer.phone : customer.email;
      if (!to) {
        skipped += 1;
        continue;
      }
      await this.deps.notifications.send({
        userId: null,
        to,
        channel: input.channel,
        template: "marketing.campaign",
        payload: { subject: input.subject, body: input.body },
      });
      sent += 1;
    }

    const campaign: Campaign = {
      id: newId("camp"),
      organizerId,
      segments,
      channel: input.channel,
      subject: input.subject.trim(),
      body: input.body.trim(),
      recipientCount: sent,
      sentByUserId: null,
      sentAt: this.clock.nowIso(),
    };
    await this.uow.repos.campaigns.create(campaign);

    return { campaign, skipped };
  }

  listCampaigns(organizerId: string): Promise<Campaign[]> {
    return this.uow.repos.campaigns.listByOrganizer(organizerId);
  }
}
