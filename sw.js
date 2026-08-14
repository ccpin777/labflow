/* One-time migration worker for LabFlow installations that used the old cache-first worker. */
self.addEventListener("install", event => {
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(key => /^labflow-/i.test(key)).map(key => caches.delete(key)))),
      self.registration.unregister()
    ]).then(() => self.clients.matchAll({ type: "window" })).then(clients => {
      clients.forEach(client => client.navigate(client.url));
    })
  );
});
