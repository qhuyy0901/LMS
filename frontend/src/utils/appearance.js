const defaults = {
  theme: 'auto',
  primaryColor: 'purple',
  fontSize: 'medium',
};

export const getStoredAppearance = () => ({
  theme: localStorage.getItem('skillio-theme') || defaults.theme,
  primaryColor: localStorage.getItem('skillio-primary-color') || defaults.primaryColor,
  fontSize: localStorage.getItem('skillio-font-size') || defaults.fontSize,
});

export const applyAppearance = (appearance = {}) => {
  const next = { ...defaults, ...appearance };
  const resolvedTheme = next.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : next.theme;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = next.theme;
  document.documentElement.dataset.primaryColor = next.primaryColor;
  document.documentElement.dataset.fontSize = next.fontSize;

  localStorage.setItem('skillio-theme', next.theme);
  localStorage.setItem('skillio-primary-color', next.primaryColor);
  localStorage.setItem('skillio-font-size', next.fontSize);
};

export const initializeAppearance = () => {
  applyAppearance(getStoredAppearance());

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    const appearance = getStoredAppearance();
    if (appearance.theme === 'auto') applyAppearance(appearance);
  });
};
