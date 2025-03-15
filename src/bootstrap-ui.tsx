// bootstrap a react app
import { createRoot } from 'react-dom/client';
import UI from './ui';

export default function bootstrapUI() {
	const uiEl = document.createElement('div');
	uiEl.id = 'ui-container';
	document.body.appendChild(uiEl);

	const root = createRoot(uiEl);

	root.render(<UI />);
}
