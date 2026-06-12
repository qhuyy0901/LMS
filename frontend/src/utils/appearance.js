const defaults = {
  theme: 'light',
  primaryColor: 'purple',
  fontSize: 'medium',
};

const normalizeTheme = (theme) => (theme === 'light' ? 'light' : defaults.theme);

export const getStoredAppearance = () => ({
  theme: normalizeTheme(localStorage.getItem('skillio-theme')),
  primaryColor: localStorage.getItem('skillio-primary-color') || defaults.primaryColor,
  fontSize: localStorage.getItem('skillio-font-size') || defaults.fontSize,
});

export const applyAppearance = (appearance = {}) => {
  const next = { ...defaults, ...appearance, theme: normalizeTheme(appearance.theme) };
  const resolvedTheme = next.theme;

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
};
