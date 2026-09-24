import { describe, expect, it } from "vitest";
import {
  buildAccountDeletionEmail,
  buildPasswordResetEmail,
} from "@/lib/email/templates";
import { OFFICIAL_EMAIL_ADDRESS } from "@/lib/email/resend";

describe("KA Bijoux email templates", () => {
  it("renders HTML and text with the official identity", () => {
    const template = buildPasswordResetEmail({
      name: "Cliente",
      code: "123456",
      expiresInMinutes: 15,
    });

    expect(template.subject).toContain("KA Bijoux");
    expect(template.html).toContain(OFFICIAL_EMAIL_ADDRESS);
    expect(template.html).toContain("123456");
    expect(template.text).toContain("123456");
    expect(template.text).toContain("15 minutos");
  });

  it("escapes customer-controlled HTML", () => {
    const template = buildPasswordResetEmail({
      name: '<img src=x onerror="alert(1)">',
      code: "123456",
      expiresInMinutes: 15,
    });

    expect(template.html).not.toContain("<img");
    expect(template.html).toContain("&lt;img");
  });

  it("renders a one-time account deletion link in HTML and text", () => {
    const confirmationUrl =
      "https://kabijoux.com.br/excluir-conta/confirmar?token=a&source=test";
    const template = buildAccountDeletionEmail({
      confirmationUrl,
      expiresAt: new Date("2026-07-29T22:00:00Z"),
    });

    expect(template.html).toContain(
      "token=a&amp;source=test"
    );
    expect(template.text).toContain(confirmationUrl);
    expect(template.html).toContain(OFFICIAL_EMAIL_ADDRESS);
  });
});
