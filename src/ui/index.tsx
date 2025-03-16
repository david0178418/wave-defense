import '@/styles.css';
import type { Components, Events, Resources } from "@/types";
import type ECSpresso from "ecspresso";
import { Provider } from "jotai";
import { ecsAtom, store } from "@/ui-state";
import { useEffect } from "react";
import SelectedEntities from "./components/selected-entities";

interface Props {
	ecs: ECSpresso<Components, Events, Resources>;
}

export default
function UI({ ecs }: Props) {

	useEffect(() => {
		store.set(ecsAtom, ecs);
	}, []);

	return (
		<>
			<Provider store={store}>
				<SelectedEntities />
			</Provider>
		</>
	);
}

