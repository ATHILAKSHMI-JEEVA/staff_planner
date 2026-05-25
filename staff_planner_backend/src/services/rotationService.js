/**
 * rotationService.js
 *
 * Child-Teacher Rotation Rule
 * ───────────────────────────
 * After a child has had the SAME teacher for 3 consecutive working days,
 * on the 4th day we suggest a different available teacher (least loaded,
 * same branch, not on approved leave).
 *
 * Sundays are skipped when building the look-back window — they are
 * holidays and do not break or count toward the streak.
 */

const Session = require("../models/Session");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the N most-recent working days (non-Sunday) BEFORE a given date.
 * Results are ordered most-recent first, e.g. ["2026-05-09", "2026-05-08", "2026-05-07"].
 *
 * @param {string} dateStr  "YYYY-MM-DD"
 * @param {number} count    how many working days to collect
 * @returns {string[]}
 */
function getPreviousWorkingDays(dateStr, count) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const cursor = new Date(y, m - 1, d); // local midnight
  const result = [];

  while (result.length < count) {
    cursor.setDate(cursor.getDate() - 1);
    if (cursor.getDay() !== 0) {
      // en-CA gives "YYYY-MM-DD" in local time — no UTC shift issues
      result.push(cursor.toLocaleDateString("en-CA"));
    }
  }

  return result;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Check whether a child is due for a teacher rotation on `targetDate`.
 *
 * @param {string|ObjectId} child_id
 * @param {string}          targetDate  "YYYY-MM-DD"
 * @param {string}          [branch_id] restricts teacher pool to this branch
 *
 * @returns {Promise<{
 *   streak:           number,      // 0–3+ consecutive days with same teacher
 *   shouldRotate:     boolean,
 *   currentTeacher:   {id:string, name:string} | null,
 *   suggestedTeacher: {id:string, name:string} | null,
 *   noAlternative:    boolean      // true when rotation is due but no one available
 * }>}
 */
const checkAndSuggestRotation = async (child_id, targetDate, branch_id) => {
  // ── 1. Build look-back window: 3 previous working days ───────────────────
  const lookbackDays = getPreviousWorkingDays(targetDate, 3);

  // ── 2. Fetch sessions for this child on those days ────────────────────────
  const sessions = await Session.find({
    child_id,
    date: { $in: lookbackDays },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate("teacher_id", "name")
    .lean();

  // Map date → { teacher_id (string), teacher_name }
  const sessionByDate = {};
  for (const s of sessions) {
    if (s.teacher_id && s.teacher_id._id) {
      sessionByDate[s.date] = {
        teacher_id: s.teacher_id._id.toString(),
        teacher_name: s.teacher_id.name,
      };
    }
  }

  // ── 3. Count consecutive streak (most-recent day first) ──────────────────
  let streak = 0;
  let streakTeacherId = null;
  let streakTeacherName = null;

  for (const day of lookbackDays) {
    const entry = sessionByDate[day];
    if (!entry) break; // gap in schedule — streak broken

    if (streakTeacherId === null) {
      // Initialise with the most-recent teacher
      streakTeacherId = entry.teacher_id;
      streakTeacherName = entry.teacher_name;
      streak = 1;
    } else if (entry.teacher_id === streakTeacherId) {
      streak++; // same teacher — extend streak
    } else {
      break; // different teacher — streak broken
    }
  }

  // ── 4. No rotation needed ─────────────────────────────────────────────────
  if (streak < 3 || !streakTeacherId) {
    return {
      streak,
      shouldRotate: false,
      currentTeacher: streakTeacherId
        ? { id: streakTeacherId, name: streakTeacherName }
        : null,
      suggestedTeacher: null,
      noAlternative: false,
    };
  }

  // ── 5. Rotation due — find the best alternative teacher ──────────────────

  // Teachers on approved leave that day
  const onLeaveRecords = await LeaveRequest.find({
    date: targetDate,
    status: "approved",
  }).lean();
  const onLeaveIds = new Set(onLeaveRecords.map((l) => l.teacher_id.toString()));

  // All teachers in the same branch
  const teacherQuery = { roles: "teacher" };
  if (branch_id) teacherQuery.branch_id = branch_id;
  const allTeachers = await User.find(teacherQuery).lean();

  // Exclude: the current streak teacher + anyone on approved leave
  const candidates = allTeachers.filter(
    (t) =>
      t._id.toString() !== streakTeacherId &&
      !onLeaveIds.has(t._id.toString())
  );

  if (candidates.length === 0) {
    return {
      streak,
      shouldRotate: true,
      currentTeacher: { id: streakTeacherId, name: streakTeacherName },
      suggestedTeacher: null,
      noAlternative: true,
    };
  }

  // ── 6. Pick the least-loaded candidate (fewest sessions on targetDate) ────
  const withLoad = await Promise.all(
    candidates.map(async (t) => {
      const load = await Session.countDocuments({
        teacher_id: t._id,
        date: targetDate,
        status: { $in: ["scheduled", "rescheduled"] },
      });
      return { teacher: t, load };
    })
  );

  // Sort ascending by load; tie-break by name (deterministic)
  withLoad.sort((a, b) => a.load - b.load || a.teacher.name.localeCompare(b.teacher.name));
  const best = withLoad[0].teacher;

  return {
    streak,
    shouldRotate: true,
    currentTeacher: { id: streakTeacherId, name: streakTeacherName },
    suggestedTeacher: { id: best._id.toString(), name: best.name },
    noAlternative: false,
  };
};

// ─── Lightweight helper used by getShortfalls ─────────────────────────────────

/**
 * Returns only the consecutive streak count for a child.
 * Faster than checkAndSuggestRotation — skips teacher search.
 *
 * @param {string|ObjectId} child_id
 * @param {string}          targetDate  "YYYY-MM-DD"
 * @returns {Promise<number>}
 */
const getConsecutiveStreak = async (child_id, targetDate) => {
  const lookbackDays = getPreviousWorkingDays(targetDate, 3);

  const sessions = await Session.find({
    child_id,
    date: { $in: lookbackDays },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate("teacher_id", "name")
    .lean();

  const sessionByDate = {};
  for (const s of sessions) {
    if (s.teacher_id?._id) {
      sessionByDate[s.date] = s.teacher_id._id.toString();
    }
  }

  let streak = 0;
  let lastTeacher = null;

  for (const day of lookbackDays) {
    const tid = sessionByDate[day];
    if (!tid) break;
    if (lastTeacher === null) {
      lastTeacher = tid;
      streak = 1;
    } else if (tid === lastTeacher) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

module.exports = { checkAndSuggestRotation, getConsecutiveStreak };
