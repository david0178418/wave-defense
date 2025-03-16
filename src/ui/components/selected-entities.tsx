import { removeSelectedEntity, useSelectedEntities } from "@/ui-state";

export default
function SelectedEntities() {
	const selectedEntities = useSelectedEntities();

	return <div className="selected-entities">
		{selectedEntities.length === 0 && <p>No entities selected</p>}
		{selectedEntities.map((entity, index) => (
			<div
				key={index}
				className="selected-entity"
			>
				<button onClick={() => removeSelectedEntity(entity)}>
					{entity.id}
				</button>
			</div>
		))}
	</div>;
}