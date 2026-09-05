import { Navigate, Outlet, useLocation } from "react-router-dom";
import { tokens } from "../stores/auth";

/** Auth gate: unauthenticated users see the login page; /login renders standalone. */
export function AppLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  if (!tokens.hasSession && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }
  if (tokens.hasSession && isAuthPage) {
    return <Navigate to="/app" replace />;
  }
  if (isAuthPage) {
    return <Outlet />;
  }
  return <Shell />;
}

import { Sidebar } from "../components/shared/Sidebar";
import { Topbar } from "../components/shared/Topbar";

function Shell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
