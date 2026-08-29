/** Gaussian probability density function. */
export function pdf(x, mu, sigma) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Standard-normal survival function (upper tail), Abramowitz & Stegun 26.2.17 approximation. */
export function normSf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  return (
    d *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  );
}

/**
 * Welch's t-test using a normal approximation of the t-distribution
 * (matches the original Hypothesis Engine's live-recompute math exactly).
 */
export function welchTTest({ indMu, indSd, nInd, chnMu, chnSd, nChn }) {
  const se = Math.sqrt((indSd * indSd) / nInd + (chnSd * chnSd) / nChn);
  const t = se ? (indMu - chnMu) / se : 0;
  return { t, p: Math.min(1, 2 * normSf(Math.abs(t))) };
}

/** Pearson correlation coefficient between two equal-length numeric arrays. */
export function pearsonR(xs, ys) {
  const n = xs.length;
  if (!n) return NaN;
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0),
  );
  return den ? num / den : NaN;
}
