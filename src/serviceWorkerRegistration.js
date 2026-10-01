// Service Worker registration for PWA installability & offline caching

export function register() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('PWA ServiceWorker registered successfully: ', registration.scope);
        })
        .catch((error) => {
          console.error('Error during ServiceWorker registration:', error);
        });
    });
  } else if ('serviceWorker' in navigator) {
    // In development mode, also register if requested
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Dev SW registered:', reg.scope))
        .catch(() => {});
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
