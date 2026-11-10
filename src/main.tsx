import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import './style.css';
import { App, pages } from './App';

const root = document.getElementById('root')!;
const path = location.pathname.replace(/\/$/, '') + '/';
const page = pages.find(item => item.path === path) ?? pages[pages.length - 1];
const app = <App path={page.path}/>;
if (root.firstElementChild) hydrateRoot(root, app);
else {
  document.title = page.path === '/' ? 'AJ Plugins | ' + page.title : page.title + ' | AJ Plugins';
  createRoot(root).render(app);
}
