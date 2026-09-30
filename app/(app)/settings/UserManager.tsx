"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addUser, editUser, removeUser } from "@/lib/actions/settings";
import { ROLES, type Role, type UserRecord } from "@/lib/db/types";
import { PKEYS, type Param } from "@/lib/engine";

const ROLE_LABEL: Record<Role, string> = { CONTRIBUTOR: "Contributor", IQAC: "IQAC", LEADERSHIP: "Leadership" };

export function UserManager({ users, selfId }: { users: UserRecord[]; selfId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  // new-user form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CONTRIBUTOR");
  const [owned, setOwned] = useState<Param[]>([]);

  function toggle(list: Param[], p: Param): Param[] {
    return list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await addUser({ email, name, password, role, ownedParams: owned });
      if (res.ok) {
        setMsg({ kind: "ok", text: `Added ${res.data.email}` });
        setEmail("");
        setName("");
        setPassword("");
        setOwned([]);
        router.refresh();
      } else setMsg({ kind: "err", text: res.error });
    });
  }

  function del(u: UserRecord) {
    if (!window.confirm(`Delete ${u.email}? Their edit history stays attributed; their sign-in stops immediately.`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await removeUser({ id: u.id });
      if (res.ok) setMsg({ kind: "ok", text: `Deleted ${u.email}` });
      else setMsg({ kind: "err", text: res.error });
      router.refresh();
    });
  }

  return (
    <>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Owns</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) =>
              editing === u.id ? (
                <EditRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === selfId}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSave={(patch) => {
                    setMsg(null);
                    startTransition(async () => {
                      const res = await editUser({ id: u.id, ...patch });
                      if (res.ok) {
                        setMsg({ kind: "ok", text: `Updated ${u.email}` });
                        setEditing(null);
                        router.refresh();
                      } else setMsg({ kind: "err", text: res.error });
                    });
                  }}
                />
              ) : (
                <tr key={u.id}>
                  <td>
                    {u.email}
                    {u.id === selfId ? <span className="small muted"> (you)</span> : null}
                  </td>
                  <td>{u.name}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.role === "CONTRIBUTOR" ? u.ownedParams.join(", ") || "—" : "all"}</td>
                  <td>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <button type="button" className="tinybtn" disabled={pending} onClick={() => setEditing(u.id)}>
                        Edit
                      </button>
                      <button type="button" className="tinybtn danger" disabled={pending || u.id === selfId} onClick={() => del(u)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <hr className="rule" />
      <h3 style={{ fontSize: 15, marginBottom: 10 }}>Add a user</h3>
      <form onSubmit={create} noValidate>
        <div className="grid2">
          <label className="field">
            <span className="lab">
              <span>Email</span>
            </span>
            <input type="email" value={email} autoComplete="off" onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span className="lab">
              <span>Name</span>
            </span>
            <input type="text" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="lab">
              <span>Password</span>
              <span className="unit">min 8 characters</span>
            </span>
            <input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="field">
            <span className="lab">
              <span>Role</span>
            </span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {role === "CONTRIBUTOR" ? (
          <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
            <legend className="small muted" style={{ marginBottom: 6 }}>
              Parameters this contributor owns
            </legend>
            <div className="chip" role="group">
              {PKEYS.map((p) => (
                <button key={p} type="button" aria-pressed={owned.includes(p)} onClick={() => setOwned(toggle(owned, p))}>
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="row" style={{ marginTop: 14 }}>
          <button type="submit" className="btn" disabled={pending}>
            Add user
          </button>
          {msg ? (
            <span className={msg.kind === "ok" ? "formok" : "formerr"} role="status" style={{ marginTop: 0 }}>
              {msg.text}
            </span>
          ) : null}
        </div>
      </form>
    </>
  );
}

function EditRow({
  user,
  isSelf,
  pending,
  onCancel,
  onSave,
}: {
  user: UserRecord;
  isSelf: boolean;
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: { name: string; role: Role; ownedParams: Param[]; password: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [owned, setOwned] = useState<Param[]>(user.ownedParams);
  const [password, setPassword] = useState("");
  return (
    <tr>
      <td>{user.email}</td>
      <td>
        <label className="sr-only" htmlFor={`nm-${user.id}`}>
          Name
        </label>
        <input id={`nm-${user.id}`} type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <label className="sr-only" htmlFor={`rl-${user.id}`}>
          Role
        </label>
        <select id={`rl-${user.id}`} value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {role === "CONTRIBUTOR" ? (
          <div className="chip" role="group" aria-label="Owned parameters">
            {PKEYS.map((p) => (
              <button key={p} type="button" aria-pressed={owned.includes(p)} onClick={() => setOwned(owned.includes(p) ? owned.filter((x) => x !== p) : [...owned, p])}>
                {p}
              </button>
            ))}
          </div>
        ) : (
          <span className="muted">all</span>
        )}
        <label className="field" style={{ marginTop: 8 }}>
          <span className="lab">
            <span>New password (optional)</span>
          </span>
          <input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
        </label>
      </td>
      <td>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button type="button" className="btn sm" disabled={pending} onClick={() => onSave({ name, role, ownedParams: owned, password })}>
            Save
          </button>
          <button type="button" className="tinybtn" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
