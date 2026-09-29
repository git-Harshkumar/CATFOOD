const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { canImportExport } = require('../utils/permissions');
const { validateId, validateEmail, sanitizeCsvFormula } = require('../utils/validation');
const { dispatchEvent } = require('./webhookService');
const auditService = require('./auditService');

/**
 * Validate a single project import row.
 */
const validateProjectRow = (p, idx) => {
  const errors = [];
  if (!p || typeof p !== 'object') {
    return { valid: false, errors: [{ row: idx + 1, field: 'row', error: 'Row must be a valid JSON object' }] };
  }

  const title = (p.title || p.name || '').trim();
  if (!title) {
    errors.push({ row: idx + 1, field: 'title', error: 'Project title is required' });
  }

  if (p.leaderEmail) {
    try {
      validateEmail(p.leaderEmail);
    } catch (e) {
      errors.push({ row: idx + 1, field: 'leaderEmail', error: 'Invalid leader email format', value: p.leaderEmail });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate a single judge import row.
 */
const validateJudgeRow = (j, idx) => {
  const errors = [];
  if (!j || typeof j !== 'object') {
    return { valid: false, errors: [{ row: idx + 1, field: 'row', error: 'Row must be a valid JSON object' }] };
  }

  if (!j.email || typeof j.email !== 'string') {
    errors.push({ row: idx + 1, field: 'email', error: 'Judge email is required' });
  } else {
    try {
      validateEmail(j.email);
    } catch (e) {
      errors.push({ row: idx + 1, field: 'email', error: 'Invalid email format', value: j.email });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Preview bulk import without performing database mutations.
 */
const previewBulkImport = async (eventId, itemsList, type = 'projects', currentUser) => {
  const parsedEventId = validateId(eventId, 'Event ID');
  const isAllowed = await canImportExport(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can import data.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(itemsList)) {
    const error = new Error('Items must be an array of objects.');
    error.statusCode = 400;
    throw error;
  }

  const allErrors = [];
  const validRows = [];

  for (let idx = 0; idx < itemsList.length; idx++) {
    const row = itemsList[idx];
    const validation = type === 'judges' ? validateJudgeRow(row, idx) : validateProjectRow(row, idx);
    if (!validation.valid) {
      allErrors.push(...validation.errors);
    } else {
      validRows.push(row);
    }
  }

  return {
    totalItems: itemsList.length,
    validCount: validRows.length,
    errorCount: allErrors.length,
    errors: allErrors,
    canProceed: allErrors.length === 0,
  };
};

/**
 * Bulk import projects atomically into an event.
 */
const bulkImportProjects = async (eventId, projectsList, currentUser) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canImportExport(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can bulk import projects.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(projectsList) || projectsList.length === 0) {
    const error = new Error('Array of project objects is required.');
    error.statusCode = 400;
    throw error;
  }

  // Upfront Dataset Validation
  const validationErrors = [];
  for (let i = 0; i < projectsList.length; i++) {
    const res = validateProjectRow(projectsList[i], i);
    if (!res.valid) validationErrors.push(...res.errors);
  }

  if (validationErrors.length > 0) {
    const err = new Error('Import validation failed on one or more rows.');
    err.statusCode = 400;
    err.errors = validationErrors;
    throw err;
  }

  // Pre-generate secure random password hash once (avoids CPU loop blockage and hardcoded password123)
  const secureRandomPassword = crypto.randomBytes(16).toString('hex');
  const tempPasswordHash = await bcrypt.hash(secureRandomPassword, 10);

  // Execute in an ATOMIC transaction
  const result = await prisma.$transaction(async (tx) => {
    const createdSubmissions = [];

    for (let idx = 0; idx < projectsList.length; idx++) {
      const p = projectsList[idx];
      const rawTitle = (p.title || p.name || `Project ${idx + 1}`).trim();
      const safeTitle = sanitizeCsvFormula(rawTitle);
      const safeTagline = sanitizeCsvFormula(p.tagline || p.summary || '');
      const safeDesc = sanitizeCsvFormula(p.description || p.summary || 'Imported via bulk API.');
      const safeTeamName = sanitizeCsvFormula(p.teamName || p.team || `Team ${safeTitle}`);

      const rawEmail = p.leaderEmail || p.submitterEmail || p.email;
      const leaderEmail = rawEmail ? rawEmail.trim().toLowerCase() : `lead_${Date.now()}_${idx}@example.org`;

      let leader = await tx.user.findUnique({ where: { email: leaderEmail } });
      if (!leader) {
        leader = await tx.user.create({
          data: {
            email: leaderEmail,
            name: sanitizeCsvFormula(p.leaderName || p.submitterName || 'Team Leader'),
            passwordHash: tempPasswordHash,
          },
        });
      }

      let team = await tx.team.findFirst({
        where: { eventId: parsedEventId, name: safeTeamName },
      });

      if (!team) {
        team = await tx.team.create({
          data: {
            eventId: parsedEventId,
            name: safeTeamName,
            inviteCode: `BULK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            leaderId: leader.id,
            isRegistered: true,
          },
        });

        await tx.teamMember.create({
          data: { teamId: team.id, userId: leader.id },
        });
      }

      let trackId = null;
      if (p.trackName || p.track) {
        const trackQuery = p.trackName || p.track;
        const track = await tx.track.findFirst({
          where: { eventId: parsedEventId, name: { contains: trackQuery } },
        });
        if (track) trackId = track.id;
      }

      const existingSubmission = await tx.submission.findUnique({ where: { teamId: team.id } });
      if (existingSubmission) {
        const error = new Error(`Row ${idx + 1}: Team '${safeTeamName}' already has a project submission.`);
        error.statusCode = 409;
        throw error;
      }

      const submission = await tx.submission.create({
        data: {
          eventId: parsedEventId,
          teamId: team.id,
          trackId,
          title: safeTitle,
          tagline: safeTagline,
          description: safeDesc,
          repoUrl: p.repoUrl || p.repo_url || null,
          demoUrl: p.demoUrl || null,
          techStack: sanitizeCsvFormula(p.techStack || null),
          status: p.status || 'SUBMITTED',
        },
      });

      createdSubmissions.push(submission);
    }

    return createdSubmissions;
  });

  // Outbound Webhook dispatch
  await dispatchEvent('bulk.import_completed', parsedEventId, {
    type: 'PROJECTS',
    count: result.length,
    timestamp: new Date().toISOString(),
  });

  // Audit Logging
  await auditService.logAction({
    eventId: parsedEventId,
    actorId: currentUser?.id,
    action: 'BULK_IMPORT_PROJECTS',
    targetType: 'Event',
    targetId: parsedEventId,
    metadata: { importedCount: result.length },
  });

  return {
    importedCount: result.length,
    submissions: result,
  };
};

/**
 * Bulk import judges atomically into an event.
 */
const bulkImportJudges = async (eventId, judgesList, currentUser) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canImportExport(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can bulk import judges.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(judgesList) || judgesList.length === 0) {
    const error = new Error('Array of judge objects is required.');
    error.statusCode = 400;
    throw error;
  }

  // Upfront Dataset Validation
  const validationErrors = [];
  for (let i = 0; i < judgesList.length; i++) {
    const res = validateJudgeRow(judgesList[i], i);
    if (!res.valid) validationErrors.push(...res.errors);
  }

  if (validationErrors.length > 0) {
    const err = new Error('Import validation failed on one or more judge rows.');
    err.statusCode = 400;
    err.errors = validationErrors;
    throw err;
  }

  const secureRandomPassword = crypto.randomBytes(16).toString('hex');
  const tempPasswordHash = await bcrypt.hash(secureRandomPassword, 10);

  // Execute in an ATOMIC transaction
  const importedJudges = await prisma.$transaction(async (tx) => {
    const records = [];

    for (const j of judgesList) {
      const email = j.email.trim().toLowerCase();
      const safeName = sanitizeCsvFormula(j.name || 'Judge');

      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            name: safeName,
            passwordHash: tempPasswordHash,
          },
        });
      }

      const existingMember = await tx.eventMember.findUnique({
        where: { eventId_userId: { eventId: parsedEventId, userId: user.id } },
      });
      if (!existingMember) {
        await tx.eventMember.create({
          data: { eventId: parsedEventId, userId: user.id, role: 'JUDGE' },
        });
      }

      let judgeRecord = await tx.judge.findUnique({
        where: { eventId_userId: { eventId: parsedEventId, userId: user.id } },
      });
      if (!judgeRecord) {
        judgeRecord = await tx.judge.create({
          data: { eventId: parsedEventId, userId: user.id, status: 'CONFIRMED' },
        });
      }

      records.push({ judgeId: judgeRecord.id, userId: user.id, email: user.email, name: user.name });
    }

    return records;
  });

  // Outbound Webhook dispatch
  await dispatchEvent('bulk.import_completed', parsedEventId, {
    type: 'JUDGES',
    count: importedJudges.length,
    timestamp: new Date().toISOString(),
  });

  // Audit Logging
  await auditService.logAction({
    eventId: parsedEventId,
    actorId: currentUser?.id,
    action: 'BULK_IMPORT_JUDGES',
    targetType: 'Event',
    targetId: parsedEventId,
    metadata: { importedCount: importedJudges.length },
  });

  return {
    importedCount: importedJudges.length,
    judges: importedJudges,
  };
};

/**
 * Bulk export full versioned event bundle JSON (Portable format).
 */
const exportEventBundle = async (eventId, currentUser, options = {}) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  const isAllowed = await canImportExport(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can export full event data.');
    error.statusCode = 403;
    throw error;
  }

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      tracks: true,
      prizes: true,
      questions: true,
      teams: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      judges: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          tracks: { include: { track: true } },
        },
      },
      submissions: {
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          scores: {
            include: {
              criterion: true,
              judge: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          comments: {
            where: { isDeleted: false },
            select: { id: true, authorName: true, content: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const anonymizeJudges = Boolean(options.anonymizeJudges);

  // Map judges to anonymous aliases if requested for blind evaluation export
  const judgeAliasMap = new Map();
  if (anonymizeJudges) {
    event.judges.forEach((j, idx) => {
      judgeAliasMap.set(j.id, `Judge ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? idx : ''}`);
    });
  }

  // Construct structured versioned bundle (free of password hashes, secrets, and private keys)
  const bundle = {
    format: 'catfood-event-bundle',
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: 'CATFOOD 2026 Hackathon Judgment Platform',
    event: {
      title: sanitizeCsvFormula(event.title),
      description: sanitizeCsvFormula(event.description),
      rules: sanitizeCsvFormula(event.rules || ''),
      startDate: event.startDate,
      deadline: event.deadline,
      submissionsOpen: event.submissionsOpen,
      maxTeamSize: event.maxTeamSize,
      minTeamSize: event.minTeamSize,
    },
    tracks: event.tracks.map((t) => ({ name: sanitizeCsvFormula(t.name), description: sanitizeCsvFormula(t.description) })),
    criteria: event.criteria.map((c) => ({ name: sanitizeCsvFormula(c.name), maxScore: c.maxScore, weight: c.weight })),
    prizes: event.prizes.map((p) => ({ name: sanitizeCsvFormula(p.name), description: sanitizeCsvFormula(p.description), value: p.value })),
    teams: event.teams.map((t) => ({
      name: sanitizeCsvFormula(t.name),
      members: t.members.map((m) => ({ name: sanitizeCsvFormula(m.user.name), email: m.user.email })),
    })),
    submissions: event.submissions.map((s) => ({
      title: sanitizeCsvFormula(s.title),
      tagline: sanitizeCsvFormula(s.tagline),
      description: sanitizeCsvFormula(s.description),
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl,
      techStack: sanitizeCsvFormula(s.techStack),
      teamName: sanitizeCsvFormula(s.team?.name),
      trackName: sanitizeCsvFormula(s.track?.name),
      scores: s.scores.map((sc) => ({
        criterionName: sc.criterion?.name,
        score: sc.score,
        judgeIdentifier: anonymizeJudges ? judgeAliasMap.get(sc.judgeId) : sc.judge?.user?.email,
      })),
      comments: s.comments,
    })),
    judges: event.judges.map((j) => ({
      name: anonymizeJudges ? judgeAliasMap.get(j.id) : sanitizeCsvFormula(j.user.name),
      email: anonymizeJudges ? null : j.user.email,
      tracks: j.tracks.map((jt) => jt.track?.name).filter(Boolean),
    })),
  };

  // Dispatch Webhook
  await dispatchEvent('bulk.export_generated', parsedEventId, {
    format: 'catfood-event-bundle',
    version: 1,
    submissionsCount: bundle.submissions.length,
    teamsCount: bundle.teams.length,
  });

  return bundle;
};

/**
 * Re-import a versioned event bundle into a new clean hackathon (Round-Trip Portability).
 */
const importEventBundle = async (bundle, currentUser) => {
  if (!bundle || bundle.format !== 'catfood-event-bundle' || bundle.exportVersion !== 1) {
    const error = new Error('Invalid event bundle format. Must be catfood-event-bundle version 1.');
    error.statusCode = 400;
    throw error;
  }

  const { event: evData, tracks, criteria, prizes, teams, submissions, judges } = bundle;
  const organizerId = currentUser.id;

  const secureRandomPassword = crypto.randomBytes(16).toString('hex');
  const tempPasswordHash = await bcrypt.hash(secureRandomPassword, 10);

  // Execute full restoration inside an atomic transaction
  const importedEvent = await prisma.$transaction(async (tx) => {
    // 1. Create Event
    const newEvent = await tx.event.create({
      data: {
        title: evData.title || 'Imported Event',
        description: evData.description || 'Restored from CATFOOD event bundle.',
        rules: evData.rules || null,
        startDate: new Date(evData.startDate || Date.now()),
        deadline: new Date(evData.deadline || Date.now() + 86400000),
        maxTeamSize: evData.maxTeamSize || 4,
        minTeamSize: evData.minTeamSize || 1,
        organizerId,
        status: 'PUBLISHED',
      },
    });

    // 2. Tracks Map
    const trackMap = new Map();
    if (Array.isArray(tracks)) {
      for (const t of tracks) {
        const created = await tx.track.create({
          data: { eventId: newEvent.id, name: t.name, description: t.description || null },
        });
        trackMap.set(t.name, created.id);
      }
    }

    // 3. Criteria Map
    const criteriaMap = new Map();
    if (Array.isArray(criteria)) {
      for (const c of criteria) {
        const created = await tx.criterion.create({
          data: { eventId: newEvent.id, name: c.name, maxScore: c.maxScore || 10, weight: c.weight || 1.0 },
        });
        criteriaMap.set(c.name, created.id);
      }
    }

    // 4. Prizes
    if (Array.isArray(prizes)) {
      for (const p of prizes) {
        await tx.prize.create({
          data: { eventId: newEvent.id, name: p.name, description: p.description || null, value: p.value || null },
        });
      }
    }

    // 5. Teams & Members
    const teamMap = new Map();
    if (Array.isArray(teams)) {
      for (const t of teams) {
        let leaderId = organizerId;
        if (t.members && t.members[0]?.email) {
          const leaderEmail = t.members[0].email.trim().toLowerCase();
          let user = await tx.user.findUnique({ where: { email: leaderEmail } });
          if (!user) {
            user = await tx.user.create({
              data: { email: leaderEmail, name: t.members[0].name || 'Team Leader', passwordHash: tempPasswordHash },
            });
          }
          leaderId = user.id;
        }

        const createdTeam = await tx.team.create({
          data: {
            eventId: newEvent.id,
            name: t.name,
            leaderId,
            inviteCode: `RESTORE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            isRegistered: true,
          },
        });
        teamMap.set(t.name, createdTeam.id);

        if (Array.isArray(t.members)) {
          for (const m of t.members) {
            if (!m.email) continue;
            let memUser = await tx.user.findUnique({ where: { email: m.email.trim().toLowerCase() } });
            if (!memUser) {
              memUser = await tx.user.create({
                data: { email: m.email.trim().toLowerCase(), name: m.name || 'Member', passwordHash: tempPasswordHash },
              });
            }
            await tx.teamMember.create({
              data: { teamId: createdTeam.id, userId: memUser.id },
            });
          }
        }
      }
    }

    // 6. Submissions
    if (Array.isArray(submissions)) {
      for (const s of submissions) {
        const teamId = teamMap.get(s.teamName);
        if (!teamId) continue;
        const trackId = s.trackName ? trackMap.get(s.trackName) : null;

        await tx.submission.create({
          data: {
            eventId: newEvent.id,
            teamId,
            trackId,
            title: s.title,
            tagline: s.tagline || '',
            description: s.description || '',
            repoUrl: s.repoUrl || null,
            demoUrl: s.demoUrl || null,
            techStack: s.techStack || null,
            status: 'SUBMITTED',
          },
        });
      }
    }

    return newEvent;
  });

  return {
    success: true,
    message: 'Event bundle imported successfully.',
    id: importedEvent.id,
    eventId: importedEvent.id,
    title: importedEvent.title,
  };
};

module.exports = {
  previewBulkImport,
  bulkImportProjects,
  bulkImportJudges,
  exportEventBundle,
  importEventBundle,
};
