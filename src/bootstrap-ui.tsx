import { createRoot } from 'react-dom/client';
import UI from './ui';
import type ECSpresso from 'ecspresso';
import type { Components, Events, Resources } from './types';

export default function bootstrapUI(ecs: ECSpresso<Components, Events, Resources>) {
	const uiRoot = document.createElement('div');
	const pixi = ecs.resourceManager.get('pixi');
	uiRoot.id = 'ui-container';
	
	const canvasContainerEl = document.createElement('div');
	canvasContainerEl.id = 'canvas-container';
	canvasContainerEl.appendChild(pixi.canvas);

	document.body.appendChild(uiRoot);
	document.body.appendChild(canvasContainerEl);

	const root = createRoot(uiRoot);

	root.render(<UI ecs={ecs} />);

	return root;
}
