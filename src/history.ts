import { Editor } from "./editor";
import { Position, PositionRange } from "./range";

enum StepType {
    Insertion,
    Deletion,
}

class Step {
    range: PositionRange;
    type: StepType;
    oldText: string;
    newText: string;

    constructor(range: PositionRange, type: StepType, oldText: string, newText: string) {
        this.range = range;
        this.type = type;
        this.oldText = oldText;
        this.newText = newText;
    }

    followedBy(step: Step): boolean {
        return (
            (
                this.type === StepType.Insertion &&
                step.type === StepType.Insertion &&
                this.range.end.matches(step.range.start)
            ) || (
                this.type === StepType.Deletion &&
                step.type === StepType.Deletion &&
                this.range.start.matches(step.range.end)
            )
        );
    }

    join(step: Step) {
        if (this.type === StepType.Insertion) {
            this.range.end = step.range.end;
            this.newText += step.newText;
        } else if (this.type === StepType.Deletion) {
            this.range.start = step.range.start;
            this.oldText = step.oldText + this.oldText;
        }
    }
}

export class EditorHistory {
    static groupThreshold = 500;
    editor: Editor;
    steps: Step[] = [];
    undoneSteps: Step[] = [];
    lastEditTime = 0;
    lastEditType: StepType | undefined;

    constructor(editor: Editor) {
        this.editor = editor;

        editor.container.addEventListener("beforeinput", (e) => {
            this.handleInput(e);
        });
    }

    handleInput(e: InputEvent) {
        const type = e.inputType.includes("insert") ?
            StepType.Insertion :
            StepType.Deletion;

        const selection = document.getSelection();
        if (!selection) return;
        const targetRange = this.getTargetRangeOf(e);
        if (!targetRange) return;

        /*
         * The toString method of the Selection class includes whitespace, which
         * the Range class's method does not. For that reason we assign the
         * range back to a selection here.
         */
        selection.removeAllRanges();
        selection.addRange(targetRange);

        const oldText = selection.toString();

        /*
         * Concise handling for the different potential types of input. A
         * plain insertion will provide its text in the data field, but others
         * are more complicated. If it's not any of these, we treat it as a
         * deletion event and newText is an empty string.
         */
        const newText = e.data ?? (
            e.inputType === "insertParagraph" ? "\n" : (
                e.dataTransfer?.getData("text") ?? ""
            )
        ); 

        /*
         * We store history steps with PositionRanges rather than DOM Ranges,
         * since we can't rely on the nodes referenced by DOM Ranges to still
         * be around if we use the step later.
         */
        const range = this.positionRangeFrom(targetRange, newText);

        const step = new Step(range, type, oldText, newText);

        /*
         * Compare the current time against the last edit. If it's within the
         * grouping threshold, then we combine this step with the last one. If
         * the time difference is greater than the grouping threshold, then we
         * push this step by itself onto the history stack.
         */
        const now = Date.now();
        if (now - this.lastEditTime < EditorHistory.groupThreshold) {
            /*
             * Confirm that there IS a last step, and that it's contiguous with
             * this one, before we combine them.
             */
            const lastStep = this.steps[this.steps.length - 1];
            if (lastStep && lastStep.followedBy(step)) {
                lastStep.join(step);
            } else {
                this.steps.push(step);
                this.editor.container.dispatchEvent(new Event("historyupdate"));
            }
        } else {
            this.steps.push(step);
            this.editor.container.dispatchEvent(new Event("historyupdate"));
        }

        this.lastEditTime = now;
        
        if (this.steps.length > 99) {
            this.steps.shift();
        }

        // Reset the stack of redo steps when our history diverges.
        this.undoneSteps = [];
    } 

    getTargetRangeOf(e: InputEvent): Range | undefined {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount < 1) return;
        let range = selection.getRangeAt(0);

        /*
         * If the range is collapsed (i.e., a cursor), we instead reference the
         * target range of the input event. However, since that's a
         * StaticRange rather than a Range, we need to adapt the original Range
         * object with the target range's data.
         */
        if (range.collapsed) {
            const ranges = e.getTargetRanges();
            if (ranges && ranges.length > 0) {
                range.setStart(ranges[0].startContainer, ranges[0].startOffset);
                range.setEnd(ranges[0].endContainer, ranges[0].endOffset);
            }
        }

        return range;
    }

    positionRangeFrom(targetRange: Range, insertionText: string): PositionRange {

        console.log(targetRange.endOffset);

        const start = new Position(
            this.editor.view,
            targetRange.startContainer,
            targetRange.startOffset
        );

        const end = new Position(
            this.editor.view,
            targetRange.endContainer,
            targetRange.endOffset
        );

        /*
         * If this is an insertion event, the range we collected doesn't
         * include the new text. We update it manually here so it will match
         * the end position of whatever we added.
         */
        if (insertionText) {
            const lines = insertionText.split("\n");
            end.line += lines.length - 1;
            if (lines.length > 1) {
                end.char = lines[lines.length - 1].length;
            } else {
                end.char += insertionText.length;
            }
        }

        return new PositionRange(start, end);
    }

    undo() {
        const step = this.steps.pop();
        if (!step) return;

        if (step.type === StepType.Insertion) {
            this.replaceRange(step.range, step.oldText);
        } else if (step.type === StepType.Deletion) {
            this.insertAt(step.range.start, step.oldText);
        }

        this.undoneSteps.push(step);
        this.editor.container.dispatchEvent(new Event("historyupdate"));
    }
    
    redo() {
        const step = this.undoneSteps.pop();
        if (!step) return;

        if (step.type === StepType.Insertion) {
            this.insertAt(step.range.start, step.newText);
        } else if (step.type === StepType.Deletion) {
            this.replaceRange(step.range, step.newText);
        }

        this.steps.push(step);
        this.editor.container.dispatchEvent(new Event("historyupdate"));
    }

    replaceRange(range: PositionRange, text: string) {
        const startLine = this.editor.view.getLineAt(range.start.line);
        const endLine = this.editor.view.getLineAt(range.end.line);
        if (!startLine || !endLine) return;

        const startContent = this.editor.view.getTextInLine(startLine);
        const endContent = this.editor.view.getTextInLine(endLine);
        const before = startContent.slice(0, range.start.char);
        const after = endContent.slice(range.end.char);

        // Remove all lines starting after the start line through the end line
        for (let i = range.end.line; i > range.start.line; i--) {
            this.editor.view.getLineAt(i)?.remove();
        }

        startLine.innerText = before + text + after;
        this.editor.updateLine(startLine, true);

    }

    insertAt(position: Position, text: string) {
        const line = this.editor.view.getLineAt(position.line);
        if (!line) return;

        const content = this.editor.view.getTextInLine(line);
        const before = content.slice(0, position.char);
        const after = content.slice(position.char);

        line.textContent = before + text + after;
        this.editor.updateLine(line, true);
    }
}
