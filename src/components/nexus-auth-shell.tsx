"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, LockKeyhole, LogOut, ShieldCheck, UserRound, X } from "lucide-react";
import {
  createFirebaseAccount,
  getValidFirebaseSession,
  readFirebaseProfile,
  saveFirebaseProfile,
  signInFirebaseAccount,
  signOutFirebaseAccount,
  subscribeToFirebaseAuth,
} from "@/lib/firebase-rest";
import { getCampus, getInstitution, institutions } from "@/lib/campuses";

type NexusProfile = {
  id: string;
  name: string;
  email: string;
  matricNumber: string;
  institutionId: string;
  campusId: string;
  department: string;
  level: string;
  membershipStatus: "demo-verified";
};

type Mode = "signin" | "signup";

const USER_KEY = "nexus-user:v2";
const ADMIN_EMAIL_HASH = "0a88744b7504ad9b171e96a518026bdf40b50aeb0b13aaf13dafc182d7a41b90";

function writeLocalProfile(profile: NexusProfile | null) {
  if (profile) window.localStorage.setItem(USER_KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(USER_KEY);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buttonText(target: Element | null) {
  return target?.closest("button")?.textContent?.trim().toLowerCase() ?? "";
}

function isProtectedAction(target: Element | null) {
  const text = buttonText(target);
  return text.includes("report an issue")
    || text === "attest"
    || text.includes("add your service")
    || text.includes("list a service");
}

function isAccountAction(target: Element | null) {
  const button = target?.closest("button");
  if (!button) return false;
  if (button.classList.contains("account-button")) return true;
  const text = buttonText(target);
  return text === "sign in" || text === "my account";
}

function isAdminAction(target: Element | null) {
  return buttonText(target) === "admin view";
}

function removePrototypeChrome(isAdmin: boolean) {
  document.querySelectorAll<HTMLElement>(".beta-badge, .demo-label, .data-note").forEach((node) => {
    node.style.display = "none";
  });

  document.querySelectorAll<HTMLElement>("button").forEach((button) => {
    const text = button.textContent?.trim().toLowerCase() ?? "";
    if (text === "admin view") button.style.display = isAdmin ? "" : "none";
  });

  document.querySelectorAll<HTMLElement>("#account-heading").forEach((heading) => {
    const legacyDialog = heading.closest<HTMLElement>(".dialog-backdrop");
    if (legacyDialog) legacyDialog.style.display = "none";
  });

  document.querySelectorAll<HTMLElement>("small, p, span").forEach((node) => {
    if (node.children.length) return;
    const text = node.textContent ?? "";
    if (text.includes("Current demo period")) node.textContent = text.replace("Current demo period", "Current reporting period");
    if (text.includes("Live prototype")) node.textContent = text.replace("Live prototype", "Live overview");
    if (text.includes("Campus operations · prototype")) node.textContent = text.replace("Campus operations · prototype", "Campus operations");
  });
}

export function NexusAuthShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [profile, setProfile] = useState<NexusProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [institutionId, setInstitutionId] = useState("lasu");
  const selectedInstitution = useMemo(() => getInstitution(institutionId) ?? institutions[0], [institutionId]);
  const [campusId, setCampusId] = useState(selectedInstitution.campuses[0]?.id ?? "");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");

  const updateAdminState = async (nextProfile: NexusProfile | null) => {
    const allowed = nextProfile ? await sha256(nextProfile.email) === ADMIN_EMAIL_HASH : false;
    setIsAdmin(allowed);
    return allowed;
  };

  const restoreAccount = async () => {
    const session = await getValidFirebaseSession();
    if (!session) {
      writeLocalProfile(null);
      setProfile(null);
      await updateAdminState(null);
      setAuthReady(true);
      return;
    }
    try {
      const cloudProfile = await readFirebaseProfile<NexusProfile>();
      if (cloudProfile) {
        writeLocalProfile(cloudProfile);
        setProfile(cloudProfile);
        await updateAdminState(cloudProfile);
      } else {
        const raw = window.localStorage.getItem(USER_KEY);
        const local = raw ? JSON.parse(raw) as NexusProfile : null;
        if (local?.id === session.localId) {
          setProfile(local);
          await updateAdminState(local);
        }
      }
    } catch (restoreError) {
      console.warn("Nexus account profile could not be restored.", restoreError);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    void restoreAccount();
    return subscribeToFirebaseAuth(() => { void restoreAccount(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    removePrototypeChrome(isAdmin);
    const observer = new MutationObserver(() => removePrototypeChrome(isAdmin));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isAdmin]);

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const target = event.target as Element | null;

      if (isAdminAction(target) && !isAdmin) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError("Admin access is restricted.");
        return;
      }

      if (isAccountAction(target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError("");
        setOpen(true);
        return;
      }

      if (!profile && isProtectedAction(target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setError("Create or sign in to your Nexus account before taking this campus action.");
        setOpen(true);
      }
    };

    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [isAdmin, profile]);

  const signUp = async () => {
    if (!name.trim()) throw new Error("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter a valid email address.");
    if (password.length < 6) throw new Error("Use a password with at least 6 characters.");
    if (!matricNumber.trim()) throw new Error("Enter your matric number.");
    if (!institutionId || !campusId) throw new Error("Choose your institution and campus.");

    const session = await createFirebaseAccount(email, password);
    const nextProfile: NexusProfile = {
      id: session.localId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      matricNumber: matricNumber.trim().toUpperCase(),
      institutionId,
      campusId,
      department: department.trim(),
      level,
      membershipStatus: "demo-verified",
    };
    await saveFirebaseProfile(nextProfile);
    writeLocalProfile(nextProfile);
    setProfile(nextProfile);
    await updateAdminState(nextProfile);
  };

  const signIn = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter your email address.");
    if (!password) throw new Error("Enter your password.");

    const session = await signInFirebaseAccount(email, password);
    const cloudProfile = await readFirebaseProfile<NexusProfile>();
    if (!cloudProfile) {
      signOutFirebaseAccount();
      throw new Error("No Nexus profile was found for this account.");
    }
    if (cloudProfile.id !== session.localId) {
      signOutFirebaseAccount();
      throw new Error("This campus profile does not match the signed-in account.");
    }

    writeLocalProfile(cloudProfile);
    setProfile(cloudProfile);
    await updateAdminState(cloudProfile);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") await signUp();
      else await signIn();
      setOpen(false);
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not complete sign in.");
    } finally {
      setBusy(false);
    }
  };

  const logOut = () => {
    signOutFirebaseAccount();
    writeLocalProfile(null);
    setProfile(null);
    setIsAdmin(false);
    setOpen(false);
    window.location.reload();
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
  };

  return (
    <>
      {children}
      {!authReady ? null : open ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="firebase-account-heading">
            <div className="account-dialog-heading">
              <div>
                <span className="eyebrow">Nexus account</span>
                <h2 id="firebase-account-heading">{profile ? `Welcome, ${profile.name.split(" ")[0]}` : mode === "signup" ? "Create your campus account" : "Sign in to Nexus"}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close account dialog"><X size={18} /></button>
            </div>

            {profile ? (
              <>
                <div className="account-profile">
                  <span className="account-avatar" aria-hidden="true">{profile.name.charAt(0).toUpperCase()}</span>
                  <span>
                    <strong>{profile.name}</strong>
                    <small>{profile.matricNumber} · {profile.email}</small>
                    <small>{getInstitution(profile.institutionId)?.shortName ?? profile.institutionId} · {getCampus(profile.campusId)?.name ?? profile.campusId}</small>
                  </span>
                </div>
                <div className="membership-badge eligible"><ShieldCheck size={16} /><span><strong>Campus account</strong>Signed in and ready for campus actions</span></div>
                <p className="account-note">Reports and attestations are tied to this account. You can still choose to hide your name publicly when submitting a report.</p>
                <button className="secondary-button sign-out-button" type="button" onClick={logOut}><LogOut size={17} /> Sign out</button>
              </>
            ) : (
              <>
                {error ? <div className="account-reason"><LockKeyhole size={17} /><span>{error}</span></div> : null}
                <div className="account-mode-switch" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button className={mode === "signin" ? "primary-button" : "secondary-button"} type="button" onClick={() => switchMode("signin")}>Sign in</button>
                  <button className={mode === "signup" ? "primary-button" : "secondary-button"} type="button" onClick={() => switchMode("signup")}>Create account</button>
                </div>

                <form className="account-form" onSubmit={submit}>
                  {mode === "signup" ? (
                    <>
                      <div className="field-group"><label htmlFor="firebase-name">Full name <span>*</span></label><input id="firebase-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></div>

                      <fieldset className="account-campus-fields">
                        <legend>Campus membership</legend>
                        <div className="field-group">
                          <label htmlFor="firebase-institution">Institution <span>*</span></label>
                          <select id="firebase-institution" value={institutionId} onChange={(event) => {
                            const nextInstitution = getInstitution(event.target.value) ?? institutions[0];
                            setInstitutionId(nextInstitution.id);
                            setCampusId(nextInstitution.campuses[0]?.id ?? "");
                          }}>
                            {institutions.map((institution) => <option value={institution.id} key={institution.id}>{institution.name}</option>)}
                          </select>
                        </div>
                        <div className="field-group">
                          <label htmlFor="firebase-campus">Campus <span>*</span></label>
                          <select id="firebase-campus" value={campusId} onChange={(event) => setCampusId(event.target.value)}>
                            {selectedInstitution.campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}
                          </select>
                        </div>
                        <div className="field-group"><label htmlFor="firebase-matric">Matric number <span>*</span></label><input id="firebase-matric" value={matricNumber} onChange={(event) => setMatricNumber(event.target.value)} autoComplete="off" /></div>
                      </fieldset>

                      <div className="form-row">
                        <div className="field-group"><label htmlFor="firebase-department">Department <span className="optional">Optional</span></label><input id="firebase-department" value={department} onChange={(event) => setDepartment(event.target.value)} /></div>
                        <div className="field-group"><label htmlFor="firebase-level">Level <span className="optional">Optional</span></label><select id="firebase-level" value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Select level</option><option value="100">100 level</option><option value="200">200 level</option><option value="300">300 level</option><option value="400">400 level</option><option value="500">500 level</option><option value="postgraduate">Postgraduate</option></select></div>
                      </div>
                    </>
                  ) : null}

                  <div className="field-group"><label htmlFor="firebase-email">Email <span>*</span></label><input id="firebase-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
                  <div className="field-group"><label htmlFor="firebase-password">Password <span>*</span></label><input id="firebase-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} /></div>
                  <p className="account-note"><UserRound size={14} /> {mode === "signup" ? "Your password is handled securely by Firebase Authentication and is never stored by Nexus." : "Use the same email and password you used when creating your account."}</p>
                  <button className="primary-button account-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={17} /></button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
