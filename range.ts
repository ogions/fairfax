import { View } from "./view";

export class RangeContext {

    isInDialogue: boolean;
    nextLineIsBlank: boolean;
    previousLineIsBlank: boolean;
    nextLine: HTMLElement | undefined;
    previousLine: HTMLElement | undefined;

    constructor(range: LineRange, view: View) {

        this.previousLine = view.getLineAt(range.start - 1);
        this.nextLine = view.getLineAt(range.end);

        // Default values
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
        this.start = start;
        this.end = end;
    }
}
