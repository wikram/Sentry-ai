/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions to format date and time into clean, user-readable strings.
 */

export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}

export function formatDateOnly(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateInput);
  }
}

export function formatTimeOnly(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}

export function formatShortDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}
