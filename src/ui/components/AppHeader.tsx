import React from "react";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  notice?: string | null;
};

export default function AppHeader({ title, subtitle, notice }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {notice && <div>{notice}</div>}
    </header>
  );
}
