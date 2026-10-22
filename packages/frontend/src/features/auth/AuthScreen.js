import React, { useState } from 'react';

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/v1/auth/${mode === 'signin' ? 'sign-in' : 'register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(mode === 'signin' ? 'Unable to sign in with those credentials.' : payload.error?.message || 'Unable to create your account.');
      onAuthenticated(payload.data);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  };

  return <main className="auth-shell">
    <div className="auth-atmosphere" aria-hidden="true"><span className="auth-leaf auth-leaf-one" /><span className="auth-leaf auth-leaf-two" /><span className="auth-spark spark-one">✦</span><span className="auth-spark spark-two">✦</span><div className="auth-book"><span /><span /></div></div>
    <section className="auth-panel" aria-label="SmartAgenda authentication">
      <div className="auth-brand"><img className="auth-brand-mark" src="/assets/smart-agenda-icon.png" alt="" /><div><strong>Smart<span>Agenda</span></strong><small>Reading coordination</small></div></div>
      <div className="auth-heading"><p className="app-eyebrow">Welcome</p><h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1><p>{mode === 'signin' ? 'Continue coordinating your school community.' : 'Create your SmartAgenda coordinator account.'}</p></div>
      <div className="social-actions"><button type="button" onClick={() => setStatus('Google sign-in is not configured yet.')}><span className="social-icon google-icon">G</span><span>Continue with Google</span><b aria-hidden="true">›</b></button><button type="button" onClick={() => setStatus('Facebook sign-in is not configured yet.')}><span className="social-icon facebook-icon">f</span><span>Continue with Facebook</span><b aria-hidden="true">›</b></button></div>
      <div className="auth-divider"><span>or use SmartAgenda</span></div>
      <form onSubmit={submit}>
        {mode === 'register' && <><label htmlFor="auth-name">Full name</label><input id="auth-name" name="name" value={form.name} onChange={update} required /><label htmlFor="auth-phone">Phone number <small>(optional)</small></label><input id="auth-phone" name="phone" value={form.phone} onChange={update} /></>}
        <label htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" value={form.email} onChange={update} required />
        <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" minLength="8" value={form.password} onChange={update} required />
        {status && <p className="form-status error" role="alert">{status}</p>}
        <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setStatus(null); }}>{mode === 'signin' ? 'Need an account? Register' : 'Already have an account? Sign in'}</button>
      <p className="auth-privacy">Essential session cookies keep your account secure. Optional analytics cookies are not used.</p>
    </section>
  </main>;
}

export default AuthScreen;
