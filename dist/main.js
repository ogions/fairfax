"use strict";
(() => {
  // ../fairfax/blocks.ts
  var Document = class {
    constructor(titlePage, blocks) {
      this.titlePage = titlePage;
      this.blocks = blocks;
    }
  };
  var Block = class {
    constructor(type, runs) {
      this.type = type;
      this.runs = runs;
    }
  };
  var Run = class {
    constructor(text, styles) {
      this.text = text;
      this.styles = styles;
    }
  };

  // ../fairfax/tokens.ts
  var Token = class {
    constructor(type, content) {
      this.type = type;
      this.content = content;
    }
  };

  // ../fairfax/regexes.ts
  var FountainRegexes = class {
    constructor() {
      this.character = /^[^a-z()]*[A-Z]+[^a-z()]*(\(.*\))?$/;
      this.pageBreak = /^={3,}$/;
      this.parenthetical = /^\s*\(.*\)\s*$/;
      this.sceneHeading = /^(int|ext|est|int\.?\/ext|i\.?\/e)[\. ].+/i;
      this.forcedSceneHeading = /^\.[a-zA-Z0-9]/;
      this.sceneNumber = /#([^#]+)#\s*$/;
      this.sectionHeading = /^(#{1,6})/;
      this.titlePageKey = /^([^\s:][^:]*)(:\s*)(.*)$/;
      this.titlePageIndentedValue = /^( {3}\s*|\t\s*)(.*)/;
      this.transition = /^([^a-z]*TO:|FADE OUT.|CUT TO BLACK.|FADE TO BLACK.)$/;
    }
  };

  // ../fairfax/tokenizer.ts
  var Tokenizer = class {
    constructor() {
      this.regexes = new FountainRegexes();
    }
    tokenizeLine(line, lexer) {
      if (lexer.isInTitlePage) {
        if (this.regexes.titlePageKey.test(line)) {
          const matches = this.regexes.titlePageKey.exec(line);
          const key = matches ? matches[1] : "";
          const space = matches ? matches[2] : "";
          const value = matches ? matches[3] : "";
          const tokens = [
            new Token(
              29 /* TitlePageKey */,
              key
            ),
            new Token(
              34 /* Text */,
              space
            )
          ];
          if (value) {
            tokens.push(new Token(
              30 /* TitlePageValue */,
              value
            ));
          }
          return new Token(
            28 /* TitlePage */,
            tokens
          );
        } else {
          const matches = this.regexes.titlePageIndentedValue.exec(line);
          if (matches) {
            const space = matches[1];
            const value = matches[2];
            const tokens = [
              new Token(
                34 /* Text */,
                space
              ),
              new Token(
                30 /* TitlePageValue */,
                value
              )
            ];
            return new Token(
              28 /* TitlePage */,
              tokens
            );
          }
        }
        return new Token(
          28 /* TitlePage */,
          lexer.lexLine(line)
        );
      }
      if (!line) {
        return new Token(
          0 /* BlankLine */,
          line
        );
      }
      if (line.startsWith("~")) {
        const tokens = [
          new Token(
            13 /* LyricLeader */,
            "~"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new Token(
          12 /* Lyric */,
          tokens
        );
      }
      if (line.startsWith("@")) {
        const tokens = [
          new Token(
            8 /* CharacterForce */,
            "@"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new Token(
          7 /* Character */,
          tokens
        );
      }
      if (line.startsWith(">")) {
        if (line.endsWith("<")) {
          const tokens2 = [
            new Token(
              16 /* CenterLeft */,
              ">"
            ),
            ...lexer.lexLine(line.slice(1, -1)),
            new Token(
              17 /* CenterRight */,
              "<"
            )
          ];
          console.log("centered line");
          return new Token(
            5 /* Action */,
            tokens2
          );
        }
        const tokens = [
          new Token(
            15 /* TransitionForce */,
            ">"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new Token(
          14 /* Transition */,
          tokens
        );
      }
      if (this.regexes.pageBreak.test(line)) {
        return new Token(
          19 /* PageBreak */,
          line
        );
      }
      if (line.startsWith("=")) {
        const tokens = [
          new Token(
            27 /* SynopsisLeader */,
            "="
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new Token(
          26 /* Synopsis */,
          tokens
        );
      }
      if (this.regexes.sectionHeading.test(line)) {
        const result = this.regexes.sectionHeading.exec(line);
        const leader = result ? result[1] : "";
        const tokens = [
          new Token(
            25 /* SectionHeadingLeader */,
            leader
          ),
          ...lexer.lexLine(line.slice(leader.length))
        ];
        return new Token(
          24 /* SectionHeading */,
          tokens
        );
      }
      if (this.regexes.forcedSceneHeading.test(line) || lexer.previousLineIsBlank && lexer.nextLineIsBlank && this.regexes.sceneHeading.test(line)) {
        const result = this.regexes.sceneNumber.exec(line);
        const sceneNumber = result ? result[1] : "";
        const endIndex = sceneNumber ? line.length - sceneNumber.length - 2 : line.length;
        const startIndex = this.regexes.forcedSceneHeading.test(line) ? 1 : 0;
        const sceneNumberTokens = sceneNumber ? [
          new Token(
            4 /* SceneNumberFence */,
            "#"
          ),
          new Token(
            3 /* SceneNumber */,
            sceneNumber
          ),
          new Token(
            4 /* SceneNumberFence */,
            "#"
          )
        ] : [];
        if (startIndex === 1) {
          const tokens = [
            new Token(
              2 /* SceneHeadingForce */,
              "."
            ),
            ...lexer.lexLine(line.slice(startIndex, endIndex)),
            ...sceneNumberTokens
          ];
          return new Token(
            1 /* SceneHeading */,
            tokens
          );
        } else {
          const tokens = [
            ...lexer.lexLine(line.slice(startIndex, endIndex)),
            ...sceneNumberTokens
          ];
          return new Token(
            1 /* SceneHeading */,
            tokens
          );
        }
      }
      if (lexer.previousLineIsBlank && lexer.nextLineIsBlank && this.regexes.transition.test(line)) {
        return new Token(
          14 /* Transition */,
          lexer.lexLine(line)
        );
      }
      if (lexer.previousLineIsBlank && !lexer.nextLineIsBlank && this.regexes.character.test(line)) {
        if (line.endsWith("^")) {
          const tokens = [
            new Token(
              11 /* DualDialogue */,
              "^"
            ),
            ...lexer.lexLine(line.slice(-1))
          ];
          return new Token(
            7 /* Character */,
            tokens
          );
        }
        return new Token(
          7 /* Character */,
          lexer.lexLine(line)
        );
      }
      if (lexer.isInDialogue) {
        if (this.regexes.parenthetical.test(line)) {
          return new Token(
            10 /* Parenthetical */,
            lexer.lexLine(line)
          );
        }
        return new Token(
          9 /* Dialogue */,
          lexer.lexLine(line)
        );
      }
      return new Token(
        5 /* Action */,
        lexer.lexLine(line)
      );
    }
    tokenizeChar(char, lexer) {
      if (lexer.isEscaped) {
        return new Token(
          34 /* Text */,
          char
        );
      }
      if (lexer.nextChar === "*") {
        if (char === "/") {
          return new Token(
            22 /* BoneyardOpen */,
            "/*"
          );
        }
        if (char === "*") {
          return new Token(
            32 /* Bold */,
            "**"
          );
        }
      }
      if (char === "*" && lexer.nextChar === "/") {
        return new Token(
          23 /* BoneyardClose */,
          "*/"
        );
      }
      if (char === "[" && lexer.nextChar === "[") {
        return new Token(
          20 /* NoteOpen */,
          "[["
        );
      }
      if (char === "]" && lexer.nextChar === "]") {
        return new Token(
          21 /* NoteClose */,
          "]]"
        );
      }
      if (char === "*") {
        return new Token(
          31 /* Italic */,
          "*"
        );
      }
      if (char === "_") {
        return new Token(
          33 /* Underline */,
          "_"
        );
      }
      return new Token(
        34 /* Text */,
        char
      );
    }
  };

  // ../fairfax/lexer.ts
  var LexerOptions = class {
    constructor(isInDialogue, isInTitlePage, nextLineIsBlank, previousLineIsBlank) {
      this.isInDialogue = isInDialogue;
      this.isInTitlePage = isInTitlePage;
      this.nextLineIsBlank = nextLineIsBlank;
      this.previousLineIsBlank = previousLineIsBlank;
    }
  };
  var Lexer = class {
    constructor() {
      // Block-level flags
      this.isInDialogue = false;
      this.isInTitlePage = true;
      this.nextLineIsBlank = true;
      this.previousLineIsBlank = true;
      // Inline flags
      this.isEscaped = false;
      this.nextChar = "";
      this.textBuffer = "";
      this.tokenizer = new Tokenizer();
    }
    lex(chunk, options) {
      this.isInDialogue = options.isInDialogue;
      this.isInTitlePage = options.isInTitlePage;
      this.previousLineIsBlank = options.previousLineIsBlank;
      const lines = chunk.split("\n");
      const tokens = [];
      for (let i = 0; i < lines.length; i++) {
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1];
          this.nextLineIsBlank = !nextLine;
        } else {
          this.nextLineIsBlank = options.nextLineIsBlank;
        }
        const token = this.tokenizer.tokenizeLine(lines[i], this);
        if (token.type === 0 /* BlankLine */ || token.type === 19 /* PageBreak */) {
          this.previousLineIsBlank = true;
          this.isInDialogue = false;
          this.isInTitlePage = false;
        } else if (token.type === 7 /* Character */) {
          this.isInDialogue = true;
          this.previousLineIsBlank = false;
        } else {
          this.previousLineIsBlank = false;
        }
        tokens.push(token);
      }
      return tokens;
    }
    lexLine(line) {
      const tokens = [];
      for (let i = 0; i < line.length; i++) {
        if (i < line.length - 1) {
          this.nextChar = line[i + 1];
        } else {
          this.nextChar = "";
        }
        const token = this.tokenizer.tokenizeChar(line[i], this);
        if (token.type === 18 /* Escape */) {
          this.isEscaped = true;
        } else {
          this.isEscaped = false;
        }
        if (token.type === 34 /* Text */) {
          this.textBuffer += token.content;
        } else {
          if (this.textBuffer.length > 0) {
            tokens.push(new Token(
              34 /* Text */,
              this.textBuffer
            ));
            this.textBuffer = "";
          }
          if (token.content.length === 2) i++;
          tokens.push(token);
        }
      }
      if (this.textBuffer.length > 0) {
        tokens.push(new Token(
          34 /* Text */,
          this.textBuffer
        ));
        this.textBuffer = "";
      }
      return tokens;
    }
  };

  // ../fairfax/parser.ts
  var ParserOptions = class {
    constructor(isInDialogue, isInTitlePage, nextLineIsBlank, previousLineIsBlank, includeMarkup) {
      this.isInDialogue = isInDialogue ?? false;
      this.isInTitlePage = isInTitlePage ?? true;
      this.nextLineIsBlank = nextLineIsBlank ?? true;
      this.previousLineIsBlank = previousLineIsBlank ?? true;
      this.includeMarkup = includeMarkup ?? false;
    }
  };
  var Parser = class {
    constructor() {
      this.lexer = new Lexer();
      this.typeMap = /* @__PURE__ */ new Map([
        [0 /* BlankLine */, 0 /* BlankLine */],
        [1 /* SceneHeading */, 1 /* SceneHeading */],
        [5 /* Action */, 2 /* Action */],
        [7 /* Character */, 3 /* Character */],
        [9 /* Dialogue */, 4 /* Dialogue */],
        [10 /* Parenthetical */, 5 /* Parenthetical */],
        [12 /* Lyric */, 6 /* Lyric */],
        [14 /* Transition */, 7 /* Transition */],
        [19 /* PageBreak */, 8 /* PageBreak */],
        [24 /* SectionHeading */, 9 /* SectionHeading */],
        [26 /* Synopsis */, 10 /* Synopsis */],
        [28 /* TitlePage */, 11 /* TitlePage */]
      ]);
      this.styleMap = /* @__PURE__ */ new Map([
        [16 /* CenterLeft */, 0 /* Centered */],
        [17 /* CenterRight */, 0 /* Centered */],
        [32 /* Bold */, 1 /* Bold */],
        [31 /* Italic */, 2 /* Italic */],
        [33 /* Underline */, 3 /* Underline */],
        [22 /* BoneyardOpen */, 4 /* Boneyard */],
        [23 /* BoneyardClose */, 4 /* Boneyard */],
        [20 /* NoteOpen */, 5 /* Note */],
        [21 /* NoteClose */, 5 /* Note */]
      ]);
      this.closerTokens = /* @__PURE__ */ new Set([
        17 /* CenterRight */,
        32 /* Bold */,
        31 /* Italic */,
        33 /* Underline */,
        23 /* BoneyardClose */,
        21 /* NoteClose */
      ]);
      this.openerTokens = /* @__PURE__ */ new Set([
        16 /* CenterLeft */,
        32 /* Bold */,
        31 /* Italic */,
        33 /* Underline */,
        22 /* BoneyardOpen */,
        20 /* NoteOpen */
      ]);
      this.openKey = "";
      this.openValue = [];
      this.openStyles = /* @__PURE__ */ new Set();
      this.openStyleStarts = /* @__PURE__ */ new Map();
      this.openMultilines = /* @__PURE__ */ new Set();
      this.openMultilineStarts = /* @__PURE__ */ new Map();
    }
    parse(chunk, options) {
      const lexerOptions = new LexerOptions(
        options.isInDialogue,
        options.isInTitlePage,
        options.nextLineIsBlank,
        options.previousLineIsBlank
      );
      const tokens = this.lexer.lex(chunk, lexerOptions);
      const blocks = [];
      const titlePage = /* @__PURE__ */ new Map();
      for (let [i, token] of tokens.entries()) {
        const blockType = this.typeMap.get(token.type) ?? 2 /* Action */;
        const runs = typeof token.content === "object" ? this.parseInnerTokens(token.content, titlePage, blocks, i) : [new Run(token.content, /* @__PURE__ */ new Set([]))];
        blocks.push(new Block(blockType, runs));
        if (this.openStyles.has(4 /* Boneyard */)) {
          this.openMultilines.add(4 /* Boneyard */);
          this.openMultilineStarts.set(
            4 /* Boneyard */,
            [i, this.openStyleStarts.get(4 /* Boneyard */)]
          );
        }
        if (this.openStyles.has(5 /* Note */)) {
          this.openMultilines.add(5 /* Note */);
          this.openMultilineStarts.set(
            5 /* Note */,
            [i, this.openStyleStarts.get(5 /* Note */)]
          );
        }
        this.openStyles.clear();
        this.openStyleStarts.clear();
      }
      this.openMultilines.clear();
      this.openMultilineStarts.clear();
      if (this.openKey) {
        titlePage.set(this.openKey, this.openValue.join("\n"));
        this.openKey = "";
        this.openValue = [];
      }
      for (let block of blocks) {
        this.collapseRuns(block);
      }
      return new Document(titlePage, blocks);
    }
    parseInnerTokens(tokens, titlePage, blocks, lineIndex) {
      let runs = [];
      for (let [i, token] of tokens.entries()) {
        const text = typeof token.content === "string" ? token.content : "";
        const styles = this.getStylesFrom(token, blocks, runs, lineIndex, i);
        if (token.type === 29 /* TitlePageKey */ || token.type === 30 /* TitlePageValue */) {
          this.handleTitlePageToken(token, titlePage);
        }
        runs.push(new Run(text, styles));
      }
      return runs;
    }
    collapseRuns(block) {
      let collapsedRuns = [];
      let currentRun = new Run("", /* @__PURE__ */ new Set());
      for (let run of block.runs) {
        if (currentRun.text && !this.stylesMatch(currentRun, run)) {
          collapsedRuns.push(currentRun);
          currentRun = run;
        } else {
          currentRun.text += run.text;
          currentRun.styles = run.styles;
        }
      }
      collapsedRuns.push(currentRun);
      block.runs = collapsedRuns;
    }
    getStylesFrom(token, blocks, runs, lineIndex, tokenIndex) {
      if (token.type === 2 /* SceneHeadingForce */ || token.type === 4 /* SceneNumberFence */ || token.type === 6 /* ActionForce */ || token.type === 8 /* CharacterForce */ || token.type === 13 /* LyricLeader */ || token.type === 15 /* TransitionForce */ || token.type === 25 /* SectionHeadingLeader */ || token.type === 27 /* SynopsisLeader */) {
        return /* @__PURE__ */ new Set([6 /* Special */]);
      }
      if (token.type === 34 /* Text */) {
        return /* @__PURE__ */ new Set();
      }
      return this.handleStyle(token, blocks, runs, lineIndex, tokenIndex);
    }
    handleStyle(token, blocks, runs, lineIndex, tokenIndex) {
      if (this.closerTokens.has(token.type)) {
        const style = this.styleMap.get(token.type);
        if (typeof style !== "undefined") {
          if (this.openMultilines.has(style)) {
            this.closeMultiline(style, blocks, runs, lineIndex, tokenIndex);
            return /* @__PURE__ */ new Set([6 /* Special */]);
          } else if (this.openStyles.has(style)) {
            this.closeStyle(style, runs, tokenIndex);
            return /* @__PURE__ */ new Set([6 /* Special */]);
          }
        }
      }
      if (this.openerTokens.has(token.type)) {
        const style = this.styleMap.get(token.type);
        if (typeof style !== "undefined") {
          this.openStyle(style, tokenIndex);
        }
      }
      return /* @__PURE__ */ new Set();
    }
    openStyle(style, tokenIndex) {
      this.openStyles.add(style);
      if (!this.openStyleStarts.has(style)) {
        this.openStyleStarts.set(style, tokenIndex + 1);
      }
    }
    closeStyle(style, runs, tokenIndex) {
      const startIndex = this.openStyleStarts.get(style);
      runs[startIndex - 1].styles.add(6 /* Special */);
      for (let i = startIndex; i < tokenIndex; i++) {
        runs[i].styles.add(style);
      }
      this.openStyles.delete(style);
    }
    closeMultiline(style, blocks, runs, lineIndex, tokenIndex) {
      const [lineStart, charStart] = this.openMultilineStarts.get(style);
      for (let i = lineStart + 1; i < lineIndex; i++) {
        for (let run of blocks[i].runs) {
          run.styles.add(style);
        }
      }
      const startLine = blocks[lineStart];
      startLine.runs[charStart - 1].styles.add(6 /* Special */);
      for (let i = charStart; i < startLine.runs.length; i++) {
        startLine.runs[i].styles.add(style);
      }
      for (let i = 0; i < tokenIndex; i++) {
        runs[i].styles.add(style);
      }
      this.openMultilines.delete(style);
    }
    stylesMatch(a, b) {
      for (let style of a.styles) {
        if (!b.styles.has(style)) return false;
      }
      for (let style of b.styles) {
        if (!a.styles.has(style)) return false;
      }
      return true;
    }
    handleTitlePageToken(token, titlePage) {
      if (token.type === 29 /* TitlePageKey */) {
        if (this.openKey && this.openValue) {
          titlePage.set(this.openKey, this.openValue.join("\n"));
        }
        this.openKey = typeof token.content === "string" ? token.content : "";
        this.openValue = [];
      } else if (token.type === 30 /* TitlePageValue */) {
        const value = typeof token.content === "string" ? token.content : "";
        this.openValue.push(value);
      }
    }
  };

  // src/range.ts
  var RangeContext = class {
    constructor(range, view) {
      this.previousLine = view.getLineAt(range.start - 1);
      this.nextLine = view.getLineAt(range.end);
      this.isInDialogue = false;
      this.nextLineIsBlank = true;
      this.previousLineIsBlank = true;
      if (this.previousLine) {
        if (this.previousLine.classList.contains("Character") || this.previousLine.classList.contains("Dialogue") || this.previousLine.classList.contains("Parenthetical")) {
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
  };
  var LineRange = class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  };

  // src/selection.ts
  var ViewSelection = class {
    constructor(view) {
      this.view = view;
      this.offset = 0;
    }
    save() {
      const selection = document.getSelection();
      if (!selection) return;
      let anchor = selection.anchorNode;
      if (!anchor) return;
      const activeLine = this.view.getLineElementFrom(anchor);
      if (!activeLine) return;
      if (anchor.parentElement && anchor.parentElement.tagName === "SPAN") {
        anchor = anchor.parentElement;
      }
      let offset = 0;
      for (let childNode of activeLine.childNodes) {
        if (childNode === anchor) {
          this.offset = offset + selection.anchorOffset;
          return;
        } else {
          const nodeText = childNode.textContent;
          if (nodeText) offset += nodeText.length;
        }
      }
    }
    render() {
      const activeLine = this.view.getActiveLine() || this.view.container;
      const selection = document.getSelection();
      if (!selection) return;
      if (this.offset === 0) {
        selection.setPosition(activeLine);
        return;
      }
      for (let childNode of activeLine.childNodes) {
        const nodeText = childNode.textContent;
        if (!nodeText) continue;
        if (this.offset <= nodeText.length) {
          if (childNode.nodeType != Node.TEXT_NODE) {
            childNode = childNode.childNodes[0];
          }
          selection.setPosition(childNode, this.offset);
          return;
        } else {
          this.offset -= nodeText.length;
        }
      }
      selection.setPosition(activeLine.lastChild);
    }
  };

  // src/view.ts
  var View = class {
    constructor(container2) {
      this.blockMap = /* @__PURE__ */ new Map([
        [0 /* BlankLine */, "BlankLine"],
        [2 /* Action */, "Action"],
        [1 /* SceneHeading */, "SceneHeading"],
        [3 /* Character */, "Character"],
        [4 /* Dialogue */, "Dialogue"],
        [5 /* Parenthetical */, "Parenthetical"],
        [6 /* Lyric */, "Lyric"],
        [7 /* Transition */, "Transition"],
        [8 /* PageBreak */, "PageBreak"],
        [9 /* SectionHeading */, "SectionHeading"],
        [10 /* Synopsis */, "Synopsis"],
        [11 /* TitlePage */, "TitlePage"]
      ]);
      this.styleMap = /* @__PURE__ */ new Map([
        [0 /* Centered */, "Centered"],
        [1 /* Bold */, "Bold"],
        [2 /* Italic */, "Italic"],
        [3 /* Underline */, "Underline"],
        [4 /* Boneyard */, "Boneyard"],
        [5 /* Note */, "Note"],
        [6 /* Special */, "Special"],
        [7 /* TitlePage */, "TitlePage"]
      ]);
      this.container = container2;
      this.selection = new ViewSelection(this);
      this.resetContainer();
    }
    resetContainer() {
      this.container.innerHTML = "<div><br></div>";
      const selection = document.getSelection();
      if (selection) selection.setPosition(this.container.children[0]);
    }
    getLineElementFrom(node) {
      if (node.nodeName === "DIV" && node.parentNode && node.parentNode === this.container) {
        return node;
      }
      const parent = node.parentNode;
      if (!parent) return;
      return this.getLineElementFrom(parent);
    }
    getActiveLine() {
      const selection = document.getSelection();
      if (!selection) return;
      const anchor = selection.anchorNode;
      if (!anchor) return;
      return this.getLineElementFrom(anchor);
    }
    getLineIndex(line) {
      for (let i = 0; i < this.container.children.length; i++) {
        if (this.container.children[i] === line) return i;
      }
      return;
    }
    getLineAt(i) {
      if (i >= 0 && i < this.container.children.length) {
        return this.container.children[i];
      }
      return void 0;
    }
    insertLineAt(i) {
      if (i < 0) i = 0;
      const targetLine = this.getLineAt(i);
      const newLine = document.createElement("div");
      if (targetLine) {
        targetLine.before(newLine);
      } else {
        this.container.appendChild(newLine);
      }
    }
    getTextInRange(range) {
      const rangeText = [];
      for (let i = range.start; i < range.end; i++) {
        const line = this.getLineAt(i);
        if (line) rangeText.push(this.getTextInLine(line));
      }
      return rangeText.join("\n");
    }
    getTextInLine(line) {
      let lineText = "";
      for (let childNode of line.childNodes) {
        if (childNode.nodeName === "DIV") {
          lineText += "\n";
          lineText += this.getTextInLine(childNode);
        } else {
          lineText += childNode.textContent;
        }
      }
      return lineText;
    }
    updateRange(range, blocks, shouldRewrite) {
      this.selection.save();
      for (let [i, block] of blocks.entries()) {
        let lineIndex = i + range.start;
        if (lineIndex >= this.container.children.length) {
          lineIndex = this.container.children.length;
          this.insertLineAt(lineIndex);
        }
        if (lineIndex >= range.end) {
          this.insertLineAt(lineIndex);
        }
        let line = this.getLineAt(lineIndex);
        if (!line) return;
        if (shouldRewrite) this.writeLine(line, block);
        this.classLine(line, block.type);
      }
      if (shouldRewrite) this.selection.render();
    }
    writeLine(line, block) {
      const fragment = new DocumentFragment();
      for (let run of block.runs) {
        if (run.styles.size === 0) {
          fragment.append(new Text(run.text));
        } else {
          const span = document.createElement("span");
          span.textContent = run.text;
          for (let style of run.styles) {
            const runClass = this.styleMap.get(style) ?? "";
            span.classList.add(runClass);
          }
          fragment.append(span);
        }
      }
      line.innerHTML = "";
      line.appendChild(fragment);
      if (line.innerHTML === "") line.appendChild(document.createElement("br"));
    }
    classLine(line, type) {
      const lineClass = this.blockMap.get(type) ?? "Action";
      line.className = lineClass;
    }
  };

  // src/editor.ts
  var Editor = class {
    constructor(container2) {
      this.parser = new Parser();
      this.openMultilines = /* @__PURE__ */ new Map();
      this.container = container2;
      this.container.setAttribute("contenteditable", "true");
      this.container.addEventListener("input", (e) => this.handleInput(e));
      this.view = new View(container2);
    }
    handleInput(e) {
      let activeLine = this.view.getActiveLine();
      if (!activeLine && this.container.querySelectorAll("div").length === 0) {
        this.view.resetContainer();
      }
      if (!activeLine) return;
      this.updateLine(activeLine, true);
    }
    updateLine(line, isOrigin) {
      const lineIndex = this.view.getLineIndex(line);
      if (typeof lineIndex !== "undefined") {
        this.updateRange(new LineRange(lineIndex, lineIndex + 1), isOrigin);
      }
    }
    updateRange(range, isOrigin) {
      const text = this.view.getTextInRange(range);
      if (this.openMultilines.has("Boneyard") && text.includes("*/")) {
        const start = this.openMultilines.get("Boneyard");
        if (start < range.start) {
          this.updateRange(new LineRange(start, range.end), true);
          this.openMultilines.delete("Boneyard");
          return;
        }
      }
      if (this.openMultilines.has("Note") && text.includes("]]")) {
        const start = this.openMultilines.get("Note");
        if (start < range.start) {
          this.updateRange(new LineRange(start, range.end), true);
          this.openMultilines.delete("Note");
          return;
        }
      }
      const context = new RangeContext(range, this.view);
      const parserOptions = new ParserOptions(
        context.isInDialogue,
        void 0,
        context.nextLineIsBlank,
        context.previousLineIsBlank
      );
      const [firstLineStartingClass, lastLineStartingClass] = this.getBorderClasses(range);
      const fairfaxDocument = this.parser.parse(text, parserOptions);
      console.log(fairfaxDocument.titlePage);
      const shouldRewrite = isOrigin || false;
      this.view.updateRange(range, fairfaxDocument.blocks, shouldRewrite);
      const [firstLineEndingClass, lastLineEndingClass] = this.getBorderClasses(range);
      if (firstLineStartingClass != firstLineEndingClass || lastLineStartingClass != lastLineEndingClass) {
        this.updateNeighbors(context);
      }
      if (text.includes("/*") && !text.includes("*/")) {
        this.openMultilines.set("Boneyard", range.start);
      }
      if (text.includes("[[") && !text.includes("]]")) {
        this.openMultilines.set("Note", range.start);
      }
    }
    updateNeighbors(context) {
      if (context.nextLine) this.updateLine(context.nextLine);
      if (context.previousLine) this.updateLine(context.previousLine);
    }
    getBorderClasses(range) {
      const firstLine = this.view.getLineAt(range.start);
      const lastLine = this.view.getLineAt(range.end - 1);
      const firstLineClass = firstLine ? firstLine.className : void 0;
      const lastLineClass = lastLine ? lastLine.className : void 0;
      return [firstLineClass, lastLineClass];
    }
  };

  // src/monica.ts
  var container = document.getElementById("monica");
  if (container) new Editor(container);
})();
