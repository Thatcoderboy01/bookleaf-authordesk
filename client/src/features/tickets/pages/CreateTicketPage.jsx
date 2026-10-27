import { useEffect, useState } from "react";
import { getBooks } from "../../books/books.api.js";
import { createTicket } from "../tickets.api.js";

const initialForm = { subject: "", description: "", bookId: "" };

export default function CreateTicketPage({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [books, setBooks] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function validate() {
    const nextErrors = {};
    if (form.subject.trim().length < 5) nextErrors.subject = "Subject must be at least 5 characters";
    if (form.subject.trim().length > 150) nextErrors.subject = "Subject must not exceed 150 characters";
    if (form.description.trim().length < 10) nextErrors.description = "Description must be at least 10 characters";
    if (form.description.trim().length > 5000) nextErrors.description = "Description must not exceed 5000 characters";
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const ticket = await createTicket({
        description: form.description.trim(),
        subject: form.subject.trim(),
        bookId: form.bookId || null,
      });
      onCreated(ticket);
    } catch (error) {
      setSubmitError(error.message || "Unable to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <section className="books-heading">
        <div><span className="eyebrow">SUPPORT REQUEST</span><h1>Create a ticket</h1><p>Tell our support team how we can help.</p></div>
      </section>
      <form className="ticket-form" onSubmit={handleSubmit} noValidate>
        {submitError && <div className="form-error" role="alert">{submitError}</div>}
        <label>Subject<input name="subject" maxLength="150" onChange={handleChange} value={form.subject} /></label>
        {errors.subject && <span className="field-error">{errors.subject}</span>}
        <label>Related book (optional)<select name="bookId" onChange={handleChange} value={form.bookId}><option value="">No specific book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
        <label>Description<textarea name="description" maxLength="5000" onChange={handleChange} rows="8" value={form.description} /></label>
        {errors.description && <span className="field-error">{errors.description}</span>}
        <div className="ticket-form-actions"><a className="text-button" href="#/tickets">Cancel</a><button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Submitting..." : "Submit ticket"}</button></div>
      </form>
    </div>
  );
}