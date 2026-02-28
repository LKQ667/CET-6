"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 开发环境主动清理 SW 与缓存，避免旧资源导致页面样式/文案错乱。
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch((error) => console.error("开发环境注销 SW 失败", error));

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("cet6-shell-"))
                .map((key) => caches.delete(key))
            )
          )
          .catch((error) => console.error("开发环境清理缓存失败", error));
      }
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => console.error("SW 注册失败", error));
  }, []);

  return null;
}
