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

/**
 * Bradley-Terry Pairwise Estimation using Minorization-Maximization (Hunter's Algorithm).
 * 
 * Computes maximum-likelihood latent quality parameters \pi_i for all items based on
 * observed pairwise head-to-head comparison results.
 * 
 * For two items i and j, the probability that item i is chosen over item j is:
 *   P(i > j) = \pi_i / (\pi_i + \pi_j) = exp(\lambda_i) / (exp(\lambda_i) + exp(\lambda_j))
 * 
 * The algorithm iteratively updates:
 *   \pi_i^{(t+1)} = W_i / \sum_{j \neq i} [ N_{ij} / (\pi_i^{(t)} + \pi_j^{(t)}) ]
 * 
 * @param {Array<{winnerId: number, loserId: number}>} comparisons
 * @param {Array<number>} allItemIds
 * @param {Object} [options]
 * @param {number} [options.maxIterations=200]
 * @param {number} [options.tolerance=1e-6]
 * @param {number} [options.pseudoCount=0.1] - Prior pseudo-count for regularizing zero-win items
 * @returns {{
 *   rankings: Array<{
 *     submissionId: number,
 *     rank: number,
 *     pi: number,
 *     lambda: number,
 *     wins: number,
 *     losses: number,
 *     winRate: number
 *   }>,
 *   iterations: number,
 *   converged: boolean,
 *   logLikelihood: number
 * }}
 */
const estimateBradleyTerry = (comparisons, allItemIds, options = {}) => {
  const maxIterations = options.maxIterations || 200;
  const tolerance = options.tolerance || 1e-6;
  const pseudoCount = options.pseudoCount !== undefined ? options.pseudoCount : 0.1;

  const itemSet = new Set(allItemIds);
  comparisons.forEach((c) => {
    itemSet.add(c.winnerId);
    itemSet.add(c.loserId);
  });

  const items = Array.from(itemSet);
  const n = items.length;

  if (n === 0) {
    return {
      rankings: [],
      iterations: 0,
      converged: true,
      logLikelihood: 0,
    };
  }

  const indexMap = new Map();
  items.forEach((id, idx) => indexMap.set(id, idx));

  // wins[i][j] = number of times item i beat item j
  const winsMatrix = Array.from({ length: n }, () => Array(n).fill(0));
  const totalWins = Array(n).fill(0);
  const totalLosses = Array(n).fill(0);

  for (const c of comparisons) {
    const w = indexMap.get(c.winnerId);
    const l = indexMap.get(c.loserId);
    if (w !== undefined && l !== undefined && w !== l) {
      winsMatrix[w][l] += 1;
      totalWins[w] += 1;
      totalLosses[l] += 1;
    }
  }

  // N_ij = wins[i][j] + wins[j][i]
  const totalComparisonsMatrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        totalComparisonsMatrix[i][j] = winsMatrix[i][j] + winsMatrix[j][i];
      }
    }
  }

  // Initialize \pi_i uniformly: 1 / n
  let pi = Array(n).fill(1 / n);
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    const nextPi = Array(n).fill(0);
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      let denom = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const N_ij = totalComparisonsMatrix[i][j] + (2 * pseudoCount / (n - 1));
          const piSum = pi[i] + pi[j];
          if (piSum > 0) {
            denom += N_ij / piSum;
          }
        }
      }

      const effectiveWins = totalWins[i] + pseudoCount;
      nextPi[i] = denom > 0 ? effectiveWins / denom : pi[i];
    }

    // Normalize so sum(\pi) = 1
    const sumNext = nextPi.reduce((a, b) => a + b, 0);
    if (sumNext > 0) {
      for (let i = 0; i < n; i++) {
        nextPi[i] /= sumNext;
      }
    }

    // Check convergence
    for (let i = 0; i < n; i++) {
      const diff = Math.abs(nextPi[i] - pi[i]);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }

    pi = nextPi;

    if (maxDiff < tolerance) {
      converged = true;
      break;
    }
  }

  // Compute log-likelihood: sum_{i < j} [ w_ij * ln(pi_i / (pi_i + pi_j)) + w_ji * ln(pi_j / (pi_i + pi_j)) ]
  let logLikelihood = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w_ij = winsMatrix[i][j];
      const w_ji = winsMatrix[j][i];
      if (w_ij + w_ji > 0) {
        const p_i = pi[i] / (pi[i] + pi[j]);
        const p_j = pi[j] / (pi[i] + pi[j]);
        if (w_ij > 0 && p_i > 0) logLikelihood += w_ij * Math.log(p_i);
        if (w_ji > 0 && p_j > 0) logLikelihood += w_ji * Math.log(p_j);
      }
    }
  }

  // Build rankings
  const rankings = items.map((submissionId, i) => {
    const rawPi = pi[i];
    const lambda = Math.log(Math.max(1e-12, rawPi));
    const totalMatches = totalWins[i] + totalLosses[i];
    const winRate = totalMatches > 0 ? Math.round((totalWins[i] / totalMatches) * 1000) / 10 : 0;

    return {
      submissionId,
      pi: Math.round(rawPi * 100000) / 100000,
      lambda: Math.round(lambda * 1000) / 1000,
      wins: totalWins[i],
      losses: totalLosses[i],
      totalMatches,
      winRate,
    };
  });

  // Sort descending by estimated latent parameter \pi
  rankings.sort((a, b) => b.pi - a.pi);
  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    rankings,
    iterations: iter + 1,
    converged,
    logLikelihood: Math.round(logLikelihood * 100) / 100,
  };
};

module.exports = {
  calculateWeightedScore,
  computeStandardDeviation,
  normalizeScores,
  aggregateFinalStandings,
  estimateBradleyTerry,
};
