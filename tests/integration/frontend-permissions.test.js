import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasRole,
  canCreateEvent,
  isEventOrganizer,
  isEventJudge,
  canScore,
  canAccessOrganizerPortal,
  canAccessJudgePortal,
  canParticipate,
} from '../../frontend/src/utils/permissions.js';

describe('Frontend Role-Based Permissions & Security Boundary Audit Suite', () => {
  const participantUser = { id: 101, role: 'PARTICIPANT', email: 'alice@hack.com' };
  const judgeUser = {
    id: 201,
    role: 'JUDGE',
    email: 'judge1@hack.com',
    judgeProfiles: [{ eventId: 1 }],
  };
  const organizerUser = {
    id: 301,
    role: 'ORGANIZER',
    email: 'organizer@hack.com',
    organizedEvents: [{ id: 1 }],
  };
  const otherOrganizerUser = {
    id: 302,
    role: 'ORGANIZER',
    email: 'other@hack.com',
    organizedEvents: [{ id: 2 }],
  };
  const adminUser = { id: 999, role: 'ADMIN', isGlobalAdmin: true, email: 'admin@hack.com' };

  describe('Unauthenticated Access (Guest)', () => {
    test('Unauthenticated user fails all permission checks safely', () => {
      assert.strictEqual(hasRole(null, 'PARTICIPANT'), false);
      assert.strictEqual(hasRole(undefined, 'ORGANIZER'), false);
      assert.strictEqual(canCreateEvent(null), false);
      assert.strictEqual(canScore(null), false);
      assert.strictEqual(canAccessOrganizerPortal(null), false);
      assert.strictEqual(canAccessJudgePortal(null), false);
      assert.strictEqual(canParticipate(null), false);
      assert.strictEqual(isEventOrganizer(null, 1), false);
      assert.strictEqual(isEventJudge(null, 1), false);
    });
  });

  describe('Participant Role Audit', () => {
    test('Participant can participate and view teams', () => {
      assert.strictEqual(canParticipate(participantUser), true);
      assert.strictEqual(hasRole(participantUser, 'PARTICIPANT'), true);
    });

    test('Participant CANNOT create events or access Organizer Portal', () => {
      assert.strictEqual(canCreateEvent(participantUser), false);
      assert.strictEqual(canAccessOrganizerPortal(participantUser), false);
      assert.strictEqual(hasRole(participantUser, 'ORGANIZER'), false);
      assert.strictEqual(isEventOrganizer(participantUser, 1), false);
      assert.strictEqual(isEventOrganizer(participantUser, { id: 1, organizerId: 301 }), false);
    });

    test('Participant CANNOT score submissions or access Judge Portal', () => {
      assert.strictEqual(canScore(participantUser), false);
      assert.strictEqual(canAccessJudgePortal(participantUser), false);
      assert.strictEqual(hasRole(participantUser, 'JUDGE'), false);
      assert.strictEqual(isEventJudge(participantUser, 1), false);
    });
  });

  describe('Judge Role Audit', () => {
    test('Judge can score and access Judge Portal', () => {
      assert.strictEqual(canScore(judgeUser), true);
      assert.strictEqual(canAccessJudgePortal(judgeUser), true);
      assert.strictEqual(hasRole(judgeUser, 'JUDGE'), true);
    });

    test('Judge CANNOT create events or access Organizer Portal', () => {
      assert.strictEqual(canCreateEvent(judgeUser), false);
      assert.strictEqual(canAccessOrganizerPortal(judgeUser), false);
      assert.strictEqual(hasRole(judgeUser, 'ORGANIZER'), false);
    });

    test('Judge is recognized only for assigned events', () => {
      assert.strictEqual(isEventJudge(judgeUser, 1), true);
      assert.strictEqual(isEventJudge(judgeUser, 99), false);
      assert.strictEqual(
        isEventJudge(judgeUser, { id: 1, judges: [{ userId: 201 }] }),
        true
      );
      assert.strictEqual(
        isEventJudge(judgeUser, { id: 2, judges: [{ userId: 999 }] }),
        false
      );
    });
  });

  describe('Organizer Role Audit', () => {
    test('Organizer can create events and access Organizer Portal', () => {
      assert.strictEqual(canCreateEvent(organizerUser), true);
      assert.strictEqual(canAccessOrganizerPortal(organizerUser), true);
      assert.strictEqual(hasRole(organizerUser, 'ORGANIZER'), true);
    });

    test('Organizer CANNOT score submissions unless assigned as Judge', () => {
      assert.strictEqual(canScore(organizerUser), false);
      assert.strictEqual(canAccessJudgePortal(organizerUser), false);
      assert.strictEqual(hasRole(organizerUser, 'JUDGE'), false);
      assert.strictEqual(isEventJudge(organizerUser, 1), false);
    });

    test('Organizer has ownership over own events only', () => {
      assert.strictEqual(isEventOrganizer(organizerUser, 1), true);
      assert.strictEqual(isEventOrganizer(organizerUser, 2), false);
      assert.strictEqual(isEventOrganizer(organizerUser, { id: 1, organizerId: 301 }), true);
      assert.strictEqual(isEventOrganizer(organizerUser, { id: 2, organizerId: 302 }), false);
      assert.strictEqual(isEventOrganizer(otherOrganizerUser, { id: 1, organizerId: 301 }), false);
    });
  });

  describe('Admin Role Audit', () => {
    test('Admin passes all role checks (superuser bypass)', () => {
      assert.strictEqual(hasRole(adminUser, 'ORGANIZER'), true);
      assert.strictEqual(hasRole(adminUser, 'JUDGE'), true);
      assert.strictEqual(hasRole(adminUser, 'PARTICIPANT'), true);
      assert.strictEqual(canCreateEvent(adminUser), true);
      assert.strictEqual(canScore(adminUser), true);
      assert.strictEqual(canAccessOrganizerPortal(adminUser), true);
      assert.strictEqual(canAccessJudgePortal(adminUser), true);
      assert.strictEqual(canParticipate(adminUser), true);
      assert.strictEqual(isEventOrganizer(adminUser, 1), true);
      assert.strictEqual(isEventOrganizer(adminUser, { id: 2, organizerId: 302 }), true);
      assert.strictEqual(isEventJudge(adminUser, 1), true);
      assert.strictEqual(isEventJudge(adminUser, { id: 2, judges: [] }), true);
    });
  });
});
