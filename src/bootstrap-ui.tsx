import { createRoot } from 'react-dom/client';
import UI from './ui';
import type ECSpresso from 'ecspresso';
import type { Components, Events, Resources } from './types';

export default function bootstrapUI(el: HTMLElement, ecs: ECSpresso<Components, Events, Resources>) {
	// const uiEl = document.createElement('div');
	// uiEl.id = 'ui-container';
	// el.appendChild(uiEl);

	const root = createRoot(el);

	root.render(<UI ecs={ecs} />);

	return root;
}
