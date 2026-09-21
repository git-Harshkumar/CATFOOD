# Implementation Guide — Teams & Roster Management

## 1. Overview

Teams allow participants to collaborate on projects. Each team is associated with exactly one hackathon event.

---

## 2. Team Invariants & Constraints

1. **Unique Team Name Per Event**:
   Enforced via Prisma constraint:
   ```prisma
   @@unique([eventId, name])
   ```
2. **Single Team Per Event Per User**:
   A participant cannot belong to multiple teams in the same hackathon. Enforced before team creation and membership addition.
3. **Team Size Cap**:
   Cannot exceed `event.maxTeamSize`.
4. **Invite Code Uniqueness**:
   Unique index on `inviteCode`. Codes are generated via:
   ```javascript
   const generateInviteCode = () => {
     return 'TEAM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
   };
   ```

---

## 3. Team Roster Lifecycle

### Creating a Team
The creator automatically becomes the `leaderId` and the first `TeamMember` in an atomic Prisma transaction:
```javascript
const team = await prisma.$transaction(async (tx) => {
  const newTeam = await tx.team.create({ data: { eventId, name, inviteCode, leaderId: userId } });
  await tx.teamMember.create({ data: { teamId: newTeam.id, userId } });
  return newTeam;
});
```

### Leaving a Team
- If the lone member leaves, the team is automatically disbanded.
- If the team leader leaves but other members remain, leadership is automatically transferred to the next member in the roster.
