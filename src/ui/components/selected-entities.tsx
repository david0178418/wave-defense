import { removeSelectedEntity, useSelectedEntities } from "@/ui-state";

export default
function SelectedEntities() {
	const selectedEntities = useSelectedEntities();

	if(!selectedEntities.length) return null;

	return <div >
		{selectedEntities.map((entity, index) => (
			<div
				key={index}
				className="bg-white inline-block mr-5"
			>
				<button className="cursor-pointer" onClick={() => removeSelectedEntity(entity)}>
					{entity.components.name}
				</button>
			</div>
		))}
	</div>;
}