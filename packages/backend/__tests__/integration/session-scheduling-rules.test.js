const request = require('supertest');
const { createApp } = require('../../src/app');

const DUPLICATE_MESSAGE = 'A reading session already exists for this grade and group on the selected date. Each group can have only one reading session per day.';
const PAST_MESSAGE = 'You cannot create a reading session for a past date. Please select today or a future date.';

function sessionBody(schoolId, overrides = {}) {
  return {
    schoolId,
    gradeId: 'grade-test',
    sessionDate: '2026-10-06',
    startTime: '07:40',
    endTime: '08:40',
    assignments: [{ groupId: 'group-a', language: 'en' }],
    ...overrides,
  };
}

describe('reading session scheduling rules', () => {
  let app;
  let close;
  let now;
  let schoolId;
  let admin;

  beforeEach(async () => {
    now = new Date('2026-10-06T05:30:00.000Z');
    ({ app, close } = createApp({ database: ':memory:', clock: () => new Date(now) }));
    admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);
    const school = await admin('post', '/v1/schools', { name: 'Mexico School', timezone: 'America/Mexico_City' });
    expect(school.status).toBe(201);
    schoolId = school.body.id;
  });

  afterEach(() => close());

  it('rejects same-group duplicates regardless of time but allows other groups and dates', async () => {
    const first = await admin('post', '/v1/sessions', sessionBody(schoolId));
    const duplicate = await admin('post', '/v1/sessions', sessionBody(schoolId, { startTime: '10:00', endTime: '11:00' }));
    const otherGroup = await admin('post', '/v1/sessions', sessionBody(schoolId, { assignments: [{ groupId: 'group-b', language: 'es' }] }));
    const nextDate = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-07' }));
    const sessions = await admin('get', '/v1/sessions');

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error).toEqual({ code: 'DUPLICATE_SESSION', message: DUPLICATE_MESSAGE });
    expect(JSON.stringify(duplicate.body)).not.toMatch(/SQLITE|constraint/i);
    expect(otherGroup.status).toBe(201);
    expect(nextDate.status).toBe(201);
    expect(sessions.body.filter(session => session.sessionDate === '2026-10-06')).toHaveLength(2);
  });

  it('rejects updates into an occupied group/date and allows self-edits', async () => {
    const first = await admin('post', '/v1/sessions', sessionBody(schoolId));
    const second = await admin('post', '/v1/sessions', sessionBody(schoolId, { assignments: [{ groupId: 'group-b', language: 'es' }] }));

    const conflictingUpdate = await admin('patch', `/v1/sessions/${second.body.id}`, { assignments: [{ groupId: 'group-a', language: 'es' }] });
    const timeOnlyUpdate = await admin('patch', `/v1/sessions/${first.body.id}`, { startTime: '09:00' });
    const assignmentOnlyUpdate = await admin('patch', `/v1/sessions/${first.body.id}`, { assignments: [{ groupId: 'group-a', language: 'es' }] });

    expect(conflictingUpdate.status).toBe(400);
    expect(conflictingUpdate.body.error).toEqual({ code: 'DUPLICATE_SESSION', message: DUPLICATE_MESSAGE });
    expect(timeOnlyUpdate.status).toBe(200);
    expect(assignmentOnlyUpdate.status).toBe(200);
  });

  it('scopes the rule by school and grade IDs and validates calendar dates', async () => {
    const secondSchool = await admin('post', '/v1/schools', { name: 'Second School', timezone: 'UTC' });
    const first = await admin('post', '/v1/sessions', sessionBody(schoolId));
    const otherGrade = await admin('post', '/v1/sessions', sessionBody(schoolId, { gradeId: 'grade-other' }));
    const otherSchool = await admin('post', '/v1/sessions', sessionBody(secondSchool.body.id));
    const invalidDate = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-02-30' }));

    expect(first.status).toBe(201);
    expect(otherGrade.status).toBe(201);
    expect(otherSchool.status).toBe(201);
    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.error).toEqual({ code: 'INVALID_SESSION_DATE', message: 'Choose a valid session date.' });
  });

  it('serializes simultaneous duplicate requests through the database constraint', async () => {
    const responses = await Promise.all([
      admin('post', '/v1/sessions', sessionBody(schoolId)),
      admin('post', '/v1/sessions', sessionBody(schoolId)),
    ]);

    expect(responses.map(response => response.status).sort()).toEqual([201, 400]);
    expect(responses.find(response => response.status === 400).body.error.message).toBe(DUPLICATE_MESSAGE);
  });

  it('compares past dates using the school timezone, including its midnight boundary', async () => {
    const beforeMidnight = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-04' }));
    const schoolToday = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-05' }));
    now = new Date('2026-10-06T06:30:00.000Z');
    const utcTodayButSchoolYesterday = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-05', assignments: [{ groupId: 'group-b', language: 'en' }] }));
    const todayAfterMidnight = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-06' }));
    const tomorrow = await admin('post', '/v1/sessions', sessionBody(schoolId, { sessionDate: '2026-10-07' }));

    expect(beforeMidnight.status).toBe(400);
    expect(beforeMidnight.body.error).toEqual({ code: 'PAST_SESSION_DATE', message: PAST_MESSAGE });
    expect(schoolToday.status).toBe(201);
    expect(utcTodayButSchoolYesterday.status).toBe(400);
    expect(utcTodayButSchoolYesterday.body.error.code).toBe('PAST_SESSION_DATE');
    expect(todayAfterMidnight.status).toBe(201);
    expect(tomorrow.status).toBe(201);
  });
});