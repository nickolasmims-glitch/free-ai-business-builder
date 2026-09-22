import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateReport } from '../src/guardianReport.js';

// Resolve __dirname in ES‑module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main entry point – reads audit JSON, generates a markdown report,
 * and writes it to the `reports/` directory.
 */
async function main() {
  const auditJsonPath = path.resolve(__dirname, '../data/audit.json');
  let auditData = [];

  try {
    const raw = await readFile(auditJsonPath, 'utf-8');
    auditData = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Unable to read audit data from', auditJsonPath);
    console.error(err);
    process.exit(1);
  }

  const markdown = generateReport(auditData);

  const outPath = path.resolve(__dirname, '../reports/guardian-report.md');
  try {
    await writeFile(outPath, markdown, 'utf-8');
    console.log('✅ Guardian report written to', outPath);
  } catch (err) {
    console.error('❌ Failed to write report:', err);
    process.exit(1);
  }
}

main();
