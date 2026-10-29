import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth.js";
import { navigate, roleOverviewPaths } from "../../../app/router.jsx";

const initialForm = {
  email: "",
  password: "",
};

function validateForm(form) {
  const errors = {};

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!form.password) {
    errors.password = "Password is required";
  }

  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const user = await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigate(roleOverviewPaths[user.role], { replace: true });
    } catch (error) {
      setSubmitError(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-mark">B</span>
          <span>BookLeaf<span className="brand-light">Desk</span></span>
        </div>
        <div className="auth-heading">
          <span className="eyebrow">AUTHOR SUPPORT PORTAL</span>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to manage your books, royalties, and support requests.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="form-error" role="alert">{submitError}</div>
          )}

          <label htmlFor="email">Email address</label>
          <input
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            id="email"
            name="email"
            onChange={handleChange}
            placeholder="name@example.com"
            type="email"
            value={form.email}
            autoComplete="email"
          />
          {errors.email && <span className="field-error" id="email-error">{errors.email}</span>}

          <label htmlFor="password">Password</label>
          <input
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            id="password"
            name="password"
            onChange={handleChange}
            placeholder="••••••••"
            type="password"
            value={form.password}
            autoComplete="current-password"
          />
          {errors.password && <span className="field-error" id="password-error">{errors.password}</span>}

          <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
