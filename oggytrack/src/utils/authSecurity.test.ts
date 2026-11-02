import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AccountRecordLike,
  hashRecoveryAnswer,
  hashSecret,
  isHashedSecret,
  redactSensitiveText,
  resetPasswordWithRecovery,
  sanitizeUserProfile,
  sha256Hex,
  upgradeAccountRecord,
  validateAndApplySecurityUpdate,
  verifyRecoveryChallenge,
  verifySecret,
} from './authSecurity';

function createSeedAccounts(): Record<string, AccountRecordLike> {
  return {
    alex: {
      username: 'alex',
      passwordHash: hashSecret('secret123'),
      friendNameHash: hashRecoveryAnswer('Rohan Sharma'),
      createdAt: '2026-10-01T00:00:00.000Z',
      profile: {
        id: 'usr_alex',
        name: 'Alex',
        studentId: 'STU-4421',
        institution: 'College of Technology',
        degree: 'B.Tech CS',
        academicYear: '2026-2027',
        semester: 'Semester 3',
        targetAttendance: 75,
        hasRecoveryFriend: true,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hasCompletedTutorial: true,
      },
    },
    legacy: {
      username: 'legacy',
      passwordHash: '',
      password: 'oldpass',
      createdAt: '2026-09-01T00:00:00.000Z',
      profile: {
        id: 'usr_legacy',
        name: 'Legacy User',
        studentId: 'STU-9001',
        institution: 'College of Technology',
        degree: 'B.Tech ECE',
        academicYear: '2026-2027',
        semester: 'Semester 5',
        targetAttendance: 75,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hasCompletedTutorial: true,
      },
    },
  };
}

