/**
 * Judging Engine: Weighted Rubric Calculation and Cross-Judge Normalization
 * 
 * Provides server-authoritative calculations and mathematically defensible
 * cross-judge z-score normalization with deterministic edge-case handling.
 */

/**
 * Calculate the authoritative server-side weighted score for a set of criteria scores.
 * 
 * @param {Array<{criterionId: number, score: number}>} scores
 * @param {Array<{id: number, maxScore: number, weight: number, name: string}>} criteria
 * @returns {{
 *   totalWeightedScore: number,
 *   totalMaxPossible: number,
 *   percentage: number,
 *   scaledScore10: number,
 *   breakdown: Array<Object>
 * }}
 */
const calculateWeightedScore = (scores, criteria) => {
  const criteriaMap = new Map();
  criteria.forEach((c) => criteriaMap.set(c.id, c));

  let totalWeightedScore = 0;
  let totalMaxPossible = 0;
  const breakdown = [];

  for (const criterion of criteria) {
    const scoreItem = scores.find((s) => s.criterionId === criterion.id);
    const rawScore = scoreItem ? Number(scoreItem.score) : 0;
    const weight = Number(criterion.weight) || 1.0;
    const maxScore = Number(criterion.maxScore) || 10;

    const weightedScore = rawScore * weight;
    const maxPossible = maxScore * weight;

    totalWeightedScore += weightedScore;
    totalMaxPossible += maxPossible;

    breakdown.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      rawScore,
      maxScore,
      weight,
      weightedScore: Math.round(weightedScore * 100) / 100,
    });
  }

  const percentage = totalMaxPossible > 0
    ? Math.round((totalWeightedScore / totalMaxPossible) * 10000) / 100
    : 0;

  const scaledScore10 = totalMaxPossible > 0
    ? Math.round((totalWeightedScore / totalMaxPossible) * 1000) / 100
    : 0;

  return {
    totalWeightedScore: Math.round(totalWeightedScore * 100) / 100,
    totalMaxPossible: Math.round(totalMaxPossible * 100) / 100,
    percentage,
    scaledScore10,
    breakdown,
  };
};

/**
 * Compute sample standard deviation with Bessel's correction (N - 1).
 * 
 * @param {Array<number>} values
 * @param {number} mean
 * @returns {number} Standard deviation
 */
const computeStandardDeviation = (values, mean) => {
  if (values.length <= 1) return 0;
  const sumSquaredDiffs = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  return Math.sqrt(sumSquaredDiffs / (values.length - 1));
};

/**
 * Execute cross-judge z-score normalization.
 * 
 * Takes all judge evaluation records for an event and normalizes them to
 * control for judge severity/leniency bias.
 * 
 * Edge cases handled:
 * 1. Standard deviation = 0 (identical scores given by judge) -> z=0, centers to global mean
 * 2. Single observation (N = 1) -> preserves raw scaled score, centers to global mean
 * 3. Incomplete reviews -> normalizes only over available reviews without fabricating scores
 * 4. Bounded clipping -> prevents scores outside [0, targetMax]
 * 
 * @param {Array<{
 *   judgeId: number,
 *   submissionId: number,
 *   rawScore: number, // Total weighted or percentage score
 *   maxPossible: number
 * }>} rawJudgeScores
 * @param {Object} [options]
 * @param {number} [options.targetScaleMax=10] - Scale to map normalized scores (e.g. 10 or 100)
 * @returns {{
 *   normalizedScores: Array<{
 *     judgeId: number,
 *     submissionId: number,
 *     rawScore: number,
 *     normalizedScore: number,
 *     zScore: number,
 *     metadata: Object
 *   }>,
 *   judgeStats: Object,
 *   globalStats: Object
 * }}
 */
