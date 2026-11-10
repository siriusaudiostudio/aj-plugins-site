import { renderToString } from 'react-dom/server';
import { App } from './App';
export { pages } from './App';
export { site } from './config';
export const render = (path: string) => renderToString(<App path={path}/>);
