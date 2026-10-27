import { useEffect, useState } from "react";
import { getBookById, getBooks } from "../books.api.js";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatAmount(value) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value));
}

function formatStatus(status) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function BookDetails({ book, onBack }) {
  return (
    <div className="page-content">
      <button className="text-button" onClick={onBack} type="button">← Back to books</button>
      <section className="books-heading">
        <div>
          <span className="eyebrow">BOOK DETAILS</span>
          <h1>{book.title}</h1>
          <p>Publication and performance information for this title.</p>
        </div>
        <span className="book-status">{formatStatus(book.status)}</span>
      </section>

      <section className="book-detail-grid">
        <article className="book-detail-card">
          <h2>Publication details</h2>
          <dl className="book-detail-list">
            <div><dt>ISBN</dt><dd>{book.isbn || "Not available"}</dd></div>
            <div><dt>Genre</dt><dd>{book.genre || "Not available"}</dd></div>
            <div><dt>Publication date</dt><dd>{formatDate(book.publicationDate)}</dd></div>
            <div><dt>MRP</dt><dd>{formatAmount(book.mrp)}</dd></div>
          </dl>
        </article>
        <article className="book-detail-card">
          <h2>Performance</h2>
          <dl className="book-detail-list">
            <div><dt>Copies sold</dt><dd>{book.totalCopiesSold ?? 0}</dd></div>
            <div><dt>Total earned</dt><dd>{formatAmount(book.totalRoyaltyEarned)}</dd></div>
            <div><dt>Paid</dt><dd>{formatAmount(book.royaltyPaid)}</dd></div>
            <div><dt>Pending</dt><dd>{formatAmount(book.royaltyPending)}</dd></div>
          </dl>
        </article>
      </section>
    </div>
  );
}

export default function MyBooksPage({ bookId }) {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadBooks() {
      setIsLoading(true);
      setError("");

      try {
        const result = await getBooks();

        if (isCurrent) {
          setBooks(result);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Unable to load your books.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadBooks();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!bookId) {
      return undefined;
    }

    let isCurrent = true;

    async function loadBook() {
      setIsLoading(true);
      setError("");

      try {
        const book = await getBookById(bookId);

        if (isCurrent) {
          setSelectedBook(book);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Unable to load this book.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadBook();
    return () => {
      isCurrent = false;
    };
  }, [bookId]);

  if (isLoading) {
    return <div className="page-content"><div className="loading-state">Loading your books...</div></div>;
  }

  if (error) {
    return (
      <div className="page-content">
        <section className="empty-state" role="alert">
          <span className="eyebrow">BOOKS UNAVAILABLE</span>
          <h1>We could not load your books.</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={() => window.location.reload()} type="button">Try again</button>
        </section>
      </div>
    );
  }

  if (bookId && selectedBook) {
    return <BookDetails book={selectedBook} onBack={() => { window.location.hash = "#/books"; }} />;
  }

  if (bookId && !selectedBook) {
    return (
      <div className="page-content">
        <section className="empty-state">
          <span className="eyebrow">BOOK NOT FOUND</span>
          <h1>This book is not available.</h1>
          <p>The book may not exist or may not be accessible to your account.</p>
          <a className="primary-button" href="#/books">Return to books</a>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content">
      <section className="books-heading">
        <div>
          <span className="eyebrow">YOUR CATALOG</span>
          <h1>My books</h1>
          <p>View your published titles and their current performance.</p>
        </div>
      </section>

      {books.length === 0 ? (
        <section className="empty-state">
          <span className="eyebrow">NO BOOKS YET</span>
          <h1>Your catalog is empty.</h1>
          <p>Books associated with your author account will appear here.</p>
        </section>
      ) : (
        <section className="books-grid" aria-label="My books">
          {books.map((book) => (
            <a className="book-card" href={`#/books/${encodeURIComponent(book.id)}`} key={book.id}>
              <div className="book-card-top">
                <span className="book-cover">{book.title.slice(0, 1).toUpperCase()}</span>
                <span className="book-status">{formatStatus(book.status)}</span>
              </div>
              <h2>{book.title}</h2>
              <p>{book.genre || "Genre not available"}</p>
              <div className="book-card-footer">
                <span>{book.totalCopiesSold ?? 0} copies sold</span>
                <span>View details →</span>
              </div>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}