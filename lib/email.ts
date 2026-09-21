import { Resend } from "resend";

export function resendFrom() {
  return process.env.RESEND_FROM || "Jenafy Analytics <noreply@jenafy.com>";
}

export async function sendInviteCodeEmail(input: {
  to: string;
  siteName: string;
  siteDomain: string;
  code: string;
  expiresAt: string;
  joinUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      error: "Email isn’t configured. Copy the invite link and send it yourself.",
    };
  }

  const expiresLabel = new Date(input.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: resendFrom(),
    to: input.to,
    subject: `Create your password for ${input.siteName} analytics`,
    text: [
      `You've been invited to view analytics for ${input.siteName} (${input.siteDomain}).`,
      "",
      "Open this link and create a password:",
      input.joinUrl,
      "",
      `Invite code: ${input.code}`,
      `Expires: ${expiresLabel} (72 hours, one-time use)`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;line-height:1.5;color:#0f172a">
        <p>You've been invited to view analytics for <strong>${escapeHtml(input.siteName)}</strong> (${escapeHtml(input.siteDomain)}).</p>
        <p>Click below to create your password. No extra email confirmation is needed.</p>
        <p><a href="${escapeHtml(input.joinUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Create password</a></p>
        <p style="font-size:13px;color:#64748b;margin:24px 0 8px">Or paste this invite code on the join page</p>
        <p style="font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:0.06em;margin:0">${escapeHtml(input.code)}</p>
        <p style="font-size:13px;color:#64748b">Expires ${escapeHtml(expiresLabel)}. One-time use.</p>
      </div>
    `,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
