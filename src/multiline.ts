import { MultilineStructure, MultilineType } from "fairfax";
import { LineRange } from "./range";

export class MultilineRange {
    type: MultilineType;
    range: LineRange;

    constructor(type: MultilineType, range: LineRange) {
        this.type = type;
        this.range = range;
    }
}

export class MultilineManager {
    container: HTMLElement;
    activeRanges: MultilineRange[] = [];

    constructor(container: HTMLElement) {
        this.container = container;
    }

    readStructures(multilines: MultilineStructure[]) {
        this.activeRanges = [];
        for (let multiline of multilines) {
            /* We first check for open-ended structures that are missing either
             * a start or end. If both are defined, then we can just assign them
             * directly to the new range.
             */
            if (typeof multiline.start === "undefined" &&
                typeof multiline.end !== "undefined") {
                this.activeRanges.push(
                    new MultilineRange(
                        multiline.type,
                        new LineRange(0, multiline.end)
                    )
                );
            } else if (typeof multiline.start !== "undefined" &&
                typeof multiline.end === "undefined") {
                this.activeRanges.push(
                    new MultilineRange(
                        multiline.type,
                        new LineRange(multiline.start, this.container.children.length - 1)
                    )
                );
            } else if (typeof multiline.start !== "undefined" &&
                typeof multiline.end !== "undefined") {
                this.activeRanges.push(
                    new MultilineRange(
                        multiline.type,
                        new LineRange(multiline.start, multiline.end)
                    )
                );
            }
        }
    }
    

}
