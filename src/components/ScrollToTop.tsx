import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ScrollToTop() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/") return;
    if (!pathname.endsWith("/")) return;
    const next = pathname.replace(/\/+$/, "");
    navigate(`${next}${search}${hash}`, { replace: true });
  }, [hash, navigate, pathname, search]);

  return null;
}
