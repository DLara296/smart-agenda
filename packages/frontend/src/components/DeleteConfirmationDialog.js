import React, { useEffect, useRef } from 'react';

const singular = {
  Teacher: 'teacher', School: 'school', Student: 'student', Family: 'family', 'Reading Session': 'session',
};

function DeleteConfirmationDialog({ entityType, entityName, impact, loadingImpact = false, deleting = false, error = '', onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const cancelHandlerRef = useRef(onCancel);
  const deletingRef = useRef(deleting);
  const titleId = `delete-${entityType.toLowerCase().replace(/\s+/g, '-')}-title`;
  const itemType = singular[entityType] || entityType.toLowerCase();

  cancelHandlerRef.current = onCancel;
  deletingRef.current = deleting;

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    cancelRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape' && !deletingRef.current) { event.preventDefault(); cancelHandlerRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, []);

  return <div className="delete-dialog-backdrop">
    <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
      <h2 id={titleId}>Delete {entityType}?</h2>
      <p>Are you sure you want to delete <strong>{entityName}</strong>?</p>
      {entityType === 'School' && <p>This school can only be archived after its active teachers, students, reading sessions, and notification groups are resolved. Its grades and groups will be archived with it.</p>}
      {entityType === 'Family' && <p>Guardians and students will be archived with this family. Linked accounts or outstanding invitations must be resolved first. Historical records are preserved.</p>}
      {entityType === 'Reading Session' && <p>The session will be cancelled. Assignments and history are preserved, and queued reminders are cancelled.</p>}
      {['Teacher', 'Student'].includes(entityType) && <p>This record will be archived. Existing assignments, group references, and historical records are preserved.</p>}
      {loadingImpact && <p role="status">Loading related record counts...</p>}
      {impact && <dl className="delete-impact">{Object.entries(impact).map(([key, value]) => <div key={key}><dt>{key.replace(/[A-Z]/g, character => ` ${character.toLowerCase()}`)}</dt><dd>{value}</dd></div>)}</dl>}
      {error && <p className="form-status error" role="alert">{error}</p>}
      <div className="delete-dialog-actions">
        <button ref={cancelRef} type="button" className="button-secondary" disabled={deleting} onClick={onCancel}>Cancel</button>
        <button type="button" className="danger-action" disabled={deleting || loadingImpact || (['School', 'Family'].includes(entityType) && !impact)} onClick={onConfirm}>{deleting ? 'Deleting...' : `Yes, delete ${itemType}`}</button>
      </div>
    </section>
  </div>;
}

export default DeleteConfirmationDialog;
