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
}

export class EditorHistory {
    editor: Editor;
    steps: Step[] = [];
    undoneSteps: Step[] = [];

    constructor(editor: Editor) {
        this.editor = editor;

        editor.container.addEventListener("beforeinput", (e) => {
            this.handleInput(e);
        });

        editor.container.addEventListener("keydown", (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
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
        selection.removeAllRanges();
        selection.addRange(targetRange);

        const oldText = selection.toString();

        const newText = e.data ?? (
            e.inputType === "insertParagraph" ? "\n" : (
                e.dataTransfer?.getData("text") ?? ""
            )
        ); 

        const range = this.positionRangeFrom(targetRange, newText);

        console.log(range, type, oldText, newText);
        this.steps.push(new Step(range, type, oldText, newText));
        if (this.steps.length > 99) {
            this.steps.shift();
        }
        this.undoneSteps = [];
    } 

    getTargetRangeOf(e: InputEvent): Range | undefined {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount < 1) return;
        let range = selection.getRangeAt(0);
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

        if (insertionText) {
            const lines = insertionText.split("\n");
            end.char += lines[lines.length - 1].length;
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
    }
    
    redo() {
        const step = this.undoneSteps.pop();
        if (!step) return;

        if (step.type === StepType.Insertion) {
            this.insertAt(step.range.start, step.newText);
        } else if (step.type === StepType.Deletion) {
            this.replaceRange(step.range, step.oldText);
        }

        this.steps.push(step);
    }

    replaceRange(range: PositionRange, text: string) {
        const startLine = this.editor.view.getLineAt(range.start.line);
        const endLine = this.editor.view.getLineAt(range.end.line);
        if (!startLine || !endLine) return;

        const startContent = this.editor.view.getTextInLine(startLine);
        const endContent = this.editor.view.getTextInLine(endLine);
        const before = startContent.slice(0, range.start.char);
        const after = endContent.slice(range.end.char);

        startLine.innerText = before + text + after;

    }

    insertAt(position: Position, text: string) {
        console.log(text);
        const line = this.editor.view.getLineAt(position.line);
        if (!line) return;
        const content = this.editor.view.getTextInLine(line);
        const before = content.slice(0, position.char);
        const after = content.slice(position.char);
        line.innerText = before + text + after;
        this.editor.updateLine(line);
    }
}
