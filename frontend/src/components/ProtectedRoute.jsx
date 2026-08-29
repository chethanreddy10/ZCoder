import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  return isAuthenticated() ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
