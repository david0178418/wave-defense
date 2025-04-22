import { Bundle } from 'ecspresso';
import type { Components, Events, Resources } from '@/types';

export default
function mapInitializationBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('initialize-map')
		.setEventHandlers({
			initializeMap: {
				handler(_data, ecs) {
				},
			},
		})
		.bundle;
} 