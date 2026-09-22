/**
 * Generate a markdown report for Guardian AI audits.
 *
 * @param {Array<Object>} auditData - List of audit items.
 *   Each item should contain:
 *     - name: string – human readable name of the check/module.
 *     - status: string – "PASS" or "FAIL".
 *     - evidence?: string – optional evidence description.
 *     - nextAction?: string – optional next‑action recommendation.
 *
 * @returns {string} Markdown formatted report.
 */
export function generateReport(auditData) {
  const lines = [];

  // Header
  lines.push('# Guardian AI Report');
  lines.push('');
  lines.push(`*Generated on ${new Date().toISOString()}*`);
  lines.push('');

  // Body – one section per audit item
  for (const item of auditData) {
    const statusIcon = item.status === 'PASS' ? '✅' : '❌';
    lines.push(`## ${statusIcon} ${item.name}`);
    lines.push('');

    if (item.evidence) {
      lines.push(`**Evidence:** ${item.evidence}`);
      lines.push('');
    }

    if (item.nextAction) {
      lines.push(`**Next action:** ${item.nextAction}`);
      lines.push('');
    }
  }

  // Ensure trailing newline
  lines.push('');
  return lines.join('\n');
}
