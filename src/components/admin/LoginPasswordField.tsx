"use client";

import { useState } from "react";

export function LoginPasswordField({ className }: { className: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor="password" className="text-sm font-medium">
        Lösenord
      </label>
      <input
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        required
        className={className}
      />
      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
          aria-controls="password"
          className="h-5 w-5 accent-accent"
        />
        Visa lösenord
      </label>
    </div>
  );
}