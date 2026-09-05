export function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={`themeToggle ${dark ? 'isDark' : ''}`}
      onClick={onToggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <span className="themeToggleTrack" aria-hidden="true">
        <span className="themeToggleIcon themeToggleIcon--sun">☀</span>
        <span className="themeToggleIcon themeToggleIcon--moon">☾</span>
        <span className="themeToggleThumb" />
      </span>
      <span className="themeToggleLabel">{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
