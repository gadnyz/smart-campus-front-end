const fs = require('fs');
const path = 'src/app/features/admission/pages/candidate-create/candidate-create.ts';
const b = fs.readFileSync(path);
let t = b.toString('utf16le');
// trim after final closing brace of file if duplicate garbage
const lastBrace = t.lastIndexOf('\n}');
if (lastBrace > 0) {
  const tail = t.slice(lastBrace + 2).trim();
  if (tail.length) console.log('tail garbage chars', tail.length);
}
const lines = t.split(/\r?\n/);
console.log('line count', lines.length);
const checks = {
  candidatureTypeLabel: t.includes('candidatureTypeLabel'),
  displayValue: t.includes('displayValue'),
  optionLabel: t.includes('optionLabel'),
  updateCandidatureType: t.includes('updateCandidatureType'),
  documentsUploadWarning: t.includes('documentsUploadWarning'),
  startAnotherApplication: t.includes('startAnotherApplication'),
  tutor_email: t.includes('tutor_email'),
  emergency_email: t.includes('emergency_email'),
  libphonenumber: t.includes('libphonenumber-js/max'),
  AdmissionAcademicReferenceService: t.includes('AdmissionAcademicReferenceService'),
};
console.log(JSON.stringify(checks, null, 2));
const open = (t.match(/\{/g) || []).length;
const close = (t.match(/\}/g) || []).length;
console.log('braces', open, close);
