import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: 18 }}>
          NIRF Readiness <span>Portal</span>
        </div>
        <h1>Sign in</h1>
        <p className="sub">Departmental accounts are issued by IQAC. There is no self-registration.</p>
        <LoginForm />
        <div className="demo">
          Seeded accounts: <code>iqac@ssu.edu</code>, <code>vc@ssu.edu</code>, <code>research@ssu.edu</code>,{" "}
          <code>placement@ssu.edu</code>, <code>admissions@ssu.edu</code>, <code>registrar@ssu.edu</code> — password{" "}
          <code>nirf1234</code>.
        </div>
      </div>
    </div>
  );
}
