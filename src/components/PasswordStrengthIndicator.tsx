import { Check, X } from 'lucide-react';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  type PasswordValidationResult
} from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  className,
  showRequirements = true
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const validation: PasswordValidationResult = validatePassword(password);
  const { strength, strengthPercent, requirements } = validation;
  const colorClass = getPasswordStrengthColor(strength);
  const label = getPasswordStrengthLabel(strength);

  return (
    <div className={cn('space-y-3 animate-in fade-in slide-in-from-top-1 duration-200', className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength === 'weak' && 'text-red-500',
            strength === 'fair' && 'text-orange-500',
            strength === 'good' && 'text-yellow-600 dark:text-yellow-500',
            strength === 'strong' && 'text-green-500'
          )}>
            {label}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300 ease-out', colorClass)}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 transition-colors duration-200',
                req.met ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
              )}
            >
              {req.met ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthIndicator;
