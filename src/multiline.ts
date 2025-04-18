import { Document, MultilineType } from "fairfax";
import { LineRange } from "./range";

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
    start: number | undefined;
    end: number | undefined;

    constructor(type: MultilineType, start?: number, end?: number) {
        this.type = type;
        this.start = start;
        this.end = end;
    }

    isInRange(range: LineRange) {
        if (typeof this.start === "number" &&
            range.includesIndex(this.start)) {
            return true;
        }
        if (typeof this.end === "number" &&
            range.includesIndex(this.end)) {
            return true;
        }
        return false;
    }
}

export class MultilineManager {
    container: HTMLElement;
    activeRanges: Set<MultilineRange> = new Set();
    openEnds: MultilineEnd[] = [];

    constructor(container: HTMLElement) {
        this.container = container;
    }

    manage(fairfaxDocument: Document, range: LineRange) {

        // Clear any active ranges that are being reprocessed
        for (let activeRange of this.activeRanges) {
            if (range.includes(activeRange.range)) {
                this.activeRanges.delete(activeRange);
            }
        }

        // Splice out any open ranges that are being reprocessed
        for (let i = this.openEnds.length - 1; i >= 0; i--) {
            const openEnd = this.openEnds[i];
            if (openEnd.isInRange(range)) {
                this.openEnds.splice(i, 1);
            } 
        }

        for (let activeMultiline of fairfaxDocument.activeMultilines) {
            if (typeof activeMultiline.startLine === "undefined" ||
                typeof activeMultiline.endLine === "undefined") continue;
            this.activeRanges.add(new MultilineRange(
                activeMultiline.type,
                new LineRange(activeMultiline.startLine + range.start, activeMultiline.endLine + range.start)
            ));
        }
        for (let openMultiline of fairfaxDocument.openMultilines) {
            if (typeof openMultiline.startLine === "undefined") {
                if (typeof openMultiline.endLine === "undefined") continue;
                const end = new MultilineEnd(
                    openMultiline.type,
                    undefined,
                    openMultiline.endLine + range.start
                );
                this.tryClosing(end);
            }
            if (typeof openMultiline.endLine === "undefined") {
                if (typeof openMultiline.startLine === "undefined") continue;
                const end = new MultilineEnd(
                    openMultiline.type,
                    openMultiline.startLine + range.start
                );
                this.tryClosing(end);
            }
        }
        console.log(this);
    }

    tryClosing(end: MultilineEnd) {
        // We're looking backwards
        if (typeof end.start === "undefined") {
            if (typeof end.end === "undefined") return;
            for (let i = this.openEnds.length - 1; i >= 0; i--) {
                const otherEnd = this.openEnds[i];
                if (end.type === otherEnd.type &&
                    typeof otherEnd.start !== "undefined" &&
                    otherEnd.start < end.end) {

                    this.close(otherEnd, end, i);
                    return;
                }
            }
        }
        // Looking forwards
        if (typeof end.end === "undefined") {
            if (typeof end.start === "undefined") return;
            for (let i = 0; i < this.openEnds.length; i++) {
                const otherEnd = this.openEnds[i];
                if (end.type === otherEnd.type &&
                    typeof otherEnd.end !== "undefined" &&
                    otherEnd.end >= end.start) {

                    this.close(end, otherEnd, i);
                    return;
                }
            }
        }
        // Didn't find any matches
        this.openEnds.push(end); 
    }

    close(start: MultilineEnd, end: MultilineEnd, index: number) {
        if (typeof start.start === "undefined" ||
            typeof end.end === "undefined") return;
        this.openEnds.splice(index, 1);
        this.activeRanges.add(new MultilineRange(
            start.type,
            new LineRange(start.start, end.end)
        ));
    }
}
