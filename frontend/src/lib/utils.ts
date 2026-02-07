/**
 * Parse CSV content and extract email addresses
 */
export function parseEmails(csvContent: string): string[] {
  const emails: Set<string> = new Set();
  const lines = csvContent.split('\n');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by common delimiters (comma, semicolon, tab)
    const parts = trimmed.split(/[,;\t]/);

    for (const part of parts) {
      const email = part.trim();
      // Check if it looks like an email
      if (emailRegex.test(email)) {
        emails.add(email.toLowerCase());
      }
    }
  }

  return Array.from(emails);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'sent':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
