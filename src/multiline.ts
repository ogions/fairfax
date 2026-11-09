import { Document, MultilineType } from "@goldenrod-app/hyperion";
import { LineRange } from "./range";
import { View } from "./view";

export class MultilineRange {
    type: MultilineType;
    range: LineRange;

    constructor(type: MultilineType, range: LineRange) {
        this.type = type;
        this.range = range;
    }
}

export class MultilineEnd {
    type: MultilineType;
    index: number;
    forward: boolean;

    constructor(type: MultilineType, index: number, forward: boolean) {
        this.type = type;
        this.index = index;
        this.forward = forward;
    }

    isInRange(range: LineRange) {
        return range.includesIndex(this.index);
    }
}

export class MultilineManager {
    activeMultilines: Set<MultilineRange> = new Set();
    openMultilines: MultilineEnd[] = [];
    view: View;

    constructor(view: View) {
        this.view = view;
    }

    manage(hyperionDocument: Document, range: LineRange) {
        // Clear any active ranges that are being reprocessed
        for (let multiline of this.activeMultilines) {
            if (range.includesRange(multiline.range)) {
                this.activeMultilines.delete(multiline);
            }
        }

        // Splice out any open ranges that are being reprocessed
        for (let i = this.openMultilines.length - 1; i >= 0; i--) {
            const openEnd = this.openMultilines[i];
            if (openEnd.isInRange(range)) {
                this.openMultilines.splice(i, 1);
            } 
        }

        // Add completed multiline structures to active ranges
        for (let structure of hyperionDocument.activeMultilines) {
            const start = structure.start + range.start;
            const end = structure.end + range.start;
            this.activeMultilines.add(new MultilineRange(
                structure.type,
                new LineRange(start, end)
            ));
        }

        // Collect open structures and see if we have any matches
        for (let structure of hyperionDocument.openMultilines) {
            const end = new MultilineEnd(
                structure.type,
                structure.index + range.start,
                structure.forward
            );
            this.tryClosing(end);
        }
    }

    tryClosing(end: MultilineEnd) {
        /* 
         * N.B. We don't try to close multilines on the same line. That's the
         * responsibiity of the parser. It also means we don't have to look at
         * inline offsets/token indexes, which reduces complexity a lot.
         */

        // Looking forwards
        if (end.forward) {
            for (let i = 0; i < this.openMultilines.length; i++) {
                const otherEnd = this.openMultilines[i];
                if (
                    end.type === otherEnd.type &&
                    otherEnd.index > end.index &&
                    !otherEnd.forward
                ) {
                    this.close(end, otherEnd, i);
                }
            }
        } else {
        // Looking backwards
            for (let i = this.openMultilines.length - 1; i >= 0; i--) {
                const otherEnd = this.openMultilines[i];
                if (
                    end.type === otherEnd.type &&
                    otherEnd.index < end.index &&
                    otherEnd.forward
                ) {
                    this.close(otherEnd, end, i);
                }
            }
        }

        // Didn't find any matches
        this.openMultilines.push(end);
    }

    close(start: MultilineEnd, end: MultilineEnd, index: number) {
        this.openMultilines.splice(index, 1);
        const range = new MultilineRange(
            start.type,
            new LineRange(start.index, end.index)
        );
        this.activeMultilines.add(range);
    }

    /*
     * Update any multiline structures at or following a given range with the
     * given change in line count.
     */
    updateAfter(index: number, difference: number) {
        for (let multiline of this.activeMultilines) {
            if (multiline.range.end > index) {
                multiline.range.end += difference;
                if (multiline.range.start > index) {
                    multiline.range.start += difference;
                }
            }
        }
    }

    /* 
     * Check if the given range overlaps with any active multiline ranges. Note
     * that we exclude the case where the given range is larger than or equal to
     * an active range, as we're already processing the active range if so.
     */
    multilinesOverlap(range: LineRange): LineRange | undefined {
        for (let multiline of this.activeMultilines) {
            /*
             * We need to handle edge cases when the index of the edit is equal
             * to the multiline start or end. Tracking whether or not the edit
             * is within the multiline introduces a lot of new complexity, so
             * instead we just leave room for error and reparse the entire
             * affected range.
             *
             * Not perfect as this doesn't accommodate multiline edits,
             * especially cutting/pasting. Need to handle.
             */
            let wideRange = new LineRange(
                multiline.range.start - 1,
                multiline.range.end + 1
            );
            if (
                wideRange.overlaps(range) &&
                !range.includesRange(multiline.range)
            ) {
                return multiline.range;
            }
        }
        return;
    }
}
