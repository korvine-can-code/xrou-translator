/* Requests open a prefilled GitHub Issue. No backend and no automatic submissions. */
(() => {
  'use strict';
  const form=document.getElementById('requestTranslationForm');
  if(!form) return;
  form.addEventListener('submit', event => {
    const term=document.getElementById('requestTerm').value.trim();
    const context=document.getElementById('requestContext').value.trim();
    const kind=document.getElementById('requestKind').value;
    const direction=document.getElementById('requestDirection').value;
    if(!term) {
      event.preventDefault();
      document.getElementById('requestTerm').setCustomValidity('Please enter a word or phrase.');
      document.getElementById('requestTerm').reportValidity();
      return;
    }
    document.getElementById('requestTerm').setCustomValidity('');
    const singleLine=term.replace(/\s+/g,' ').slice(0,85);
    const title=`Translation request: ${singleLine}`;
    const body=[
      '### Type', kind,
      '### Direction', direction,
      '### Word or phrase', term,
      '### Context / intended meaning', context || 'Not provided.',
      '', 'Submitted using the Dvandva Xrou-Haxa Translator request form.'
    ].join('\n\n');
    document.getElementById('requestIssueTitle').value=title;
    document.getElementById('requestIssueBody').value=body;
  });
  document.getElementById('requestTerm').addEventListener('input',e=>e.target.setCustomValidity(''));
})();
