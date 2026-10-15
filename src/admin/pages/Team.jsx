import { useState } from "react";

import { adminCall, clearAdminSession } from "../../lib/adminApi";
import { formatDate } from "../../lib/format";
import { Badge, Card, Empty, ErrorBox, Field, Modal, PageHead, Spinner, Toggle, act, askConfirm, toast, useAdmin, useLoad } from "../ui";

const ROLE_HELP = {
  owner: "Everything, including team, secrets and restoring backups.",
  manager: "Orders, products, stock, customers, coupons, site text, settings, reports and profit numbers. No team, no restore.",
  staff: "Handle orders, see products and stock, answer messages and reviews. No profit numbers, no settings.",
};

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user;
  const [f, setF] = useState(user ? { ...user, password: "" } : { id: "", username: "", name: "", role: "staff", password: "", active: true });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    const res = await act("teamSave", f, "Saved.");
    setBusy(false);
    if (res) onSaved();
  }

  return (
    <Modal
      title={isNew ? "Add team member" : `Edit ${user.username}`}
      onClose={onClose}
      footer={<><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button type="button" className="ad-btn primary" disabled={busy} onClick={save}>Save</button></>}
    >
      <div className="ad-form">
        <div className="ad-row">
          <Field label="Username *" hint="Used to log in. Letters, numbers, . - _"><input value={f.username} onChange={(e) => set("username", e.target.value.toLowerCase())} autoCapitalize="none" /></Field>
          <Field label="Display name"><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        </div>
        <Field label="Role" hint={ROLE_HELP[f.role]}>
          <select value={f.role} onChange={(e) => set("role", e.target.value)}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </Field>
        <Field label={isNew ? "Starting password *" : "New password (leave empty to keep)"} hint="At least 6 characters. They must not reuse the default password.">
          <input type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        {!isNew && <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Account is active" hint="Turn off to stop this person from logging in" />}
      </div>
    </Modal>
  );
}

