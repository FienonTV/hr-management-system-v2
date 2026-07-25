import * as bcrypt from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 12;
export const BCRYPT_ROUNDS = 12;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Großbuchstaben enthalten");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Kleinbuchstaben enthalten");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Passwort muss mindestens eine Ziffer enthalten");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Passwort muss mindestens ein Sonderzeichen enthalten");
  }

  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isPasswordPolicyCompliant(hash: string | null | undefined): boolean {
  // bcrypt hash format: $2[ayb]$cost$...
  if (!hash) return false;
  const match = hash.match(/^\$2[aby]\$(\d+)\$/);
  if (!match) return false;
  const cost = parseInt(match[1], 10);
  return cost >= BCRYPT_ROUNDS;
}
