import { randomBytes } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const INVITE_TTL_HOURS = 72;

export function generateInviteCode() {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length];
  return `JN${body}`;
}

export function normalizeInviteCode(raw: string) {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function formatInviteCode(compact: string) {
  const normalized = normalizeInviteCode(compact);
  const body = normalized.startsWith("JN") ? normalized.slice(2) : normalized;
  if (body.length !== 8) return normalized;
  return `JN-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function inviteExpiryIso() {
  return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function joinPath(code: string, email?: string) {
  const params = new URLSearchParams();
  params.set("code", formatInviteCode(code));
  if (email) params.set("email", email);
  return `/join?${params.toString()}`;
}
