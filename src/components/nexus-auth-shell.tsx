"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { LockKeyhole, LogOut, ShieldCheck, UserRound, X } from "lucide-react";
import {
  createFirebaseAccount,
  getValidFirebaseSession,
  hasFirebaseAdminRole,
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

function writeLocalProfile(profile: NexusProfile | null) {
  if (profile) window.localStorage.setItem(USER_KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(USER_KEY);
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
    if (!nextProfile) {
      setIsAdmin(false);
      return;
    }
    try {
      setIsAdmin(await hasFirebaseAdminRole());
    } catch {
      setIsAdmin(false);
    }
  };

  const restoreAccount = async () => {
    try {
      const session = await getValidFirebaseSession();
      if (!session) {
        writeLocalProfile(null);
        setProfile(null);
        await updateAdminState(null);
        return;
      }

      const cloudProfile = await readFirebaseProfile<NexusProfile>();
      if (cloudProfile) {
        writeLocalProfile(cloudProfile);
        setProfile(cloudProfile);
        await updateAdminState(cloudProfile);
        return;
      }

      const raw = window.localStorage.getItem(USER_KEY);
      const local = raw ? JSON.parse(raw) as NexusProfile : null;
      if (local?.id === session.localId) {
        setProfile(local);
        await updateAdminState(local);
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
    const openAccount = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>("button.account-button");
      if (!button || button.closest(".account-dialog")) return;
      event.preventDefault();
      setError("");
      setOpen(true);
    };
    document.addEventListener("click", openAccount);
    return () => document.removeEventListener("click", openAccount);
  }, []);

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
    if (!cloudProfile || cloudProfile.id !== session.localId) {
      signOutFirebaseAccount();
      throw new Error("No matching Nexus profile was found for this account.");
    }
    writeLocalProfile(cloudProfile);
    setProfile(cloudProfile);
    await updateAdminState(cloudProfile);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
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
      {authReady && open ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
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
                {isAdmin ? <div className="membership-badge eligible"><ShieldCheck size={16} /><span><strong>Administrator</strong>Campus moderation tools enabled</span></div> : null}
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
                        <div className="field-group"><label htmlFor="firebase-institution">Institution <span>*</span></label><select id="firebase-institution" value={institutionId} onChange={(event) => { const next = getInstitution(event.target.value) ?? institutions[0]; setInstitutionId(next.id); setCampusId(next.campuses[0]?.id ?? ""); }}>{institutions.map((institution) => <option value={institution.id} key={institution.id}>{institution.name}</option>)}</select></div>
                        <div className="field-group"><label htmlFor="firebase-campus">Campus <span>*</span></label><select id="firebase-campus" value={campusId} onChange={(event) => setCampusId(event.target.value)}>{selectedInstitution.campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></div>
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
                  <p className="account-note"><UserRound size={14} /> {mode === "signup" ? "Your password is handled by Firebase Authentication and is never stored by Nexus." : "Use the email and password for your Nexus account."}</p>
                  <button className="primary-button account-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
