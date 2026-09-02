import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ScrollToTop() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const id = decodeURIComponent(hash.replace(/^#/, ""));
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    }, 0);
  }, [pathname, search, hash]);

  useEffect(() => {
    if (pathname === "/") return;
    if (!pathname.endsWith("/")) return;
    const next = pathname.replace(/\/+$/, "");
    navigate(`${next}${search}${hash}`, { replace: true });
  }, [hash, navigate, pathname, search]);

  return null;
}
