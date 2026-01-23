export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirement[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthPercent: number;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      label: 'One number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$%^&*)',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const isLongEnough = password.length >= 12;

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  let strengthPercent: number;

  if (metCount <= 2) {
    strength = 'weak';
    strengthPercent = 25;
  } else if (metCount === 3) {
    strength = 'fair';
    strengthPercent = 50;
  } else if (metCount === 4 || !isLongEnough) {
    strength = 'good';
    strengthPercent = 75;
  } else {
    strength = 'strong';
    strengthPercent = 100;
  }

  return {
    isValid: metCount >= 4, // At least 4 of 5 requirements
    requirements,
    strength,
    strengthPercent,
  };
}

export function getPasswordStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'fair':
      return 'bg-orange-500';
    case 'good':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}

export function getPasswordStrengthLabel(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
}
