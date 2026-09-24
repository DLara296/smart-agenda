import React from 'react';

function Dashboard({ sessions = [] }) {
  return (
    <section aria-label="Session dashboard">
      <h2>Upcoming sessions</h2>
      {sessions.map(session => (
        <article key={session.id}>
          {session.missingGroups?.length > 0 && (
            <div role="alert">
              <strong>Missing volunteer</strong>
              <ul>
                {session.missingGroups.map(group => <li key={group}>{group}</li>)}
              </ul>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

export default Dashboard;
