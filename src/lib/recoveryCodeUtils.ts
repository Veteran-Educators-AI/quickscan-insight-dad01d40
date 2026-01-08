// Generate a random recovery code in format XXXX-XXXX
function generateSingleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// Generate a set of recovery codes
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateSingleCode());
  }
  return codes;
}

// Hash a recovery code for storage (simple hash for client-side, real hash on server)
export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format recovery codes for display
export function formatRecoveryCodesForPrint(codes: string[]): string {
  return `The Scan Genius - Recovery Codes
================================
Store these codes in a safe place.
Each code can only be used once.

${codes.map((code, i) => `${(i + 1).toString().padStart(2, ' ')}. ${code}`).join('\n')}

Generated: ${new Date().toLocaleDateString()}
`;
}