export function Team() {
  const { user: me } = useAdmin();
  const { data, loading, error, reload } = useLoad("team");
  const [edit, setEdit] = useState(undefined);

  async function logoutAll(u) {
    if (!(await askConfirm({ title: `Log ${u.name || u.username} out everywhere?`, confirmLabel: "Log out", danger: true }))) return;
    await act("teamLogoutAll", { id: u.id }, "Logged out everywhere.");
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Team & access" sub="Give helpers their own login with limited access">
        <button type="button" className="ad-btn primary" onClick={() => setEdit(null)}>＋ Add member</button>
      </PageHead>

      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Member</th><th>Role</th><th>Last login</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong><small>@{u.username}{u.id === me?.id ? " (you)" : ""}</small></td>
                <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                <td>{u.lastLogin ? formatDate(u.lastLogin, true) : "never"}</td>
                <td>{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
                <td>
                  <div className="ad-btn-row" style={{ flexWrap: "nowrap", justifyContent: "flex-end" }}>
                    <button type="button" className="ad-btn small" onClick={() => setEdit(u)}>Edit</button>
                    <button type="button" className="ad-btn small" onClick={() => logoutAll(u)}>Log out everywhere</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ad-grid c3" style={{ marginTop: 18 }}>
        {Object.entries(ROLE_HELP).map(([role, text]) => (
          <div className="ad-note" key={role}><b style={{ textTransform: "capitalize" }}>{role}</b><br />{text}</div>
        ))}
      </div>

      {edit !== undefined && <UserModal user={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); reload(); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
export function Activity() {
  const [actor, setActor] = useState("");
  const { data, loading, error, reload } = useLoad("activity", { actor, limit: 300 }, [actor]);

  return (
    <>
      <PageHead title="Activity log" sub="Who changed what, newest first">
        <input type="text" placeholder="Filter by username" value={actor} onChange={(e) => setActor(e.target.value.trim())} style={{ width: 200 }} />
        <button type="button" className="ad-btn" onClick={reload}>Refresh</button>
      </PageHead>

      {loading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : !(data.items || []).length ? <Empty>Nothing logged yet.</Empty> : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map((a, n) => (
                <tr key={n}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(a.time, true)}</td>
                  <td>{a.actor}<small>{a.role}</small></td>
                  <td className="ad-mono">{a.action}</td>
                  <td>{a.target}</td>
                  <td className="ad-muted" style={{ maxWidth: 320, wordBreak: "break-word" }}>{typeof a.details === "string" ? a.details : JSON.stringify(a.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
export function Backups() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useLoad("backups");
  const [busy, setBusy] = useState(false);

  async function snapshot() {
    const reason = window.prompt("Name this restore point (optional):", "Manual snapshot");
    if (reason === null) return;
    setBusy(true);
    await act("backupCreate", { reason }, "Restore point saved.");
    setBusy(false);
    reload();
  }

  async function full() {
    setBusy(true);
    const res = await act("backupFull", {}, "Full backup copy saved to Google Drive.");
    setBusy(false);
    if (res) reload();
  }

  async function restore(s) {
    if (!(await askConfirm({ title: "Restore the product catalog to this point?", message: `${s.reason || "Snapshot"} (${formatDate(s.time, true)}). Products and categories go back to how they were then. A new restore point of the current state is saved first. Orders are not touched.`, confirmLabel: "Restore", danger: true }))) return;
    setBusy(true);
    const res = await act("backupRestore", { id: s.id }, "Catalog restored.");
    setBusy(false);
    if (res) reload();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Backups" sub="Your data lives in your Google Sheet. These are extra safety nets.">
        <button type="button" className="ad-btn" disabled={busy} onClick={snapshot}>Save restore point</button>
        {can("backups.run") && <button type="button" className="ad-btn primary" disabled={busy} onClick={full}>Back up whole sheet to Drive</button>}
      </PageHead>

      <Card title="Full backup (Google Drive)">
        {data.lastFullBackup ? (
          <p style={{ margin: 0 }}>
            Last copy: <b>{formatDate(data.lastFullBackup, true)}</b>{" "}
            {data.lastFullBackupUrl && <a href={data.lastFullBackupUrl} target="_blank" rel="noreferrer">Open the copy</a>}
          </p>
        ) : <p className="ad-muted" style={{ margin: 0 }}>No full backup yet. A daily one runs automatically once the triggers are installed (Settings → Notifications → Install automatic jobs).</p>}
      </Card>

      <Card title="Catalog restore points" sub="Saved automatically before bulk changes, deletes and CSV imports, and every day.">
        {!(data.snapshots || []).length ? <Empty>No restore points yet.</Empty> : (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>When</th><th>Reason</th><th>By</th><th></th></tr></thead>
              <tbody>
                {data.snapshots.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.time, true)}</td>
                    <td>{s.reason}</td>
                    <td>{s.actor}</td>
                    <td>{can("backups.restore") && <button type="button" className="ad-btn small danger" disabled={busy} onClick={() => restore(s)}>Restore</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
export function Password() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "", again: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save(event) {
    event.preventDefault();
    if (f.newPassword !== f.again) return toast("The two new passwords do not match.", "error");

    setBusy(true);
    try {
      await adminCall("changePassword", { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast("Password changed. Please log in again.");
      clearAdminSession();
      window.dispatchEvent(new Event("pearlskino-admin-auth-lost"));
    } catch (problem) {
      toast(problem.message, "error");
    }
    setBusy(false);
  }

  return (
    <>
      <PageHead title="My password" sub="You will be logged out afterwards and sign in with the new one" />
      <Card>
        <form className="ad-form" style={{ maxWidth: 420 }} onSubmit={save}>
          <Field label="Current password"><input type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => set("currentPassword", e.target.value)} required /></Field>
          <Field label="New password" hint="At least 6 characters, not the default one, not your username"><input type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => set("newPassword", e.target.value)} required /></Field>
          <Field label="New password again"><input type="password" autoComplete="new-password" value={f.again} onChange={(e) => set("again", e.target.value)} required /></Field>
          <div><button type="submit" className="ad-btn primary" disabled={busy}>Change password</button></div>
        </form>
      </Card>
    </>
  );
}
