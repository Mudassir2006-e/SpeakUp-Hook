"use client";

import React from "react";
import { checkPasswordRequirements } from "@/lib/validation";

interface PasswordRequirementsListProps {
  password: string;
  showAlways?: boolean;
}

/**
 * Accessible real-time password requirements checklist.
 * Displays live feedback for all 5 security criteria as students type:
 * 1. Minimum 8 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 lowercase letter (a-z)
 * 4. At least 2 numeric digits (0-9)
 * 5. At least 1 special character (!@#$%^&*)
 */
export const PasswordRequirementsList: React.FC<PasswordRequirementsListProps> = ({
  password,
  showAlways = false,
}) => {
  // Show list if there is text typed or if explicitly requested to show always
  if (!showAlways && !password) return null;

  const status = checkPasswordRequirements(password);

  const criteria = [
    { id: "len", label: "At least 8 characters", met: status.minLength },
    { id: "upper", label: "At least 1 uppercase letter (A-Z)", met: status.hasUppercase },
    { id: "lower", label: "At least 1 lowercase letter (a-z)", met: status.hasLowercase },
    { id: "digits", label: "At least 2 numbers (0-9)", met: status.hasTwoDigits },
    { id: "special", label: "At least 1 special character (!@#$%^&*)", met: status.hasSpecialChar },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2.5 p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-xs font-serif space-y-1.5 transition-all"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
          Password Requirements:
        </span>
        <span
          className={`font-display text-[10px] uppercase tracking-wider font-bold ${
            status.allValid
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[var(--text-muted)]"
          }`}
        >
          {status.allValid ? "All criteria met" : "Strong password required"}
        </span>
      </div>

      <ul className="space-y-1">
        {criteria.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              item.met
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-[var(--text-muted)]"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[14px] shrink-0 ${
                item.met ? "text-emerald-500" : "text-[var(--text-muted)]/60"
              }`}
              aria-hidden="true"
            >
              {item.met ? "check_circle" : "radio_button_unchecked"}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordRequirementsList;
