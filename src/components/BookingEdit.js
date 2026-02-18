import React, { useEffect, useMemo, useState } from "react";

export default function BookingEdit() {
  const qs = new URLSearchParams(window.location.search);
  const bid = qs.get("bid") || "";
  const token = qs.get("token") || "";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "VR",
    date: "",
    time: "",
    quantity: 1,
  });

  const [status, setStatus] = useState("idle"); // idle | loading | saved | cancelled | error
  const [msg, setMsg] = useState("");

  const capacity = useMemo(
    () => ({ VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 }),
    []
  );

  const timeslots = useMemo(() => {
    const slots = [];
    let hour = 12;
    let minute = 0;
    while (hour < 24) {
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    return slots;
  }, []);

  // ⚠️ Упрощение: мы не подтягиваем существующую бронь (можно добавить позже).
  // Сейчас пользователь просто меняет данные и отправляет.
  // Если хочешь — я добавлю /api/bookings/get.js и загрузку текущих данных.

  const onChange = (e) => {
    const { name, value } = e.target;
    setStatus("idle");
    setMsg("");
    setForm((p) => ({
      ...p,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!bid || !token) {
      setStatus("error");
      setMsg("Неверная ссылка (нет bid/token).");
      return;
    }

    setStatus("loading");
    setMsg("");

    const res = await fetch("/api/bookings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bid,
        token,
        patch: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: (form.email || "").trim(),
          service: form.service,
          date: form.date,
          time: form.time,
          quantity: Number(form.quantity) || 1,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus("error");
      setMsg(data?.error || "Ошибка изменения брони");
      return;
    }

    setStatus("saved");
    setMsg("Бронь обновлена ✅");
  };

  const cancel = async () => {
    if (!bid || !token) {
      setStatus("error");
      setMsg("Неверная ссылка (нет bid/token).");
      return;
    }
    if (!window.confirm("Точно отменить бронь?")) return;

    setStatus("loading");
    setMsg("");

    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bid, token }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus("error");
      setMsg(data?.error || "Ошибка отмены");
      return;
    }

    setStatus("cancelled");
    setMsg("Бронь отменена ❌");
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16, color: "#fff" }}>
      <h2 style={{ marginBottom: 10 }}>Изменить / отменить бронь</h2>

      <div style={{ opacity: 0.9, marginBottom: 16 }}>
        Номер брони: <b>{bid || "—"}</b>
      </div>

      <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
        <label>
          Имя:
          <input name="name" value={form.name} onChange={onChange} required />
        </label>

        <label>
          Телефон:
          <input name="phone" value={form.phone} onChange={onChange} required />
        </label>

        <label>
          Email:
          <input type="email" name="email" value={form.email} onChange={onChange} />
        </label>

        <label>
          Развлечение:
          <select name="service" value={form.service} onChange={onChange}>
            <option value="VR">VR</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Billiard">Бильярд</option>
            <option value="Autosim">Автосимулятор</option>
            <option value="PC">Компьютеры (5 ПК)</option>
          </select>
        </label>

        <label>
          Кол-во мест:
          <select name="quantity" value={form.quantity} onChange={onChange}>
            {Array.from({ length: capacity[form.service] || 1 }, (_, i) => i + 1).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <label>
          Дата:
          <input type="date" name="date" value={form.date} onChange={onChange} required />
        </label>

        <label>
          Время:
          <select name="time" value={form.time} onChange={onChange} required>
            <option value="">Выберите</option>
            {timeslots.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={status === "loading" || status === "cancelled"}>
          {status === "loading" ? "Сохранение..." : "Сохранить изменения"}
        </button>

        <button
          type="button"
          onClick={cancel}
          disabled={status === "loading" || status === "cancelled"}
          style={{ background: "#a00000", color: "#fff", padding: 10, border: "none", cursor: "pointer" }}
        >
          Отменить бронь
        </button>

        {msg && (
          <div style={{ marginTop: 10, padding: 10, background: "rgba(0,0,0,.5)", borderRadius: 10 }}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}
