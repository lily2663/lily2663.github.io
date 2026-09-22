export const allowedViews = new Set([
  'overview',
  'articles',
  'drawers',
  'friends',
  'profile',
  'import',
  'resources',
  'layouts',
  'modules',
  'appearance',
  'settings',
  'version',
  'publish',
]);

const requestedView = new URLSearchParams(location.search).get('view');

export const state = {
  view: allowedViews.has(requestedView) ? requestedView : 'overview',
  posts: [],
  status: null,
  settings: null,
  theme: localStorage.getItem('desk-theme') || 'light',
};
