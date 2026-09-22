import { strict as assert } from 'node:assert';
import { generateReport } from '../src/guardianReport.js';

// Sample audit data covering both PASS and FAIL cases
const sampleData = [
  {
    name: 'Test Module',
    status: 'PASS',
    evidence: 'All good.',
    nextAction: 'None'
  },
  {
    name: 'Failing Module',
    status: 'FAIL',
    evidence: 'Missing config.',
    nextAction: 'Add config.'
  }
];

const report = generateReport(sampleData);

// Basic sanity checks – ensure key sections appear
assert.match(report, /# Guardian AI Report/);
assert.match(report, /✅ Test Module/);
assert.match(report, /❌ Failing Module/);
assert.match(report, /\*\*Evidence:\*\* All good\./);
assert.match(report, /\*\*Next action:\*\* Add config\./);
