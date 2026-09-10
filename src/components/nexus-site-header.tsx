"use client";

import { Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { hasFirebaseAdminRole, subscribeToFirebaseAuth } from "@/lib/firebase-rest";
import styles from "./nexus-site-header.module.css";

const mainLinks = [
  ["Home", "/"],
  ["Map", "/map"],
  ["Reports", "/reports"],
  ["Services", "/services"],
  ["Updates", "/updates"],
] as const;

export function NexusSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshAdmin = async () => {
    try {
      setIsAdmin(await hasFirebaseAdminRole());
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    void refreshAdmin();
    return subscribeToFirebaseAuth(() => { void refreshAdmin(); });
  }, []);

  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand} aria-label="Nexus home">
        <span className={styles.mark}>N</span>
        <span><strong>Nexus</strong><small>LASU Epe</small></span>
      </a>

      <nav className={styles.desktopNav} aria-label="Primary navigation">
        {mainLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
        {isAdmin ? <a href="/admin" className={styles.adminLink}>Admin</a> : null}
      </nav>

      <div className={styles.actions}>
        <button type="button" className={`account-button ${styles.account}`} aria-label="Open Nexus account">
          <UserRound size={18} />
          <span>My account</span>
        </button>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen ? (
        <nav className={styles.mobileMenu} aria-label="Mobile navigation">
          {mainLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
          {isAdmin ? <a href="/admin" className={styles.mobileAdmin}>Admin dashboard</a> : null}
          <button type="button" className="account-button">My account</button>
        </nav>
      ) : null}
    </header>
  );
}
