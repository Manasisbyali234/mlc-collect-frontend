const BASE = 'https://mlc-collect-backend.vercel.app/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (mobile, password) => req('POST', '/login', { mobile, password }),
  sendOtp: (mobile) => req('POST', '/otp/send', { mobile }),
  verifyOtp: (mobile, otp) => req('POST', '/otp/verify', { mobile, otp }),
  setPassword: (mobile, otp, password) => req('POST', '/set-password', { mobile, otp, password }),

  getMembers: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/members${qs ? '?' + qs : ''}`); },
  getMember: (id) => req('GET', `/members/${id}`),
  getMemberLoans: (id) => req('GET', `/members/${id}/loans`),
  createMember: (data) => req('POST', '/members', data),
  createMemberForm: async (formData) => {
    const res = await fetch(BASE + '/members', { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
    return res.json();
  },

  getApplications: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/applications${qs ? '?' + qs : ''}`); },
  getApplication: (id) => req('GET', `/applications/${id}`),
  saveApplication: (data) => req('POST', '/applications', data),
  updateApplication: (id, data) => req('PATCH', `/applications/${id}`, data),
  autoNpa: () => req('POST', '/applications/auto-npa', {}),

  getLoanAccounts: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/loan-accounts${qs ? '?' + qs : ''}`); },
  createLoanAccount: (data) => req('POST', '/loan-accounts', data),

  getCollections: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/collections${qs ? '?' + qs : ''}`);
  },
  saveCollection: (data) => req('POST', '/collections', data),
  saveCollectionForm: async (formData) => {
    const res = await fetch(BASE + '/collections', { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
    return res.json();
  },

  getDeposits: () => req('GET', '/deposits'),
  saveDeposit: (data) => req('POST', '/deposits', data),
  saveDepositForm: async (formData) => {
    const res = await fetch(BASE + '/deposits', { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
    return res.json();
  },
  updateDeposit: (id, data) => req('PATCH', `/deposits/${id}`, data),

  getUsers: () => req('GET', '/users'),
  createUser: (data) => req('POST', '/users', data),

  getTargets: () => req('GET', '/targets'),
  saveTarget: (data) => req('POST', '/targets', data),
  updateTarget: (id, data) => req('PATCH', `/targets/${id}`, data),

  getDashboard: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/dashboard${qs ? '?' + qs : ''}`); },

  getReportSummary: () => req('GET', '/reports/summary'),
  getReportDaily: (date) => req('GET', `/reports/daily?date=${date}`),
  getReportWeekly: (from, to) => req('GET', `/reports/weekly?from=${from}&to=${to}`),
  getReportMonthly: (year, month) => req('GET', `/reports/monthly?year=${year}&month=${month}`),
  getReportDefaulters: (params={}) => { const qs=new URLSearchParams(params).toString(); return req('GET', `/reports/defaulters${qs?'?'+qs:''}`); },
  getReportPaid: (params={}) => { const qs=new URLSearchParams(params).toString(); return req('GET', `/reports/paid${qs?'?'+qs:''}`); },
  getReportCollectorWise: (params={}) => { const qs=new URLSearchParams(params).toString(); return req('GET', `/reports/collector-wise${qs?'?'+qs:''}`); },
  getReportClosing: (params={}) => { const qs=new URLSearchParams(params).toString(); return req('GET', `/reports/closing${qs?'?'+qs:''}`); },
  getReportLoanDetails: (params={}) => { const qs=new URLSearchParams(params).toString(); return req('GET', `/reports/loan-details${qs?'?'+qs:''}`); },

  getMissedEmi: () => req('GET', '/reports/missed-emi'),
  getCustomerReport: (memberId) => req('GET', `/reports/customer/${memberId}`),
  getAllCustomersSummary: () => req('GET', '/reports/all-customers-summary'),
  getAllCustomersLoans: () => req('GET', '/reports/all-customers-loans'),

  getSanctionLetters: () => req('GET', '/sanction-letters'),
  getSanctionLetter: (id) => req('GET', `/sanction-letters/${id}`),
  updateSanctionLetter: (id, data) => req('PATCH', `/sanction-letters/${id}`, data),
  regenerateSanctionLetter: (id) => req('POST', `/sanction-letters/${id}/regenerate`, {}),

  getLedger: (memberId, params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/ledger/${memberId}${qs ? '?' + qs : ''}`); },

  borrowerLogin: (appId, mobile) => req('POST', '/borrower/login', { appId, mobile }),
  getBorrowerDashboard: (appId) => req('GET', `/borrower/dashboard/${appId}`),
};
