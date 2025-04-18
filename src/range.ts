import { View } from "./view";

export class RangeContext {

    isDocumentStart: boolean;
    isInDialogue: boolean;
    nextLineIsBlank: boolean;
    previousLineIsBlank: boolean;
    nextLine: HTMLElement | undefined;
    previousLine: HTMLElement | undefined;

    constructor(range: LineRange, view: View) {

        this.previousLine = view.getLineAt(range.start - 1);
        this.nextLine = view.getLineAt(range.end + 1);

        // Default values
        this.isDocumentStart = false;
        this.isInDialogue = false;
        this.nextLineIsBlank = true;
        this.previousLineIsBlank = true;

        if (this.previousLine) {
            if (this.previousLine.classList.contains("Character") ||
                this.previousLine.classList.contains("Dialogue") ||
                this.previousLine.classList.contains("Parenthetical")) {

                this.isInDialogue = true;
                this.previousLineIsBlank = false;
            } else {
                this.previousLineIsBlank = this.previousLine.classList.contains("BlankLine");
            }
        } else {
            if (range.start === 0) this.isDocumentStart = true;
        }

        if (this.nextLine) {
            this.nextLineIsBlank = this.nextLine.classList.contains("BlankLine");
        }
    }
}

export class LineRange {

    start: number;
    end: number;

    constructor(start: number, end: number) {
        /* This ensures that the range is well-formed by flipping the start
         * and end parameters if the start is greater than the end.
         */
        if (start <= end) {
            this.start = start;
            this.end = end;
        } else {
            this.start = end;
            this.end = start;
        }
    }

    overlaps(range: LineRange): boolean {
        return (this.start <= range.end &&
            range.start <= this.end)
    }

    includes(range: LineRange): boolean {
        return (this.start <= range.start &&
            this.end >= range.end);
    }

    includesIndex(index: number): boolean {
        return (this.start <= index &&
            this.end >= index);
    }

    extend(range: LineRange): LineRange {
        const start = Math.min(this.start, range.start);
        const end = Math.max(this.end, range.end);
        return new LineRange(start, end);
    }
}
