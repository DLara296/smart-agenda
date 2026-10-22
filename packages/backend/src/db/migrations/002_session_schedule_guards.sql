CREATE OR REPLACE FUNCTION enforce_session_group_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM session_group_assignments existing_assignment
    JOIN reading_sessions existing_session ON existing_session.id = existing_assignment.session_id
    JOIN reading_sessions new_session ON new_session.id = NEW.session_id
    WHERE existing_assignment.group_id = NEW.group_id
      AND existing_assignment.id <> NEW.id
      AND (
        existing_assignment.session_id = NEW.session_id
        OR (
          existing_session.school_id = new_session.school_id
          AND existing_session.grade_id IS NOT DISTINCT FROM new_session.grade_id
          AND existing_session.session_date = new_session.session_date
        )
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SESSION_DUPLICATE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_session_group_schedule_assignment
BEFORE INSERT OR UPDATE OF session_id, group_id ON session_group_assignments
FOR EACH ROW EXECUTE FUNCTION enforce_session_group_schedule();

CREATE OR REPLACE FUNCTION enforce_reading_session_schedule_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM session_group_assignments candidate_assignment
    JOIN session_group_assignments existing_assignment ON existing_assignment.group_id = candidate_assignment.group_id
    JOIN reading_sessions existing_session ON existing_session.id = existing_assignment.session_id
    WHERE candidate_assignment.session_id = NEW.id
      AND existing_session.id <> NEW.id
      AND existing_session.school_id = NEW.school_id
      AND existing_session.grade_id IS NOT DISTINCT FROM NEW.grade_id
      AND existing_session.session_date = NEW.session_date
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SESSION_DUPLICATE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_reading_session_schedule_update
BEFORE UPDATE OF school_id, grade_id, session_date ON reading_sessions
FOR EACH ROW EXECUTE FUNCTION enforce_reading_session_schedule_update();
