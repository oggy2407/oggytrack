import { UserProfile } from '../types/oggytrack';

/**
 * Pure synchronous FIPS 180-4 SHA-256 + multi-round salted key derivation
 * for local-first credential protection and sensitive string redaction.
 *
 * Format: $acad$v1$<saltHex>$<digestHex>
 * Plaintext passwords and recovery friend names are NEVER stored in localStorage,
 * user profiles, or JSON workspace exports.
 */

const HASH_PREFIX = '$acad$v1$';
const KEY_STRETCH_ROUNDS = 1200;
const DOMAIN_PEPPER = 'acad-track::local-vault::v1';

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * Standard FIPS 180-4 SHA-256 over UTF-8 string input, returning lowercase hex.
 */
export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
  const bitLenLo = (bytes.length * 8) >>> 0;

  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const buffer = new Uint8Array(paddedLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setUint32(paddedLength - 8, bitLenHi, false);
  view.setUint32(paddedLength - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

export function generateRandomHex(byteLength: number = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSessionToken(): string {
  return `sess_${generateRandomHex(24)}`;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const codeA = i < a.length ? a.charCodeAt(i) : 0;
    const codeB = i < b.length ? b.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0;
}

export function isHashedSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\$acad\$v1\$[0-9a-f]{16,64}\$[0-9a-f]{64}$/i.test(value);
}

/**
 * Stretches a secret with a cryptographic random salt using iterated SHA-256.
 */
export function hashSecret(secret: string, providedSalt?: string): string {
  const salt = (providedSalt || generateRandomHex(16)).toLowerCase();
  let digest = sha256Hex(`${DOMAIN_PEPPER}:${salt}:${secret}`);
  for (let round = 1; round < KEY_STRETCH_ROUNDS; round++) {
    digest = sha256Hex(`${salt}:${round}:${digest}:${secret}`);
  }
  return `${HASH_PREFIX}${salt}$${digest}`;
}

/**
 * Verifies a plaintext candidate against a stored `$acad$v1$...` salted hash
 * (or transparently against a legacy unmigrated string before upgrading it).
 */
export function verifySecret(
  candidate: string,
  storedHashOrLegacy: string | undefined | null
): boolean {
  if (!storedHashOrLegacy || !candidate) return false;

  if (isHashedSecret(storedHashOrLegacy)) {
    const parts = storedHashOrLegacy.split('$');
    // ['', 'acad', 'v1', '<salt>', '<digest>']
    const salt = parts[3];
    const expectedHash = storedHashOrLegacy.toLowerCase();
    const candidateHash = hashSecret(candidate, salt).toLowerCase();
    return constantTimeEqual(candidateHash, expectedHash);
  }

  return constantTimeEqual(candidate, storedHashOrLegacy);
}

export function normalizeRecoveryToken(value: string | undefined | null): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hashRecoveryAnswer(rawAnswer: string, providedSalt?: string): string | undefined {
  const normalized = normalizeRecoveryToken(rawAnswer);
  if (!normalized) return undefined;
  return hashSecret(normalized, providedSalt);
}

export function verifyRecoveryAnswer(
  candidateAnswer: string,
  storedHashOrLegacy: string | undefined | null
): boolean {
  const normalizedCandidate = normalizeRecoveryToken(candidateAnswer);
  if (!normalizedCandidate || !storedHashOrLegacy) return false;

  if (isHashedSecret(storedHashOrLegacy)) {
    return verifySecret(normalizedCandidate, storedHashOrLegacy);
  }

  return constantTimeEqual(normalizedCandidate, normalizeRecoveryToken(storedHashOrLegacy));
}

/**
 * Strips any legacy or sensitive fields (`recoveryFriendName`, `email`, `timezone`,
 * `password`, `passwordHash`, `friendName`, `friendNameHash`) from a UserProfile
 * before storing or exporting to JSON.
 */
export function sanitizeUserProfile(
  rawProfile: UserProfile & Record<string, unknown>,
  hasRecoveryOverride?: boolean
): UserProfile {
  const legacyFriend =
    typeof rawProfile.recoveryFriendName === 'string' &&
    rawProfile.recoveryFriendName.trim().length > 0;

  return {
    id: String(rawProfile.id || 'usr_guest'),
    name: String(rawProfile.name || 'Student'),
    studentId: String(rawProfile.studentId || 'STU-2026'),
    institution: String(rawProfile.institution || 'College of Technology'),
    degree: String(rawProfile.degree || 'Bachelor of Technology'),
    academicYear: String(rawProfile.academicYear || '2026-2027'),
    semester: String(rawProfile.semester || 'Semester 1'),
    targetAttendance:
      typeof rawProfile.targetAttendance === 'number' ? rawProfile.targetAttendance : 75,
    hasRecoveryFriend:
      hasRecoveryOverride !== undefined
        ? hasRecoveryOverride
        : Boolean(rawProfile.hasRecoveryFriend || legacyFriend),
    workingDays: Array.isArray(rawProfile.workingDays)
      ? (rawProfile.workingDays as UserProfile['workingDays'])
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    ...(rawProfile.isDemoUser !== undefined ? { isDemoUser: Boolean(rawProfile.isDemoUser) } : {}),
    ...(rawProfile.hasCompletedTutorial !== undefined
      ? { hasCompletedTutorial: Boolean(rawProfile.hasCompletedTutorial) }
      : {}),
  };
}

/**
 * Redacts API keys, Bearer tokens, password parameters, and credential hashes
 * from error messages or diagnostic strings.
 */
export function redactSensitiveText(message: string | undefined | null): string {
  if (!message) return '';
  return message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/\$acad\$v1\$[0-9a-f]+\$[0-9a-f]+/gi, '[REDACTED_HASH]')
    .replace(
      /\b(GEMINI_API_KEY|API_KEY|apiKey|password|secret|token)\s*([:=])\s*([^\s"',;]+)/gi,
      '$1$2[REDACTED]'
    );
}

export interface AccountRecordLike {
  username: string;
  passwordHash: string;
  friendNameHash?: string;
  /** Legacy fields supported strictly for automatic one-way migration on read */
  password?: string;
  friendName?: string;
  profile: UserProfile & { recoveryFriendName?: string };
  createdAt: string;
}

export type RecoveryMethod = 'friend' | 'studentId';

export interface SecurityUpdateInput {
  accounts: Record<string, AccountRecordLike>;
  currentUsername: string;
  nextUsername: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  friendName: string;
  clearRecoveryFriend?: boolean;
}

export interface SecurityUpdateResult {
  success: boolean;
  error?: string;
  passwordChanged?: boolean;
  hasRecoveryFriend?: boolean;
  updatedAccounts?: Record<string, AccountRecordLike>;
  updatedUsername?: string;
  updatedProfile?: UserProfile;
}

export interface RecoveryVerifyResult {
  success: boolean;
  error?: string;
  SuggestTryAnotherWay?: boolean;
  matchedUsername?: string;
}

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  updatedAccounts?: Record<string, AccountRecordLike>;
  updatedUsername?: string;
  updatedProfile?: UserProfile;
}

/**
 * Upgrades an account record in-memory so only `passwordHash`, optional `friendNameHash`,
 * and a sanitized `UserProfile` exist (zero plaintext `password` or `friendName`).
 */
export function upgradeAccountRecord(record: AccountRecordLike): {
  upgraded: AccountRecordLike;
  didMigrate: boolean;
} {
  let didMigrate = false;

  let passwordHash = record.passwordHash || '';
  if (!isHashedSecret(passwordHash)) {
    const rawPass = passwordHash || record.password || '';
    passwordHash = rawPass ? hashSecret(rawPass) : '';
    didMigrate = true;
  } else if (record.password !== undefined) {
    didMigrate = true;
  }

  let friendNameHash = record.friendNameHash;
  const legacyFriendSource = record.friendName || record.profile?.recoveryFriendName || '';
  if (friendNameHash && !isHashedSecret(friendNameHash)) {
    friendNameHash = hashRecoveryAnswer(friendNameHash);
    didMigrate = true;
  } else if (!friendNameHash && legacyFriendSource.trim().length > 0) {
    friendNameHash = hashRecoveryAnswer(legacyFriendSource);
    didMigrate = true;
  } else if (record.friendName !== undefined || record.profile?.recoveryFriendName !== undefined) {
    didMigrate = true;
  }

  const hasFriend = Boolean(friendNameHash);
  const rawProf = (record.profile || {}) as UserProfile & Record<string, unknown>;
  if (
    'recoveryFriendName' in rawProf ||
    'email' in rawProf ||
    'timezone' in rawProf ||
    rawProf.hasRecoveryFriend !== hasFriend
  ) {
    didMigrate = true;
  }

  const cleanProfile = sanitizeUserProfile(rawProf, hasFriend);

  const upgraded: AccountRecordLike = {
    username: record.username,
    passwordHash,
    ...(friendNameHash ? { friendNameHash } : {}),
    profile: cleanProfile,
    createdAt: record.createdAt || new Date().toISOString(),
  };

  return { upgraded, didMigrate };
}

function getEffectivePasswordSecret(record: AccountRecordLike | undefined): string {
  if (!record) return '';
  return record.passwordHash || record.password || '';
}

function getEffectiveFriendSecret(record: AccountRecordLike | undefined): string {
  if (!record) return '';
  return (
    record.friendNameHash ||
    record.friendName ||
    record.profile?.recoveryFriendName ||
    ''
  );
}

export function validateAndApplySecurityUpdate(
  input: SecurityUpdateInput
): SecurityUpdateResult {
  const currentKey = input.currentUsername.trim().toLowerCase();
  const nextUsername = input.nextUsername.trim();
  const nextKey = nextUsername.toLowerCase();

  if (!nextUsername) {
    return { success: false, error: 'Username cannot be blank.' };
  }

  const existingRecord = input.accounts[currentKey];
  const activeStoredPassword = getEffectivePasswordSecret(existingRecord);

  if (nextKey !== currentKey && input.accounts[nextKey]) {
    return {
      success: false,
      error: 'That username is already taken by another workspace account.',
    };
  }

  const wantsPasswordChange =
    input.newPassword.length > 0 || input.confirmPassword.length > 0;

  if (!wantsPasswordChange && input.oldPassword.trim().length > 0) {
    return {
      success: false,
      error:
        'Enter a new password to change your password, or leave Old Password blank to only update your username or recovery friend name.',
    };
  }

  if (wantsPasswordChange) {
    if (!input.oldPassword) {
      return {
        success: false,
        error: 'Please enter your old password to set a new password.',
      };
    }

    if (!verifySecret(input.oldPassword, activeStoredPassword)) {
      return {
        success: false,
        error: 'Old password is incorrect. Try again or use "Forgot password?".',
      };
    }

    if (input.newPassword.length < 4) {
      return {
        success: false,
        error: 'New password must be at least 4 characters long.',
      };
    }

    if (input.newPassword !== input.confirmPassword) {
      return {
        success: false,
        error: 'New password and confirmation do not match.',
      };
    }
  }

  const nextPasswordHash = wantsPasswordChange
    ? hashSecret(input.newPassword)
    : isHashedSecret(activeStoredPassword)
      ? activeStoredPassword
      : activeStoredPassword
        ? hashSecret(activeStoredPassword)
        : '';

  const cleanedFriendName = input.friendName.trim();
  const existingFriendSecret = getEffectiveFriendSecret(existingRecord);

  let nextFriendNameHash: string | undefined;
  if (input.clearRecoveryFriend) {
    nextFriendNameHash = undefined;
  } else if (cleanedFriendName.length > 0) {
    nextFriendNameHash = hashRecoveryAnswer(cleanedFriendName);
  } else if (existingFriendSecret) {
    nextFriendNameHash = isHashedSecret(existingFriendSecret)
      ? existingFriendSecret
      : hashRecoveryAnswer(existingFriendSecret);
  }

  const hasRecoveryFriend = Boolean(nextFriendNameHash);

  const baseProfile: UserProfile = existingRecord?.profile || {
    id: `usr_${Date.now()}`,
    name: nextUsername,
    studentId: 'STU-2026',
    institution: 'College of Technology',
    degree: 'Bachelor of Technology',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    targetAttendance: 75,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    hasCompletedTutorial: true,
  };

  const updatedProfile = sanitizeUserProfile(
    baseProfile as UserProfile & Record<string, unknown>,
    hasRecoveryFriend
  );

  const nextAccounts: Record<string, AccountRecordLike> = {};
  for (const [k, rec] of Object.entries(input.accounts)) {
    if (k === currentKey && currentKey !== nextKey) continue;
    nextAccounts[k] = upgradeAccountRecord(rec).upgraded;
  }

  nextAccounts[nextKey] = {
    username: nextUsername,
    passwordHash: nextPasswordHash,
    ...(nextFriendNameHash ? { friendNameHash: nextFriendNameHash } : {}),
    profile: updatedProfile,
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
  };

  return {
    success: true,
    passwordChanged: wantsPasswordChange,
    hasRecoveryFriend,
    updatedAccounts: nextAccounts,
    updatedUsername: nextUsername,
    updatedProfile,
  };
}

export function verifyRecoveryChallenge(params: {
  accounts: Record<string, AccountRecordLike>;
  username: string;
  method: RecoveryMethod;
  answer: string;
}): RecoveryVerifyResult {
  const cleanUser = params.username.trim();
  if (!cleanUser) {
    return { success: false, error: 'Please enter your username.' };
  }

  const account = params.accounts[cleanUser.toLowerCase()];
  if (!account) {
    return { success: false, error: 'No account found with that username.' };
  }

  const cleanAnswer = normalizeRecoveryToken(params.answer);
  if (!cleanAnswer) {
    return {
      success: false,
      error:
        params.method === 'friend'
          ? "Please enter your friend's name."
          : 'Please enter your Student ID / Roll Number.',
    };
  }

  if (params.method === 'friend') {
    const storedFriendSecret = getEffectiveFriendSecret(account);
    if (!storedFriendSecret) {
      return {
        success: false,
        SuggestTryAnotherWay: true,
        error:
          'No recovery friend name was set for this account yet. Click "Try another way" to verify with your Student ID.',
      };
    }

    if (!verifyRecoveryAnswer(params.answer, storedFriendSecret)) {
      return {
        success: false,
        SuggestTryAnotherWay: true,
        error:
          'Friend\'s name does not match this account. Check spelling or click "Try another way".',
      };
    }

    return { success: true, matchedUsername: account.username };
  }

  const storedStudentId = normalizeRecoveryToken(account.profile.studentId);
  if (!storedStudentId || !constantTimeEqual(cleanAnswer, storedStudentId)) {
    return {
      success: false,
      SuggestTryAnotherWay: true,
      error:
        'Student ID does not match this account. Check your roll number or click "Try another way".',
    };
  }

  return { success: true, matchedUsername: account.username };
}

export function resetPasswordWithRecovery(params: {
  accounts: Record<string, AccountRecordLike>;
  username: string;
  method: RecoveryMethod;
  answer: string;
  newPassword: string;
  confirmPassword: string;
}): PasswordResetResult {
  const verify = verifyRecoveryChallenge({
    accounts: params.accounts,
    username: params.username,
    method: params.method,
    answer: params.answer,
  });

  if (!verify.success) {
    return { success: false, error: verify.error };
  }

  if (!params.newPassword || params.newPassword.length < 4) {
    return {
      success: false,
      error: 'New password must be at least 4 characters long.',
    };
  }

  if (params.newPassword !== params.confirmPassword) {
    return {
      success: false,
      error: 'New password and confirmation do not match.',
    };
  }

  const key = params.username.trim().toLowerCase();
  const { upgraded: existing } = upgradeAccountRecord(params.accounts[key]);

  const updatedAccounts: Record<string, AccountRecordLike> = {};
  for (const [k, rec] of Object.entries(params.accounts)) {
    updatedAccounts[k] = upgradeAccountRecord(rec).upgraded;
  }

  updatedAccounts[key] = {
    ...existing,
    passwordHash: hashSecret(params.newPassword),
  };

  return {
    success: true,
    updatedAccounts,
    updatedUsername: existing.username,
    updatedProfile: existing.profile,
  };
}
