function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TicketConversation({ replies }) {
  if (replies.length === 0) {
    return <div className="conversation-empty">No replies yet. Our support team will respond here.</div>;
  }

  return (
    <div className="conversation-list">
      {replies.map((reply) => (
        <article className={`conversation-message ${reply.senderType.toLowerCase()}`} key={reply.id}>
          <div className="conversation-message-header">
            <strong>{reply.senderType === "ADMIN" ? "BookLeaf Support" : "You"}</strong>
            <time dateTime={reply.createdAt}>{formatDate(reply.createdAt)}</time>
          </div>
          <p>{reply.message}</p>
        </article>
      ))}
    </div>
  );
}