const normalizeScores = (rawJudgeScores, options = {}) => {
  const targetScaleMax = options.targetScaleMax || 10;

  if (!rawJudgeScores || rawJudgeScores.length === 0) {
    return {
      normalizedScores: [],
      judgeStats: {},
      globalStats: { mean: 0, stdDev: 0, count: 0 },
    };
  }

  // 1. Convert all raw scores to standardized percentage / 0-10 scale for comparable normalization
  const standardizedItems = rawJudgeScores.map((item) => {
    const raw = Number(item.rawScore);
    const max = Number(item.maxPossible) || targetScaleMax;
    // Scale to targetScaleMax (e.g. 10)
    const scaledRaw = max > 0 ? (raw / max) * targetScaleMax : raw;
    return {
      ...item,
      rawScore: raw,
      scaledRaw: Math.round(scaledRaw * 100) / 100,
    };
  });

  // 2. Compute Global Statistics
  const allScaledScores = standardizedItems.map((item) => item.scaledRaw);
  const globalCount = allScaledScores.length;
  const globalMean = allScaledScores.reduce((sum, v) => sum + v, 0) / globalCount;
  const globalStdDev = computeStandardDeviation(allScaledScores, globalMean);

  // Fallback target spread: if global spread is near 0, default standard deviation to 1.5 on a 10-point scale
  const targetStdDev = globalStdDev > 0.05 ? globalStdDev : 1.5;

  // 3. Group scores by judge
  const scoresByJudge = new Map();
  for (const item of standardizedItems) {
    if (!scoresByJudge.has(item.judgeId)) {
      scoresByJudge.set(item.judgeId, []);
    }
    scoresByJudge.get(item.judgeId).push(item);
  }

  // 4. Compute per-judge statistics
  const judgeStats = {};
  for (const [judgeId, items] of scoresByJudge.entries()) {
    const scores = items.map((i) => i.scaledRaw);
    const count = scores.length;
    const mean = scores.reduce((sum, v) => sum + v, 0) / count;
    const stdDev = computeStandardDeviation(scores, mean);

    judgeStats[judgeId] = {
      judgeId,
      count,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }

  // 5. Calculate normalized score for each judge evaluation
  const normalizedScores = standardizedItems.map((item) => {
    const stats = judgeStats[item.judgeId];
    let zScore = 0;
    let normalizedScore = item.scaledRaw;
    let fallbackReason = null;

    if (stats.count <= 1) {
      // Edge Case: Judge only scored 1 project
      // Cannot reliably measure variance; use raw score anchored to global mean
      zScore = 0;
      normalizedScore = item.scaledRaw;
      fallbackReason = 'SINGLE_SCORE_FALLBACK';
    } else if (stats.stdDev === 0) {
      // Edge Case: Judge gave all projects identical scores
      // Division by zero would occur; z-score is 0 (rated average by judge's standard)
      zScore = 0;
      // Anchor to global mean with gentle shift for raw deviation
      normalizedScore = globalMean;
      fallbackReason = 'ZERO_VARIANCE_FALLBACK';
    } else {
      // Standard Case: Z-score normalization
      zScore = (item.scaledRaw - stats.mean) / stats.stdDev;
      // Map z-score to target scale centered at globalMean with targetStdDev
      normalizedScore = globalMean + (zScore * targetStdDev);
    }

    // Clip to [0, targetScaleMax]
    const clippedScore = Math.max(0, Math.min(targetScaleMax, normalizedScore));
    const roundedNormalized = Math.round(clippedScore * 100) / 100;
    const roundedZ = Math.round(zScore * 1000) / 1000;

    return {
      judgeId: item.judgeId,
      submissionId: item.submissionId,
      rawScore: item.rawScore,
      scaledRaw: item.scaledRaw,
      normalizedScore: roundedNormalized,
      zScore: roundedZ,
      metadata: {
        method: 'z-score',
        judgeMean: stats.mean,
        judgeStdDev: stats.stdDev,
        judgeCount: stats.count,
        globalMean: Math.round(globalMean * 100) / 100,
        globalStdDev: Math.round(globalStdDev * 100) / 100,
        fallbackReason,
      },
    };
  });

  return {
    normalizedScores,
    judgeStats,
    globalStats: {
      mean: Math.round(globalMean * 100) / 100,
      stdDev: Math.round(globalStdDev * 100) / 100,
      count: globalCount,
    },
  };
};

/**
 * Aggregate normalized scores and weighted rubric for final event standings.
 * Handles missing reviews gracefully.
 * 
 * @param {Array<Object>} submissions - Submissions with teams, tracks, and normalized scores
 * @param {Array<Object>} criteria - Event rubric criteria
 * @returns {Array<Object>} Ranked standings
 */
const aggregateFinalStandings = (submissions, criteria) => {
  const standings = submissions.map((sub) => {
    const normScores = sub.normalizedScores || [];
    const rawScores = sub.scores || [];

    const completedReviews = normScores.length;

    // Average normalized score
    const avgNormalized = completedReviews > 0
      ? normScores.reduce((sum, s) => sum + s.normalizedScore, 0) / completedReviews
      : 0;

    // Average raw score
    const avgRaw = rawScores.length > 0
      ? rawScores.reduce((sum, s) => sum + s.score, 0) / rawScores.length
      : 0;

    return {
      submissionId: sub.id,
      title: sub.title,
      teamId: sub.team?.id,
      teamName: sub.team?.name,
      trackId: sub.trackId,
      trackName: sub.track?.name || 'General',
      reviewCount: completedReviews,
      rawAverage: Math.round(avgRaw * 100) / 100,
      finalNormalizedScore: Math.round(avgNormalized * 100) / 100,
      status: completedReviews > 0 ? 'SCORED' : 'PENDING',
    };
  });

  // Rank by finalNormalizedScore descending, then rawAverage
  standings.sort((a, b) => {
    if (b.finalNormalizedScore !== a.finalNormalizedScore) {
      return b.finalNormalizedScore - a.finalNormalizedScore;
    }
    return b.rawAverage - a.rawAverage;
  });

  standings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return standings;
};

module.exports = {
  calculateWeightedScore,
  computeStandardDeviation,
  normalizeScores,
  aggregateFinalStandings,
};
