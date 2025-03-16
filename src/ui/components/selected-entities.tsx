import { removeSelectedEntity, useSelectedEntities } from "@/ui-state";

export default
function SelectedEntities() {
	const selectedEntities = useSelectedEntities();

	if(!selectedEntities.length) return null;

	return <div className="bg-white">
		{selectedEntities.map((entity, index) => (
			<div
				key={index}
				className="selected-entity"
			>
				<button onClick={() => removeSelectedEntity(entity)}>
					{entity.components.name}
				</button>
			</div>
		))}
	</div>;
}