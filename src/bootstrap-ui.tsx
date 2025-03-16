import { createRoot } from 'react-dom/client';
import UI from './ui';
import type ECSpresso from 'ecspresso';
import type { Components, Events, Resources } from './types';

export default function bootstrapUI(ecs: ECSpresso<Components, Events, Resources>) {
	const uiEl = document.createElement('div');
	uiEl.id = 'ui-container';
	document.body.appendChild(uiEl);

	const root = createRoot(uiEl);

	root.render(<UI ecs={ecs} />);
}
