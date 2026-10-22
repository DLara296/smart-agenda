import React from 'react';

const content = {
  Calendar: ['Calendar', 'Review reading sessions by month, week, or agenda.'],
  'Reading Sessions': ['Reading Sessions', 'Create and manage upcoming reading sessions.'],
  Teachers: ['Teachers', 'Manage teachers and language assignments.'],
  Students: ['Students', 'Review students connected to reading groups.'],
  Notifications: ['Notifications', 'Track scheduled, pending, delivered, and failed messages.'],
  History: ['History', 'Review cancellations, replacements, and operational activity.'],
  Settings: ['Settings', 'Manage school preferences and notification configuration.'],
};

function WorkspaceView({ name, onPrimaryAction }) {
  const [title, description] = content[name] || content.Calendar;
  return (
    <section className="panel workspace-view" aria-label={title}>
      <div className="section-kicker">Workspace</div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="empty-state">
        <span className="empty-icon">◷</span>
        <strong>{name === 'Calendar' ? 'No live calendar events yet' : `${title} workspace ready`}</strong>
        <p>Connect this view to the SmartAgenda API to manage real records.</p>
        {onPrimaryAction && <button className="small-action" onClick={onPrimaryAction}>Create first item</button>}
      </div>
    </section>
  );
}

export default WorkspaceView;
