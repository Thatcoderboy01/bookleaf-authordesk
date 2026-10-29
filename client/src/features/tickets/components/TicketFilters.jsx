const statuses = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const categories = [
  "",
  "ROYALTY_PAYMENTS",
  "ISBN_METADATA_ISSUES",
  "PRINTING_QUALITY",
  "DISTRIBUTION_AVAILABILITY",
  "BOOK_STATUS_PRODUCTION",
  "GENERAL_INQUIRY",
];
const priorities = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

function label(value) {
  return value
    ? value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")
    : "All";
}

export default function TicketFilters({ children, filters, onChange }) {
  return (
    <div className="ticket-filters">
      <label>
        Status
        <select name="status" onChange={onChange} value={filters.status}>
          {statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
      </label>
      <label>
        Category
        <select name="category" onChange={onChange} value={filters.category}>
          {categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
      </label>
      <label>
        Priority
        <select name="priority" onChange={onChange} value={filters.priority}>
          {priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
      </label>
      <label>
        From
        <input name="from" onChange={onChange} type="date" value={filters.from} />
      </label>
      <label>
        To
        <input name="to" onChange={onChange} type="date" value={filters.to} />
      </label>
      {children}
    </div>
  );
}
