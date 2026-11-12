import { useState, useEffect } from 'react';
import { api } from '../api.js';

const Pill = ({ c, children }) => <span className={'pill ' + c}>{children}</span>;

const STATUS_COLOR = {
  Generated: 'grey', 'Pending Delivery': 'yellow', Sent: 'yellow',
  Delivered: 'green', Acknowledged: 'green',
};
const DELIVERY_STATUSES = ['Generated', 'Pending Delivery', 'Sent', 'Delivered', 'Acknowledged'];

function fmtINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

/* ── Print a single sanction letter ── */
function printSanctionLetter(letter) {
  const repayStart = letter.disbursalDate || letter.sanctionDate || '';
  const w = window.open('', '_blank', 'width=900,height=750');
  w.document.write(`<!DOCTYPE html><html><head><title>Sanction Letter - ${letter.letterNo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:0 auto}
    .hdr{text-align:center;border-bottom:3px double #1a5c35;padding-bottom:16px;margin-bottom:20px}
    .hdr h1{font-size:20px;color:#1a5c35;font-weight:800;margin-bottom:4px}
    .hdr p{font-size:12px;color:#555}
    .letter-no{display:flex;justify-content:space-between;margin-bottom:18px;font-size:12px;color:#555}
    h2{font-size:15px;font-weight:700;margin:18px 0 10px;color:#1a5c35;border-bottom:1px solid #c5ddc9;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:10px}
    .kv{display:flex;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px dashed #e0e0e0}
    .kv span{color:#555;min-width:160px;flex:none}
    .kv b{color:#111}
    .terms{background:#f8faf8;border:1px solid #c5ddc9;border-radius:6px;padding:14px;margin:14px 0;font-size:12px;line-height:1.7}
    .terms li{margin-bottom:4px}
    .sig-row{display:flex;justify-content:space-between;margin-top:40px}
    .sig-box{text-align:center;min-width:180px}
    .sig-line{border-top:1px solid #333;margin-bottom:6px}
    .footer{margin-top:24px;text-align:center;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:10px}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <h1>Mahalaxmi Co-Operative Society Ltd</h1>
    <p>Loan Sanction Letter</p>
  </div>
  <div class="letter-no">
    <div><b>Letter No:</b> ${letter.letterNo}</div>
    <div><b>Date:</b> ${letter.sanctionDate || new Date().toLocaleDateString('en-IN')}</div>
  </div>
  <p style="margin-bottom:14px">To,<br><b>${letter.memberName}</b><br>Member ID: ${letter.memberId}</p>
  <p style="margin-bottom:14px">Dear ${letter.memberName},</p>
  <p style="margin-bottom:14px;line-height:1.7">We are pleased to inform you that your loan application <b>${letter.appId}</b> has been sanctioned by Mahalaxmi Co-Operative Society Ltd. The details of the sanctioned loan are as follows:</p>
  <h2>Loan Details</h2>
  <div class="grid">
    <div class="kv"><span>Application ID</span><b>${letter.appId}</b></div>
    <div class="kv"><span>Loan ID</span><b>${letter.loanId || '–'}</b></div>
    <div class="kv"><span>Loan Type</span><b>${letter.loanType}</b></div>
    <div class="kv"><span>Approved Loan Amount</span><b>${fmtINR(letter.approvedAmount)}</b></div>
    <div class="kv"><span>Net Disbursal Amount</span><b>${fmtINR(letter.netDisbursalAmount)}</b></div>
    <div class="kv"><span>Interest Rate</span><b>${letter.interestRate}% per annum</b></div>
    <div class="kv"><span>Loan Tenure</span><b>${letter.tenure} days</b></div>
    <div class="kv"><span>EMI Amount</span><b>${fmtINR(letter.emiAmount)}</b></div>
    <div class="kv"><span>Repayment Start Date</span><b>${repayStart}</b></div>
    <div class="kv"><span>Collector</span><b>${letter.collectorName}</b></div>
  </div>
  <h2>Terms and Conditions</h2>
  <div class="terms"><ol>
    <li>The loan amount must be repaid as per the agreed repayment schedule.</li>
    <li>EMI of ${fmtINR(letter.emiAmount)} is due every day starting from the repayment start date.</li>
    <li>A penalty of 3% per day will be charged on overdue amounts after the loan tenure ends.</li>
    <li>The borrower must inform the society of any change in contact details or address.</li>
    <li>The society reserves the right to recall the loan in case of default or misuse of funds.</li>
    <li>This sanction letter is valid only for the loan amount and tenure mentioned above.</li>
    <li>Any dispute shall be subject to the jurisdiction of local courts.</li>
  </ol></div>
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div>Borrower Signature</div><div style="font-size:11px;color:#555;margin-top:2px">${letter.memberName}</div></div>
    <div class="sig-box"><div class="sig-line"></div><div>Authorized Signatory</div><div style="font-size:11px;color:#555;margin-top:2px">Mahalaxmi Co-Operative Society Ltd</div></div>
  </div>
  <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Mahalaxmi Co-Operative Society Ltd &nbsp;|&nbsp; Confidential</div>
  </body></html>`);
  w.document.close(); w.focus(); w.print();
}

