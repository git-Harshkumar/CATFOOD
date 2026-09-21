const validateRegister = (body) => {
  const errors = {};
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.email = 'Valid email is required.';
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = 'Name is required.';
  }
  if (body.role && !['ORGANIZER', 'JUDGE', 'PARTICIPANT'].includes(body.role)) {
    errors.role = 'Role must be one of: ORGANIZER, JUDGE, PARTICIPANT.';
  }
  return errors;
};

const validateLogin = (body) => {
  const errors = {};
  if (!body.email || typeof body.email !== 'string') {
    errors.email = 'Email is required.';
  }
  if (!body.password || typeof body.password !== 'string') {
    errors.password = 'Password is required.';
  }
  return errors;
};

const validateEvent = (body) => {
  const errors = {};
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.title = 'Event title is required.';
  }
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.description = 'Event description is required.';
  }
  if (!body.startDate || isNaN(Date.parse(body.startDate))) {
    errors.startDate = 'Valid start date is required.';
  }
  if (!body.deadline || isNaN(Date.parse(body.deadline))) {
    errors.deadline = 'Valid submission deadline is required.';
  }
  if (body.startDate && body.deadline && new Date(body.startDate) >= new Date(body.deadline)) {
    errors.deadline = 'Submission deadline must be after start date.';
  }
  return errors;
};

const validateCriterion = (body) => {
  const errors = {};
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = 'Criterion name is required.';
  }
  if (body.maxScore !== undefined && (typeof body.maxScore !== 'number' || body.maxScore <= 0)) {
    errors.maxScore = 'Max score must be a positive number.';
  }
  if (body.weight !== undefined && (typeof body.weight !== 'number' || body.weight <= 0)) {
    errors.weight = 'Weight must be a positive number.';
  }
  return errors;
};

const validateTeam = (body) => {
  const errors = {};
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = 'Team name is required.';
  }
  if (!body.eventId || isNaN(parseInt(body.eventId, 10))) {
    errors.eventId = 'Valid eventId is required.';
  }
  return errors;
};

const validateJoinTeam = (body) => {
  const errors = {};
  if (!body.inviteCode || typeof body.inviteCode !== 'string' || body.inviteCode.trim().length === 0) {
    errors.inviteCode = 'Invite code is required.';
  }
  return errors;
};

const validateSubmission = (body) => {
  const errors = {};
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.title = 'Project title is required.';
  }
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.description = 'Project description is required.';
  }
  return errors;
};

const validateScore = (body) => {
  const errors = {};
  if (!Array.isArray(body.scores) || body.scores.length === 0) {
    errors.scores = 'Scores array is required and must not be empty.';
  } else {
    for (let i = 0; i < body.scores.length; i++) {
      const item = body.scores[i];
      if (!item.criterionId || isNaN(parseInt(item.criterionId, 10))) {
        errors[`scores[${i}].criterionId`] = 'Valid criterionId is required.';
      }
      if (item.score === undefined || typeof item.score !== 'number' || item.score < 0) {
        errors[`scores[${i}].score`] = 'Score must be a non-negative number.';
      }
    }
  }
  return errors;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateEvent,
  validateCriterion,
  validateTeam,
  validateJoinTeam,
  validateSubmission,
  validateScore,
};
