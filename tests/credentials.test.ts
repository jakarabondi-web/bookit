import { describe, expect, it } from "vitest";
import { CheckInResult, PaymentMethod, TicketStatus } from "@/domain/enums";
import { CredentialService } from "@/server/services/credential-service";
import { fixedClock } from "@/server/lib/clock";
import { actor, freshContainer, seedTicketedEvent } from "./helpers";

/**
 * The QR code is not the ticket. These tests pin the two properties that make
 * that true: credentials expire in seconds, and they die the moment the ticket
 * they refer to changes.
 */
describe("ticket credentials", () => {
  async function issuedTicket() {
    const container = freshContainer();
    const { event, ticketType } = await seedTicketedEvent(container, { quantity: 5 });

    const result = await container.checkout.startCheckout(actor(), {
      eventId: event.id,
      lines: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      buyerEmail: "buyer@example.co.ke",
      buyerPhone: "+254700000001",
    });
    const tickets = await container.checkout.fulfilOrder(actor(), result.order.id, {
      method: PaymentMethod.MPESA,
    });

    return { container, event, ticket: tickets[0]! };
  }

  it("issues a credential that verifies", async () => {
    const { container, ticket } = await issuedTicket();
    const credential = await container.tickets.issueCredential(actor(), ticket.id);

    const payload = container.credentials.verify(credential.token);
    expect(payload.t).toBe(ticket.id);
    expect(payload.v).toBe(ticket.credentialVersion);
  });

  it("rejects a tampered credential", async () => {
    const { container, ticket } = await issuedTicket();
    const credential = await container.tickets.issueCredential(actor(), ticket.id);

    const [prefix, body, signature] = credential.token.split(".");
    const tampered = `${prefix}.${body}.${signature!.slice(0, -2)}XX`;

    expect(() => container.credentials.verify(tampered)).toThrow(/signature/i);
  });

  it("rejects a credential once it has expired", async () => {
    const { ticket } = await issuedTicket();

    const issuer = new CredentialService(fixedClock("2026-08-08T12:00:00.000Z"));
    const credential = issuer.issue(ticket);

    // Same key, clock moved past the TTL.
    const later = new CredentialService(fixedClock("2026-08-08T12:05:00.000Z"));
    expect(() => later.verify(credential.token)).toThrow(/expired/i);
  });

  it("refuses to issue a credential for a ticket you do not own", async () => {
    const { container, ticket } = await issuedTicket();

    await expect(
      container.tickets.issueCredential(actor({ userId: "usr_other" }), ticket.id),
    ).rejects.toThrow(/your own tickets/i);
  });

  it("refuses to issue a credential for a voided ticket", async () => {
    const { container, ticket } = await issuedTicket();
    await container.tickets.void(actor(), ticket.id, "Fraud response");

    await expect(container.tickets.issueCredential(actor(), ticket.id)).rejects.toThrow(
      /cannot produce a credential/i,
    );
  });

  it("stops an old credential scanning after the ticket is transferred", async () => {
    const { container, event, ticket } = await issuedTicket();

    // Credential minted before the transfer.
    const stale = await container.tickets.issueCredential(actor(), ticket.id);

    const transfer = await container.tickets.initiateTransfer(actor(), {
      ticketId: ticket.id,
      toEmail: "other@example.co.ke",
    });
    await container.tickets.acceptTransfer(actor({ userId: "usr_other" }), transfer.id);

    // The signature still verifies — it was validly signed — but the version no
    // longer matches, so the gate refuses it.
    const payload = container.credentials.verify(stale.token);
    expect(payload.v).toBe(1);

    const scan = await container.checkin.scan(actor({ roles: ["CHECK_IN_STAFF"] }), {
      eventId: event.id,
      credential: stale.token,
    });

    expect(scan.result).toBe(CheckInResult.REVOKED);
  });

  it("admits once and refuses the second scan of the same code", async () => {
    const { container, event, ticket } = await issuedTicket();
    const credential = await container.tickets.issueCredential(actor(), ticket.id);

    const first = await container.checkin.scan(actor(), {
      eventId: event.id,
      credential: credential.token,
    });
    expect(first.result).toBe(CheckInResult.ADMITTED);

    const second = await container.checkin.scan(actor(), {
      eventId: event.id,
      credential: credential.token,
    });
    expect(second.result).toBe(CheckInResult.ALREADY_USED);

    const updated = await container.uow.repos.tickets.findById(ticket.id);
    expect(updated?.status).toBe(TicketStatus.CHECKED_IN);
  });

  it("refuses a credential presented at the wrong event", async () => {
    const { container, ticket } = await issuedTicket();
    await seedTicketedEvent(container, { quantity: 1, eventId: "evt_other" });

    const credential = await container.tickets.issueCredential(actor(), ticket.id);
    const scan = await container.checkin.scan(actor(), {
      eventId: "evt_other",
      credential: credential.token,
    });

    expect(scan.result).toBe(CheckInResult.WRONG_EVENT);
  });
});