test('FIPS 180-4 SHA-256 matches NIST test vectors and salted hashes never collide', () => {
  assert.equal(
    sha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  assert.equal(
    sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
  );

  const hashA = hashSecret('MySecretPass!42');
  const hashB = hashSecret('MySecretPass!42');
  assert.equal(isHashedSecret(hashA), true);
  assert.equal(isHashedSecret(hashB), true);
  assert.notEqual(hashA, hashB, 'unique random salts must yield distinct hashes');
  assert.equal(verifySecret('MySecretPass!42', hashA), true);
  assert.equal(verifySecret('MySecretPass!42', hashB), true);
  assert.equal(verifySecret('WrongPass', hashA), false);
});

test('changing password requires matching old password and stores zero plaintext secrets', () => {
  const accounts = createSeedAccounts();

  const missingOld = validateAndApplySecurityUpdate({
    accounts,
    currentUsername: 'alex',
    nextUsername: 'alex',
    oldPassword: '',
    newPassword: 'newpass99',
    confirmPassword: 'newpass99',
    friendName: '',
  });
  assert.equal(missingOld.success, false);
  assert.match(missingOld.error || '', /old password/i);

  const wrongOld = validateAndApplySecurityUpdate({
    accounts,
    currentUsername: 'alex',
    nextUsername: 'alex',
    oldPassword: 'wrongpassword',
    newPassword: 'newpass99',
    confirmPassword: 'newpass99',
    friendName: '',
  });
  assert.equal(wrongOld.success, false);
  assert.match(wrongOld.error || '', /Old password is incorrect/i);

  const validChange = validateAndApplySecurityUpdate({
    accounts,
    currentUsername: 'alex',
    nextUsername: 'alex',
    oldPassword: 'secret123',
    newPassword: 'newpass99',
    confirmPassword: 'newpass99',
    friendName: 'Maya',
  });
  assert.equal(validChange.success, true);
  assert.equal(validChange.passwordChanged, true);

  const updatedAlex = validChange.updatedAccounts?.alex;
  assert.ok(updatedAlex);
  assert.equal(isHashedSecret(updatedAlex.passwordHash), true);
  assert.equal(isHashedSecret(updatedAlex.friendNameHash), true);
  assert.equal(updatedAlex.password, undefined);
  assert.equal(updatedAlex.friendName, undefined);
  assert.equal(verifySecret('newpass99', updatedAlex.passwordHash), true);

  const serialized = JSON.stringify(validChange.updatedAccounts);
  assert.equal(serialized.includes('newpass99'), false);
  assert.equal(serialized.includes('secret123'), false);
  assert.equal(serialized.includes('oldpass'), false);
  assert.equal(serialized.includes('Maya'), false);
  assert.equal(serialized.includes('Rohan'), false);
});

test('updating username or leaving friend name blank keeps existing hashed secrets intact', () => {
  const accounts = createSeedAccounts();
  const res = validateAndApplySecurityUpdate({
    accounts,
    currentUsername: 'legacy',
    nextUsername: 'legacy_updated',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    friendName: 'Aarav',
  });

  assert.equal(res.success, true);
  assert.equal(res.passwordChanged, false);
  assert.equal(res.updatedAccounts?.legacy, undefined);
  const updatedLegacy = res.updatedAccounts?.legacy_updated;
  assert.ok(updatedLegacy);
  assert.equal(isHashedSecret(updatedLegacy.passwordHash), true);
  assert.equal(verifySecret('oldpass', updatedLegacy.passwordHash), true);
  assert.equal(isHashedSecret(updatedLegacy.friendNameHash), true);

  // Leaving friendName blank on subsequent update keeps Aarav recovery intact
  const secondUpdate = validateAndApplySecurityUpdate({
    accounts: res.updatedAccounts!,
    currentUsername: 'legacy_updated',
    nextUsername: 'legacy_renamed',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    friendName: '',
  });
  assert.equal(secondUpdate.success, true);
  const verifyPreservedFriend = verifyRecoveryChallenge({
    accounts: secondUpdate.updatedAccounts!,
    username: 'legacy_renamed',
    method: 'friend',
    answer: '  aarav ',
  });
  assert.equal(verifyPreservedFriend.success, true);
});

test('forgot password verifies hashed friend name case-insensitively and resets password', () => {
  const accounts = createSeedAccounts();

  const badFriend = verifyRecoveryChallenge({
    accounts,
    username: 'alex',
    method: 'friend',
    answer: 'Someone Else',
  });
  assert.equal(badFriend.success, false);

  const goodFriend = verifyRecoveryChallenge({
    accounts,
    username: 'ALEX',
    method: 'friend',
    answer: '  rohan   sharma ',
  });
  assert.equal(goodFriend.success, true);

  const reset = resetPasswordWithRecovery({
    accounts,
    username: 'alex',
    method: 'friend',
    answer: 'rohan sharma',
    newPassword: 'brandnew456',
    confirmPassword: 'brandnew456',
  });
  assert.equal(reset.success, true);
  assert.equal(isHashedSecret(reset.updatedAccounts?.alex.passwordHash), true);
  assert.equal(verifySecret('brandnew456', reset.updatedAccounts?.alex.passwordHash), true);
  assert.equal(JSON.stringify(reset.updatedAccounts).includes('brandnew456'), false);
});

test('legacy account without friend name migrates cleanly and recovers via Student ID', () => {
  const accounts = createSeedAccounts();
  const migrated = upgradeAccountRecord(accounts.legacy);
  assert.equal(migrated.didMigrate, true);
  assert.equal(migrated.upgraded.password, undefined);
  assert.equal(isHashedSecret(migrated.upgraded.passwordHash), true);

  const noFriend = verifyRecoveryChallenge({
    accounts,
    username: 'legacy',
    method: 'friend',
    answer: 'Any Name',
  });
  assert.equal(noFriend.success, false);
  assert.equal(noFriend.SuggestTryAnotherWay, true);

  const viaStudentId = resetPasswordWithRecovery({
    accounts,
    username: 'legacy',
    method: 'studentId',
    answer: 'stu-9001',
    newPassword: 'recovered789',
    confirmPassword: 'recovered789',
  });
  assert.equal(viaStudentId.success, true);
  assert.equal(verifySecret('recovered789', viaStudentId.updatedAccounts?.legacy.passwordHash), true);
  assert.equal(JSON.stringify(viaStudentId.updatedAccounts).includes('recovered789'), false);
});

test('sanitizeUserProfile and redactSensitiveText strip secrets from profiles and error logs', () => {
  const dirtyProfile = {
    id: 'usr_1',
    name: 'Priya',
    email: 'priya@secret.edu',
    timezone: 'Asia/Kolkata',
    recoveryFriendName: 'Kabir',
    password: 'leakedPassword',
    studentId: 'STU-7777',
    institution: 'IIT',
    degree: 'B.Tech',
    academicYear: '2026-2027',
    semester: 'Semester 4',
    targetAttendance: 80,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const,
  };

  const clean = sanitizeUserProfile(dirtyProfile as unknown as Parameters<typeof sanitizeUserProfile>[0]);
  const cleanJson = JSON.stringify(clean);
  assert.equal(clean.hasRecoveryFriend, true);
  assert.equal(cleanJson.includes('priya@secret.edu'), false);
  assert.equal(cleanJson.includes('Asia/Kolkata'), false);
  assert.equal(cleanJson.includes('Kabir'), false);
  assert.equal(cleanJson.includes('leakedPassword'), false);

  const redacted = redactSensitiveText(
    'Request failed with key AIzaSyD1234567890abcdefghijklmnop and Authorization: Bearer eyJhbGciOiJIUzI1NiJ9 and GEMINI_API_KEY=mySecretKey99'
  );
  assert.equal(redacted.includes('AIzaSy'), false);
  assert.equal(redacted.includes('eyJhbGciOiJIUzI1NiJ9'), false);
  assert.equal(redacted.includes('mySecretKey99'), false);
  assert.match(redacted, /\[REDACTED_API_KEY\]/);
  assert.match(redacted, /\[REDACTED_TOKEN\]/);
});
