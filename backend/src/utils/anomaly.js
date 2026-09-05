/** Seeded LCG so tests are repeatable. */
export function createRng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Average path length of unsuccessful search in a BST of n points. */
function averagePathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

function buildTree(points, height, maxHeight, rng) {
  if (points.length <= 1 || height >= maxHeight) {
    return { size: points.length };
  }
  const dim = Math.floor(rng() * points[0].length);
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point[dim];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!(max > min)) return { size: points.length };
  const split = min + rng() * (max - min);
  const left = [];
  const right = [];
  for (const point of points) {
    if (point[dim] < split) left.push(point);
    else right.push(point);
  }
  if (!left.length || !right.length) return { size: points.length };
  return {
    dim,
    split,
    left: buildTree(left, height + 1, maxHeight, rng),
    right: buildTree(right, height + 1, maxHeight, rng),
  };
}

function pathLength(point, node, current) {
  if (!node || node.left == null) {
    return current + averagePathLength(node?.size || 1);
  }
  if (point[node.dim] < node.split) return pathLength(point, node.left, current + 1);
  return pathLength(point, node.right, current + 1);
}

export function isolationForestScores(features, {
  nTrees = 80,
  sampleSize = 256,
  seed = 42,
} = {}) {
  const n = features.length;
  if (!n) return [];
  const rng = createRng(seed);
  const maxHeight = Math.ceil(Math.log2(Math.max(2, Math.min(sampleSize, n))));
  const trees = [];
  const draw = Math.min(sampleSize, n);
  for (let t = 0; t < nTrees; t += 1) {
    const sample = [];
    for (let i = 0; i < draw; i += 1) {
      sample.push(features[Math.floor(rng() * n)]);
    }
    trees.push(buildTree(sample, 0, maxHeight, rng));
  }
  const cN = averagePathLength(draw);
  return features.map((point) => {
    const avgHeight = trees.reduce((sum, tree) => sum + pathLength(point, tree, 0), 0) / trees.length;
    return 2 ** (-avgHeight / (cN || 1));
  });
}

export function sigmaFlags(values, k = 3) {
  const valid = values.filter(Number.isFinite);
  const avg = mean(valid);
  const std = sampleStd(valid);
  if (std === 0) return values.map(() => false);
  return values.map((value) => Number.isFinite(value) && Math.abs(value - avg) > k * std);
}

function rollingMedian(values, index, window = 20) {
  const start = Math.max(0, index - window + 1);
  return median(values.slice(start, index + 1).filter(Number.isFinite));
}

export function buildAnomalyFeatures(series) {
  const volumes = series.map((row) => Number(row.volume) || 0);
  return series.map((row, index) => {
    const prev = series[index - 1]?.close;
    const close = Number(row.close);
    const ret = Number.isFinite(prev) && prev !== 0 && Number.isFinite(close) ? close / prev - 1 : null;
    const high = Number(row.high);
    const low = Number(row.low);
    const range = Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close) && close !== 0
      ? (high - low) / close
      : 0;
    const volMed = rollingMedian(volumes, index, 20) || 1;
    const volumeRatio = volumes[index] / volMed;
    return {
      return: ret,
      absReturn: ret == null ? 0 : Math.abs(ret),
      volumeRatio,
      range,
      vector: [
        ret == null ? 0 : ret,
        ret == null ? 0 : Math.abs(ret),
        Number.isFinite(volumeRatio) ? volumeRatio : 1,
        Number.isFinite(range) ? range : 0,
      ],
    };
  });
}

/**
 * Flag unusual bars. Isolation Forest is compared to a 3-sigma rule on returns
 * (and volume). Neither is a trading signal.
 */
const emptyAnomaly = {
  anomalyMl: false,
  anomalySigma: false,
  anomalyScore: null,
  anomalyReasons: [],
  sigmaPrice: false,
  sigmaVolume: false,
  returnPct: null,
  volumeRatio: null,
  returnZ: null,
  volumeZ: null,
};

function zScores(values) {
  const valid = values.filter(Number.isFinite);
  const avg = mean(valid);
  const std = sampleStd(valid);
  if (std === 0) return values.map(() => 0);
  return values.map((value) => (Number.isFinite(value) ? (value - avg) / std : 0));
}

function classifyReasons(feature, returnFlag, volumeFlag, mlFlag, returnZ, volumeZ) {
  const reasons = [];
  const ret = feature.return;
  if (returnFlag && Number.isFinite(ret)) {
    reasons.push(ret >= 0 ? 'spike' : 'dump');
  }
  if (volumeFlag) {
    reasons.push(volumeZ < 0 ? 'volumeThin' : 'volume');
  }
  if (mlFlag && reasons.length === 0) {
    if (Number.isFinite(ret) && Math.abs(returnZ) >= 2) {
      reasons.push(ret >= 0 ? 'spike' : 'dump');
    }
    if (Math.abs(volumeZ) >= 2) reasons.push(volumeZ < 0 ? 'volumeThin' : 'volume');
    if (!reasons.length) reasons.push('mixed');
  }
  return reasons;
}

export function detectAnomalies(series, options = {}) {
  if (!Array.isArray(series) || series.length < 10) {
    return (series || []).map(() => ({ ...emptyAnomaly }));
  }

  const features = buildAnomalyFeatures(series);
  const returns = features.map((row) => row.return);
  const volumeRatios = features.map((row) => row.volumeRatio);
  const returnFlags = sigmaFlags(returns, options.sigmaK ?? 3);
  const volumeFlags = sigmaFlags(volumeRatios, options.sigmaK ?? 3);
  const returnZ = zScores(returns);
  const volumeZ = zScores(volumeRatios);
  const scores = isolationForestScores(
    features.map((row) => row.vector),
    {
      nTrees: options.nTrees ?? 80,
      sampleSize: options.sampleSize ?? 256,
      seed: options.seed ?? 42,
    },
  );

  const ranked = [...scores].sort((a, b) => a - b);
  const cutoff = ranked[Math.max(0, Math.floor(ranked.length * 0.95))] ?? 1;
  const scoreFloor = options.scoreFloor ?? 0.55;

  return series.map((_, index) => {
    const score = scores[index];
    const skip = features[index].return == null;
    const sigmaPrice = !skip && returnFlags[index];
    const sigmaVolume = !skip && volumeFlags[index];
    const anomalyMl = !skip && score >= cutoff && score >= scoreFloor;
    const ret = features[index].return;
    return {
      anomalySigma: sigmaPrice || sigmaVolume,
      anomalyMl,
      anomalyScore: skip ? null : Number(score.toFixed(4)),
      sigmaPrice,
      sigmaVolume,
      anomalyReasons: skip ? [] : classifyReasons(
        features[index],
        returnFlags[index],
        volumeFlags[index],
        anomalyMl,
        returnZ[index],
        volumeZ[index],
      ),
      returnPct: skip || !Number.isFinite(ret) ? null : Number((ret * 100).toFixed(2)),
      volumeRatio: Number.isFinite(features[index].volumeRatio)
        ? Number(features[index].volumeRatio.toFixed(2))
        : null,
      returnZ: skip ? null : Number(returnZ[index].toFixed(2)),
      volumeZ: skip ? null : Number(volumeZ[index].toFixed(2)),
    };
  });
}
