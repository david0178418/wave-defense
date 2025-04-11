import { createRoot } from 'react-dom/client';
import UI from './ui';
import type ECSpresso from 'ecspresso';
import type { Components, Events, Resources } from './types';

export default function bootstrapUI(el: HTMLElement, ecs: ECSpresso<Components, Events, Resources>) {
	const root = createRoot(el);

	root.render(<UI ecs={ecs} />);

	return root;
}
