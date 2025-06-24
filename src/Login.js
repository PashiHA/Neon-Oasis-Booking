// src/Login.js
import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import './Login.css'; // создайте рядом стили

const auth = getAuth();

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('admin@oasis.com');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      onSuccess(); // рендерим Admin
    } catch {
      setError('Неправильный логин или пароль');
    }
  };

  return (
    <form onSubmit={submit} className="login-form">
      <h2>Вход в панель администратора</h2>
      <input type="email"    value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"    required />
      <input type="password" value={pass}  onChange={e=>setPass(e.target.value)}   placeholder="Пароль" required />
      <button type="submit">Войти</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