/* ── Letter Detail Modal ── */
function LetterModal({ letterId, onClose }) {
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editSentDate, setEditSentDate] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSanctionLetter(letterId).then(d => {
      setLetter(d);
      setEditStatus(d.receivedStatus || '');
      setEditMethod(d.deliveryMethod || '');
      setEditSentDate(d.sentDate || '');
      setEditReceivedDate(d.receivedDate || '');
      setEditRemarks(d.remarks || '');
    }).finally(() => setLoading(false));
  }, [letterId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateSanctionLetter(letterId, {
        receivedStatus: editStatus, deliveryMethod: editMethod,
        sentDate: editSentDate, receivedDate: editReceivedDate, remarks: editRemarks,
      });
      setLetter(prev => ({ ...prev, ...updated }));
      alert('Delivery status updated.');
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  async function regenerate() {
    if (!confirm('Regenerate this sanction letter with latest loan details?')) return;
    setSaving(true);
    try {
      const updated = await api.regenerateSanctionLetter(letterId);
      setLetter(prev => ({ ...prev, ...updated }));
      alert('Letter regenerated successfully.');
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div className="panel pad" style={{ padding: 40 }}><p className="muted">Loading</p></div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 20 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Sanction Letter — {letter.letterNo}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{letter.memberName} · {letter.appId}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm outline" onClick={() => printSanctionLetter(letter)}>🖨 Print / PDF</button>
            <button className="btn sm outline" onClick={regenerate} disabled={saving}>↺ Regenerate</button>
            <button className="btn sm outline" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Letter No', letter.letterNo], ['Sanction Date', letter.sanctionDate],
            ['App ID', letter.appId], ['Loan ID', letter.loanId || '–'],
            ['Member', letter.memberName], ['Member ID', letter.memberId],
            ['Loan Type', letter.loanType], ['Approved Amount', fmtINR(letter.approvedAmount)],
            ['Net Disbursal', fmtINR(letter.netDisbursalAmount)], ['Interest Rate', letter.interestRate + '%'],
            ['Tenure', letter.tenure + ' days'], ['EMI', fmtINR(letter.emiAmount)],
            ['Disbursal Date', letter.disbursalDate || '–'], ['Collector', letter.collectorName],
          ].map(([k, v]) => (
            <div key={k} className="kv"><span className="sans">{k}</span><span className="mono" style={{ fontSize: 13 }}>{v}</span></div>
          ))}
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Delivery Tracking</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Delivery Status</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }}>
                {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Delivery Method</label>
              <select value={editMethod} onChange={e => setEditMethod(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }}>
                <option value="">– Select –</option>
                {['Hand Delivery', 'Post', 'Email', 'WhatsApp', 'Courier'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Sent Date</label>
              <input type="date" value={editSentDate} onChange={e => setEditSentDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Received Date</label>
              <input type="date" value={editReceivedDate} onChange={e => setEditReceivedDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Remarks</label>
              <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff', minHeight: 60, resize: 'vertical' }} />
            </div>
          </div>
          <button className="btn sm" style={{ marginTop: 12 }} onClick={save} disabled={saving}>
            {saving ? 'Saving' : 'Save Delivery Status'}
          </button>
        </div>

        {letter.history && letter.history.length > 0 && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>History</div>
            {letter.history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{h.action}</span>
                <span className="muted">{h.date} · {h.by}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Sanction Letters Screen ── */
export function SanctionLetters() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.getSanctionLetters().then(setLetters).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function reload() {
    api.getSanctionLetters().then(setLetters).catch(() => {});
  }

  const filtered = letters.filter(l => {
    const q = search.toLowerCase();
    const ms = !q || [l.memberName, l.memberId, l.letterNo, l.appId, l.loanId].some(v => v && v.toLowerCase().includes(q));
    return ms && (statusFilter === 'All' || l.receivedStatus === statusFilter);
  });

  const DIST_COLS = [
    { key: 'memberName', label: 'Member Name' }, { key: 'memberId', label: 'Member ID' },
    { key: 'appId', label: 'Loan ID' }, { key: 'letterNo', label: 'Letter No' },
    { key: 'sanctionDate', label: 'Sanction Date' },
    { key: 'approvedAmount', label: 'Approved Amount' },
    { key: 'deliveryMethod', label: 'Delivery Method' }, { key: 'sentDate', label: 'Sent Date' },
    { key: 'receivedStatus', label: 'Status' }, { key: 'receivedDate', label: 'Received Date' },
    { key: 'remarks', label: 'Remarks' },
  ];

  function exportCSV() {
    const header = DIST_COLS.map(c => c.label).join(',');
    const body = filtered.map(r =>
      DIST_COLS.map(c => '"' + String(r[c.key] ?? '').replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sanction-letters-distribution.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const w = window.open('', '_blank', 'width=1000,height=750');
    const rows = filtered.map(r =>
      '<tr>' + DIST_COLS.map(c => `<td>${r[c.key] ?? ''}</td>`).join('') + '</tr>'
    ).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Sanction Letter Distribution</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:24px}
      h1{font-size:16px;color:#1a5c35;margin-bottom:4px}p{font-size:11px;color:#555;margin-bottom:14px}
      table{width:100%;border-collapse:collapse}
      th{background:#1a5c35;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}
      tr:nth-child(even) td{background:#f8faf8}
      .footer{margin-top:16px;font-size:10px;color:#888;text-align:right}
    </style></head><body>
    <h1>Mahalaxmi Co-Operative Society Ltd</h1>
    <p>Sanction Letter Distribution Report &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Records: ${filtered.length}</p>
    <table><thead><tr>${DIST_COLS.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">Authorized Signatory: ___________________________</div>
    </body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <>
      <div className="a-title">
        <div><h1>Sanction Letters</h1><p>{letters.length} letters generated · distribution tracking</p></div>
        <button className="btn sm outline" onClick={reload}>↺ Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="search" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}
          placeholder="Search member, letter no, app ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }}>
          <option>All</option>
          {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn sm" onClick={exportCSV}>⬇ CSV</button>
        <button className="btn sm outline" onClick={exportPDF}>🖨 PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {DELIVERY_STATUSES.map(s => {
          const count = letters.filter(l => l.receivedStatus === s).length;
          return (
            <div key={s} className="kpi" style={{ minWidth: 130, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLOR[s] === 'green' ? 'var(--green-tx)' : STATUS_COLOR[s] === 'red' ? 'var(--red-tx)' : STATUS_COLOR[s] === 'yellow' ? 'var(--gold)' : 'var(--muted)'}` }}
              onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}>
              <div className="eb">{s}</div>
              <div className="v">{count}</div>
            </div>
          );
        })}
      </div>

      {loading
        ? <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}><p className="muted">Loading</p></div>
        : filtered.length === 0
          ? <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}><p className="muted">No sanction letters found.</p></div>
          : (
            <div className="panel scroll-x">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Letter No</th><th>Member</th><th>App ID</th><th>Loan Type</th>
                    <th className="r">Approved</th><th>Sanction Date</th>
                    <th>Delivery</th><th>Sent</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>{filtered.map(l => (
                  <tr key={l.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{l.letterNo}</td>
                    <td><b>{l.memberName}</b><div className="muted" style={{ fontSize: 11 }}>{l.memberId}</div></td>
                    <td className="mono" style={{ fontSize: 12 }}>{l.appId}</td>
                    <td>{l.loanType}</td>
                    <td className="r mono">{fmtINR(l.approvedAmount)}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{l.sanctionDate}</td>
                    <td>{l.deliveryMethod || '–'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{l.sentDate || '–'}</td>
                    <td><Pill c={STATUS_COLOR[l.receivedStatus] || 'grey'}>{l.receivedStatus}</Pill></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn sm" onClick={() => setSelectedId(l.id)}>View</button>
                        <button className="btn sm outline" onClick={() => printSanctionLetter(l)}>🖨</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )
      }

      {selectedId && (
        <LetterModal letterId={selectedId} onClose={() => { setSelectedId(null); reload(); }} />
      )}
    </>
  );
}
