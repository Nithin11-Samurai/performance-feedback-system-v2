/**
 * Bridges the LoadingContext (a React context, only usable via hooks)
 * into api.js, which is a plain module and can't call hooks directly.
 * LoadingProvider registers its show/hide functions here once on mount;
 * the axios interceptor in api.js calls them for any request that opts in
 * via `{ showGlobalLoader: true }` in its request config.
 */
let handlers = { show: () => {}, hide: () => {} };

export function registerLoaderHandlers(show, hide) {
  handlers = { show, hide };
}

export function triggerGlobalLoaderShow() {
  handlers.show();
}

export function triggerGlobalLoaderHide() {
  handlers.hide();
}
