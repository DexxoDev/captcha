import { settings } from '../config/settings.js';
import { ageInHours } from '../utils/time.js';

export class RiskService {
  scoreUsername(username) {
    let score = 0;
    const reasons = [];
    const digitRatio = (username.match(/\d/g) ?? []).length / Math.max(1, username.length);
    const consonantRuns = username.match(/[bcdfghjklmnpqrstvwxyz]{5,}/gi);
    const symbolHeavy = /[_\-.]{2,}/.test(username);

    if (digitRatio >= 0.45) {
      score += 10;
      reasons.push('High digit density in username');
    } else if (digitRatio >= 0.25) {
      score += 5;
      reasons.push('Moderate digit density in username');
    }

    if (consonantRuns?.length) {
      score += 6;
      reasons.push('Long consonant run in username');
    }

    if (/^[a-z]{3,}\d{4,}$/i.test(username)) {
      score += 8;
      reasons.push('Pattern resembles disposable handle');
    }

    if (symbolHeavy) {
      score += 4;
      reasons.push('Stacked separators in username');
    }

    return { score, reasons };
  }

  scoreAccountAge(createdAt) {
    const hours = ageInHours(createdAt);

    if (hours <= settings.security.risk.accountAge.day) {
      return { score: 24, reasons: ['Account younger than 24 hours'] };
    }

    if (hours <= settings.security.risk.accountAge.threeDays) {
      return { score: 16, reasons: ['Account younger than 72 hours'] };
    }

    if (hours <= settings.security.risk.accountAge.week) {
      return { score: 8, reasons: ['Account younger than 7 days'] };
    }

    return { score: 0, reasons: [] };
  }

  determineTier(score) {
    if (score >= settings.security.risk.highThreshold) {
      return 'high';
    }

    if (score >= settings.security.risk.mediumThreshold) {
      return 'medium';
    }

    return 'low';
  }

  scoreMember({ member, dmReachable, failedAttempts = 0, raidState }) {
    const reasons = [];
    let score = 0;

    const ageResult = this.scoreAccountAge(member.user.createdAt);
    score += ageResult.score;
    reasons.push(...ageResult.reasons);

    const usernameResult = this.scoreUsername(member.user.username);
    score += usernameResult.score;
    reasons.push(...usernameResult.reasons);

    if (!member.user.avatar) {
      score += 8;
      reasons.push('Missing custom avatar');
    }

    if (!dmReachable) {
      score += 6;
      reasons.push('Direct messages unavailable');
    }

    if (failedAttempts > 0) {
      const penalty = Math.min(18, failedAttempts * 7);
      score += penalty;
      reasons.push(`${failedAttempts} previous failed verification attempt(s)`);
    }

    if (raidState?.active) {
      const burstPenalty = Math.min(20, 8 + Math.max(0, raidState.burstSize - settings.security.raid.joinThreshold));
      score += burstPenalty;
      reasons.push(`Guild join burst detected (${raidState.burstSize} recent joins)`);
    }

    const tier = this.determineTier(score);

    return {
      score,
      tier,
      reasons,
      signals: {
        dmReachable,
        failedAttempts,
        burstSize: raidState?.burstSize ?? 0,
        accountAgeHours: ageInHours(member.user.createdAt),
      },
    };
  }
}
