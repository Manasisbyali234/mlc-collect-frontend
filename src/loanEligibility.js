/**
 * Sequential Loan Eligibility Rules:
 * - Loan N is eligible when:
 *   - All loans before loan (N-1) are 100% repaid
 *   - Loan (N-1) is 50–60%+ repaid
 */

export function calcLoanPct(loan) {
  const totalDue = Number(loan.totalPaid || 0) + Number(loan.pending || 0);
  if (totalDue <= 0) return 0;
  return Math.min(100, (Number(loan.totalPaid || 0) / totalDue) * 100);
}

/**
 * Returns { eligible: bool, reason: string, nextLoanNumber: number }
 * loans: array of loan objects sorted by date (oldest first), only Disbursed/NPA/active loans
 */
export function checkLoanEligibility(loans) {
  // Only consider disbursed/active loans for eligibility
  const active = loans.filter(l =>
    ['Disbursed', 'NPA', 'Approved'].includes(l.status)
  );

  if (active.length === 0) {
    return { eligible: true, reason: 'No active loans. First loan can be applied.', nextLoanNumber: 1 };
  }

  const n = active.length; // number of existing loans
  const nextLoanNumber = n + 1;

  // All loans before the last one must be 100% repaid
  for (let i = 0; i < n - 1; i++) {
    const pct = calcLoanPct(active[i]);
    if (pct < 100) {
      return {
        eligible: false,
        reason: `Loan ${i + 1} must be 100% repaid before applying for Loan ${nextLoanNumber}. Currently ${pct.toFixed(1)}% repaid.`,
        nextLoanNumber,
        blockingLoanIndex: i + 1,
        blockingLoanPct: pct,
      };
    }
  }

  // The last (immediately previous) loan must be 50–60%+ repaid
  const prevLoan = active[n - 1];
  const prevPct = calcLoanPct(prevLoan);
  if (prevPct < 50) {
    return {
      eligible: false,
      reason: `Loan ${n} must reach at least 50% repayment before applying for Loan ${nextLoanNumber}. Currently ${prevPct.toFixed(1)}% repaid.`,
      nextLoanNumber,
      blockingLoanIndex: n,
      blockingLoanPct: prevPct,
    };
  }

  return {
    eligible: true,
    reason: `Loan ${n} is ${prevPct.toFixed(1)}% repaid. Eligible for Loan ${nextLoanNumber}.`,
    nextLoanNumber,
    prevLoanPct: prevPct,
  };
}
