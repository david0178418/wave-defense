import { mergeBundles } from "ecspresso";
import mouseInputBundle from "./mouse-input.bundle";
import mapPanningBundle from "./map-panning.bundle";

export default
function controlsBundle() {
	return mergeBundles(
		'controls-bundle',
		mouseInputBundle(),
		mapPanningBundle(),
	);
}