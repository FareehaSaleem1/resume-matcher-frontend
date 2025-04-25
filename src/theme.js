// theme.js – toggles light/dark theme using Tailwind's class strategy
export const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
  };
  