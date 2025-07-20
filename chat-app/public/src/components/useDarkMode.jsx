import { useEffect, useState } from "react";

export default function useDarkMode() {
  const [enabled, setEnabled] = useState(
    () => JSON.parse(localStorage.getItem("dark-mode")) || false
  );

  useEffect(() => {
    const root = window.document.documentElement;
    if (enabled) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("dark-mode", JSON.stringify(enabled));
  }, [enabled]);

  return [enabled, setEnabled];
}
