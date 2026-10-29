import { useEffect, useState } from "react";
import { getRoyaltyRecords, getRoyaltySummary } from "../royalties.api.js";

const summaryCards = [
  { key: "totalRoyaltyEarned", label: "Total earned", tone: "purple" },
  { key: "royaltyPaid", label: "Amount paid", tone: "green" },
  { key: "royaltyPending", label: "Amount pending", tone: "orange" },
];

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatStatus(status) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default function MyRoyaltiesPage() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadRoyalties() {
      setIsLoading(true);
      setError("");

      try {
        const [summaryResult, recordsResult] = await Promise.all([
          getRoyaltySummary(),
          getRoyaltyRecords(),
        ]);

        if (isCurrent) {
          setSummary(summaryResult);
          setRecords(recordsResult);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Unable to load royalty information.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadRoyalties();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) {
    return <div className="page-content"><div className="loading-state">Loading your royalties...</div></div>;
  }

  if (error) {
    return (
      <div className="page-content">
        <section className="empty-state" role="alert">
          <span className="eyebrow">ROYALTIES UNAVAILABLE</span>
          <h1>We could not load your royalties.</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={() => window.location.reload()} type="button">Try again</button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content">
      <section className="books-heading">
        <div>
          <span className="eyebrow">EARNINGS OVERVIEW</span>
          <h1>Royalties</h1>
          <p>Review your royalty earnings and payout history.</p>
        </div>
      </section>

      <section className="royalty-summary-grid" aria-label="Royalty summary">
        <article className="royalty-total-card">
          <span className="stat-label">Books in catalog</span>
          <strong>{summary?.totalBooks ?? 0}</strong>
          <span>{summary?.totalCopiesSold ?? 0} copies sold</span>
        </article>
        {summaryCards.map((card) => (
          <article className="stat-card" key={card.key}>
            <div className="stat-top">
              <span className="stat-label">{card.label}</span>
              <span className={`stat-icon ${card.tone}`}>₹</span>
            </div>
            <div className="stat-value">{formatAmount(summary?.[card.key])}</div>
          </article>
        ))}
      </section>

      <section className="panel royalty-records-panel">
        <div className="panel-heading">
          <div>
            <h2>Royalty records</h2>
            <p>Period-by-period earnings and payout status.</p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="table-empty-state">
            <p>No royalty records are available yet.</p>
          </div>
        ) : (
          <div className="ticket-table-wrap">
            <table className="ticket-table royalty-table">
              <thead>
                <tr>
                  <th>BOOK</th>
                  <th>PERIOD</th>
                  <th>PLATFORM</th>
                  <th>AUTHOR SHARE</th>
                  <th>PAID</th>
                  <th>PENDING</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.book?.title || "Unknown book"}</strong></td>
                    <td>{formatDate(record.periodStart)} – {formatDate(record.periodEnd)}</td>
                    <td>{record.platform || "Not available"}</td>
                    <td>{formatAmount(record.authorShare)}</td>
                    <td>{formatAmount(record.amountPaid)}</td>
                    <td>{formatAmount(record.amountPending)}</td>
                    <td><span className="book-status">{formatStatus(record.payoutStatus)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}