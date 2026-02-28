const CACHE_NAME = "cet6-shell-v2";
const CACHE_PREFIX = "cet6-shell-";
const SHELL_FILES = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ).then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // HTML 页面采用网络优先，避免老版本页面被长期缓存。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match("/");
        })
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    ["style", "script", "font", "image"].includes(event.request.destination);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkPromise = fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "CET-6 片场提醒",
    body: "今天任务还没完成，记得打卡。",
    url: "/"
  };

  if (event.data) {
    try {
      payload = JSON.parse(event.data.text());
    } catch (error) {
      console.error("Push 数据解析失败", error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      data: {
        url: payload.url
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
