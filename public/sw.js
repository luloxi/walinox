const CACHE = "walinox-v6";
const LOCAL = ["localhost", "127.0.0.1"].includes(self.location.hostname);

const PRECACHE = [
  "/",
  "/contacts",
  "/tienda",
  "/summary",
  "/settings",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/products/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)
  );
}

function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

async function cachePut(request, response) {
  if (!response || !response.ok) return;
  if (new URL(request.url).origin !== self.location.origin) return;
  const copy = response.clone();
  const cache = await caches.open(CACHE);
  await cache.put(request, copy);
}

async function fromCache(request) {
  return (await caches.match(request)) || (await caches.match(new URL(request.url).pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    LOCAL
      ? Promise.resolve()
      : caches.open(CACHE).then((cache) =>
          Promise.all(PRECACHE.map((path) => cache.add(path).catch(() => undefined))),
        ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (LOCAL) {
    event.respondWith(fetch(request).catch(async () => (await fromCache(request)) ?? Response.error()));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          void cachePut(request, response);
          return response;
        });
      }),
    );
    return;
  }

  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        const cached = await fromCache(request);
        const network = fetch(request)
          .then((response) => {
            void cachePut(request, response);
            return response;
          })
          .catch(() => null);
        if (cached) {
          void network;
          return cached;
        }
        return (await network) ?? (await caches.match("/")) ?? Response.error();
      })(),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        void cachePut(request, response);
        return response;
      })
      .catch(async () => (await fromCache(request)) ?? (await caches.match("/")) ?? Response.error()),
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Walinox",
    body: "Tenés un aviso",
    url: "/",
    tag: "walinox",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) payload.body = text;
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
      tag: payload.tag || "walinox",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICK", url: target });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type !== "SHOW_NOTIFICATION") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "Walinox", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: data.tag || "walinox-local",
    }),
  );
});
