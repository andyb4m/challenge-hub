// Deliberately minimal: Chrome's install-prompt criteria require an active
// service worker with a fetch handler, but this app is Firestore-realtime
// (leaderboards, activity feeds), so caching responses would risk showing
// stale data. This just passes every request straight through.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
