"use strict";
(() => {
  // ../fairfax/src/blocks.ts
  var Document = class {
    constructor(titlePage, blocks, activeMultilines, openMultilines) {
      this.titlePage = titlePage;
      this.blocks = blocks;
      this.activeMultilines = activeMultilines;
      this.openMultilines = openMultilines;
    }
  };
  var Block = class {
    constructor(type, runs, centered, isDual) {
      this.type = type;
      this.runs = runs;
      if (centered) this.centered = centered;
      if (isDual) this.isDual = isDual;
    }
  };
  var Run = class {
    constructor(text, styles) {
      this.text = text;
      this.styles = styles;
    }
  };

  // ../fairfax/src/tokens.ts
  var BlockToken = class {
    constructor(type, content, centered) {
      this.type = type;
      this.content = content;
      if (centered) this.centered = centered;
    }
  };
  var RunToken = class {
    constructor(type, content) {
      this.type = type;
      this.content = content;
    }
    isMultilineStyle() {
      return this.type === 13 /* BoneyardOpen */ || this.type === 14 /* BoneyardClose */ || this.type === 11 /* NoteOpen */ || this.type === 12 /* NoteClose */;
    }
  };
  var StyleToken = class extends RunToken {
    constructor(type, content, active) {
      super(type, content);
      this.active = active || false;
    }
    isOpener() {
      return this.type === 13 /* BoneyardOpen */ || this.type === 11 /* NoteOpen */;
    }
    isCloser() {
      return this.type === 14 /* BoneyardClose */ || this.type === 12 /* NoteClose */;
    }
  };

  // ../fairfax/src/regexes.ts
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

  // ../fairfax/src/tokenizer.ts
  var Tokenizer = class _Tokenizer {
    static {
      this.regexes = new FountainRegexes();
    }
    tokenizeLine(line, lexer) {
      if (!line) {
        return new BlockToken(
          0 /* BlankLine */,
          []
        );
      }
      if (line.startsWith("~")) {
        const tokens = [
          new RunToken(
            6 /* LyricLeader */,
            "~"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new BlockToken(
          6 /* Lyric */,
          tokens
        );
      }
      if (line.startsWith("@")) {
        const tokens = [
          new RunToken(
            4 /* CharacterForce */,
            "@"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new BlockToken(
          3 /* Character */,
          tokens
        );
      }
      if (line.startsWith(">")) {
        if (line.endsWith("<")) {
          const tokens2 = [
            new RunToken(
              8 /* CenterLeft */,
              ">"
            ),
            ...lexer.lexLine(line.slice(1, -1)),
            new RunToken(
              9 /* CenterRight */,
              "<"
            )
          ];
          return new BlockToken(
            2 /* Action */,
            tokens2,
            true
          );
        }
        const tokens = [
          new RunToken(
            7 /* TransitionForce */,
            ">"
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new BlockToken(
          7 /* Transition */,
          tokens
        );
      }
      if (_Tokenizer.regexes.pageBreak.test(line)) {
        return new BlockToken(
          8 /* PageBreak */,
          [new RunToken(
            22 /* Text */,
            line
          )]
        );
      }
      if (line.startsWith("=")) {
        const tokens = [
          new RunToken(
            16 /* SynopsisLeader */,
            "="
          ),
          ...lexer.lexLine(line.slice(1))
        ];
        return new BlockToken(
          10 /* Synopsis */,
          tokens
        );
      }
      if (_Tokenizer.regexes.sectionHeading.test(line)) {
        const result = _Tokenizer.regexes.sectionHeading.exec(line);
        const leader = result ? result[1] : "";
        const tokens = [
          new RunToken(
            15 /* SectionHeadingLeader */,
            leader
          ),
          ...lexer.lexLine(line.slice(leader.length))
        ];
        return new BlockToken(
          9 /* SectionHeading */,
          tokens
        );
      }
      if (_Tokenizer.regexes.forcedSceneHeading.test(line) || lexer.previousLineIsBlank && lexer.nextLineIsBlank && _Tokenizer.regexes.sceneHeading.test(line)) {
        const result = _Tokenizer.regexes.sceneNumber.exec(line);
        const sceneNumber = result ? result[1] : "";
        const endIndex = sceneNumber ? line.length - sceneNumber.length - 2 : line.length;
        const startIndex = line.startsWith(".") ? 1 : 0;
        const sceneNumberTokens = sceneNumber ? [
          new RunToken(
            2 /* SceneNumberFence */,
            "#"
          ),
          new RunToken(
            1 /* SceneNumber */,
            sceneNumber
          ),
          new RunToken(
            2 /* SceneNumberFence */,
            "#"
          )
        ] : [];
        if (startIndex === 1) {
          const tokens = [
            new RunToken(
              0 /* SceneHeadingForce */,
              "."
            ),
            ...lexer.lexLine(line.slice(startIndex, endIndex)),
            ...sceneNumberTokens
          ];
          return new BlockToken(
            1 /* SceneHeading */,
            tokens
          );
        } else {
          const tokens = [
            ...lexer.lexLine(line.slice(startIndex, endIndex)),
            ...sceneNumberTokens
          ];
          return new BlockToken(
            1 /* SceneHeading */,
            tokens
          );
        }
      }
      if (lexer.previousLineIsBlank && lexer.nextLineIsBlank && _Tokenizer.regexes.transition.test(line)) {
        return new BlockToken(
          7 /* Transition */,
          lexer.lexLine(line)
        );
      }
      if (lexer.previousLineIsBlank && !lexer.nextLineIsBlank && _Tokenizer.regexes.character.test(line)) {
        if (line.endsWith("^")) {
          const tokens = [
            ...lexer.lexLine(line.slice(0, -1)),
            new RunToken(
              5 /* DualDialogue */,
              "^"
            )
          ];
          return new BlockToken(
            3 /* Character */,
            tokens
          );
        }
        return new BlockToken(
          3 /* Character */,
          lexer.lexLine(line)
        );
      }
      if (lexer.isInDialogue) {
        if (_Tokenizer.regexes.parenthetical.test(line)) {
          return new BlockToken(
            5 /* Parenthetical */,
            lexer.lexLine(line)
          );
        }
        return new BlockToken(
          4 /* Dialogue */,
          lexer.lexLine(line)
        );
      }
      return new BlockToken(
        2 /* Action */,
        lexer.lexLine(line)
      );
    }
    tokenizeTitlePage(line, lexer) {
      if (_Tokenizer.regexes.titlePageKey.test(line)) {
        const matches = _Tokenizer.regexes.titlePageKey.exec(line);
        const key = matches ? matches[1] : "";
        const space = matches ? matches[2] : "";
        const value = matches ? matches[3] : "";
        const tokens = [
          new RunToken(
            17 /* TitlePageKey */,
            key
          ),
          new RunToken(
            22 /* Text */,
            space
          )
        ];
        if (value) {
          tokens.push(new RunToken(
            18 /* TitlePageValue */,
            lexer.lexLine(value)
          ));
        }
        return new BlockToken(
          11 /* TitlePage */,
          tokens
        );
      } else {
        const matches = _Tokenizer.regexes.titlePageIndentedValue.exec(line);
        if (matches) {
          const space = matches[1];
          const value = matches[2];
          const tokens = [
            new RunToken(
              22 /* Text */,
              space
            ),
            new RunToken(
              18 /* TitlePageValue */,
              lexer.lexLine(value)
            )
          ];
          return new BlockToken(
            11 /* TitlePage */,
            tokens
          );
        }
      }
      return new BlockToken(
        11 /* TitlePage */,
        lexer.lexLine(line)
      );
    }
    tokenizeChar(char, lexer) {
      if (lexer.isEscaped) {
        return new RunToken(
          22 /* Text */,
          char
        );
      }
      if (lexer.nextChar === "*") {
        if (char === "/") {
          return new StyleToken(
            13 /* BoneyardOpen */,
            "/*"
          );
        }
        if (char === "*") {
          return new StyleToken(
            20 /* Bold */,
            "**"
          );
        }
      }
      if (char === "*" && lexer.nextChar === "/") {
        return new StyleToken(
          14 /* BoneyardClose */,
          "*/"
        );
      }
      if (char === "[" && lexer.nextChar === "[") {
        return new StyleToken(
          11 /* NoteOpen */,
          "[["
        );
      }
      if (char === "]" && lexer.nextChar === "]") {
        return new StyleToken(
          12 /* NoteClose */,
          "]]"
        );
      }
      if (char === "*") {
        return new StyleToken(
          19 /* Italic */,
          "*"
        );
      }
      if (char === "_") {
        return new StyleToken(
          21 /* Underline */,
          "_"
        );
      }
      return new RunToken(
        22 /* Text */,
        char
      );
    }
  };

  // ../fairfax/src/lexer.ts
  var LexerOptions = class {
    constructor(isDocumentStart, isInDialogue, nextLineIsBlank, previousLineIsBlank) {
      this.isDocumentStart = isDocumentStart;
      this.isInDialogue = isInDialogue;
      this.nextLineIsBlank = nextLineIsBlank;
      this.previousLineIsBlank = previousLineIsBlank;
    }
  };
  var Lexer = class {
    constructor() {
      // Block-level flags
      this.isDocumentStart = false;
      this.isInDialogue = false;
      this.nextLineIsBlank = true;
      this.previousLineIsBlank = true;
      // Inline flags
      this.isEscaped = false;
      this.nextChar = "";
      this.openBoneyards = [];
      this.openNotes = [];
      this.openInlines = [];
      this.textBuffer = "";
      this.tokenizer = new Tokenizer();
    }
    lex(chunk, options) {
      this.isDocumentStart = options.isDocumentStart;
      this.isInDialogue = options.isInDialogue;
      this.previousLineIsBlank = options.previousLineIsBlank;
      const lines = chunk.split("\n");
      const tokens = [];
      this.openBoneyards = [];
      this.openNotes = [];
      this.openInlines = [];
      if (this.isDocumentStart && Tokenizer.regexes.titlePageKey.test(lines[0])) {
        this.isDocumentStart = false;
        for (let i = 0; i < lines.length; i++) {
          const token = this.tokenizer.tokenizeTitlePage(lines[i], this);
          if (token.type === 0 /* BlankLine */ || token.type === 8 /* PageBreak */) {
            this.previousLineIsBlank = true;
            this.isInDialogue = false;
            break;
          }
          tokens.push(token);
        }
      }
      for (let i = tokens.length; i < lines.length; i++) {
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1];
          this.nextLineIsBlank = !nextLine;
        } else {
          this.nextLineIsBlank = options.nextLineIsBlank;
        }
        const token = this.tokenizer.tokenizeLine(lines[i], this);
        if (token.type === 0 /* BlankLine */ || token.type === 8 /* PageBreak */) {
          this.previousLineIsBlank = true;
          this.isInDialogue = false;
        } else if (token.type === 3 /* Character */) {
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
        this.isEscaped = token.type === 10 /* Escape */;
        if (token.type === 22 /* Text */) {
          this.textBuffer += token.content;
        } else {
          if (this.textBuffer.length > 0) {
            tokens.push(new RunToken(
              22 /* Text */,
              this.textBuffer
            ));
            this.textBuffer = "";
          }
          if (token.content.length === 2) i++;
          tokens.push(token);
        }
      }
      if (this.textBuffer.length > 0) {
        tokens.push(new RunToken(
          22 /* Text */,
          this.textBuffer
        ));
        this.textBuffer = "";
      }
      return tokens;
    }
  };

  // ../fairfax/src/multiline.ts
  var MultilineStructure = class {
    constructor(type, start, end) {
      this.type = type;
      this.start = start;
      this.end = end;
    }
  };
  var OpenMultilineStructure = class {
    constructor(type, index, forward) {
      this.type = type;
      this.index = index;
      this.forward = forward;
    }
    closeAt(index) {
      const start = this.forward ? this.index : index;
      const end = this.forward ? index : this.index;
      return new MultilineStructure(
        this.type,
        start,
        end
      );
    }
  };
  var MultilineManager = class _MultilineManager {
    constructor() {
      this.openMultilines = [];
      this.activeMultilines = /* @__PURE__ */ new Set();
      this.hasOpenTitlePage = false;
    }
    static {
      this.multilineTypes = /* @__PURE__ */ new Map([
        [13 /* BoneyardOpen */, 0 /* Boneyard */],
        [14 /* BoneyardClose */, 0 /* Boneyard */],
        [11 /* NoteOpen */, 1 /* Note */],
        [12 /* NoteClose */, 1 /* Note */]
      ]);
    }
    reset() {
      this.openMultilines = [];
      this.activeMultilines = /* @__PURE__ */ new Set();
    }
    manage(token, index) {
      const type = _MultilineManager.multilineTypes.get(token.type);
      if (type === void 0) return;
      if (token.active) {
        if (token.isOpener()) {
          this.openMultilines.push(new OpenMultilineStructure(
            type,
            index,
            true
          ));
        }
        if (token.isCloser()) {
          for (let i = this.openMultilines.length - 1; i >= 0; i--) {
            const openMultiline = this.openMultilines[i];
            if (type === openMultiline.type) {
              const closedStructure = openMultiline.closeAt(index);
              this.openMultilines.splice(i, 1);
              this.activeMultilines.add(closedStructure);
              break;
            }
          }
        }
      } else {
        this.openMultilines.push(new OpenMultilineStructure(
          type,
          index,
          token.isOpener()
        ));
      }
    }
    openTitlePage() {
      this.hasOpenTitlePage = true;
    }
    closeTitlePage(index) {
      this.hasOpenTitlePage = false;
      this.activeMultilines.add(new MultilineStructure(
        2 /* TitlePage */,
        0,
        index
      ));
    }
  };

  // ../fairfax/src/stylizer.ts
  var Stylizer = class _Stylizer {
    constructor() {
      this.activeStyles = /* @__PURE__ */ new Set();
    }
    static {
      this.styleMap = /* @__PURE__ */ new Map([
        [20 /* Bold */, 0 /* Bold */],
        [19 /* Italic */, 1 /* Italic */],
        [21 /* Underline */, 2 /* Underline */],
        [13 /* BoneyardOpen */, 3 /* Boneyard */],
        [14 /* BoneyardClose */, 3 /* Boneyard */],
        [11 /* NoteOpen */, 4 /* Note */],
        [12 /* NoteClose */, 4 /* Note */]
      ]);
    }
    stylize(token) {
      if (token instanceof StyleToken) {
        const styles = new Set(this.activeStyles).add(5 /* Special */);
        this.process(token);
        if (token.active) {
          return styles;
        }
      }
      if (token.type === 0 /* SceneHeadingForce */ || token.type === 2 /* SceneNumberFence */ || token.type === 3 /* ActionForce */ || token.type === 4 /* CharacterForce */ || token.type === 5 /* DualDialogue */ || token.type === 6 /* LyricLeader */ || token.type === 7 /* TransitionForce */ || token.type === 15 /* SectionHeadingLeader */ || token.type === 16 /* SynopsisLeader */) {
        return /* @__PURE__ */ new Set([5 /* Special */]);
      }
      if (token.type === 17 /* TitlePageKey */) {
        return /* @__PURE__ */ new Set([6 /* TitlePageKey */]);
      }
      return this.activeStyles;
    }
    process(token) {
      if (token.active) {
        const style = _Stylizer.styleMap.get(token.type);
        if (style === void 0) return;
        if (this.activeStyles.has(style)) {
          this.activeStyles.delete(style);
        } else {
          this.activeStyles.add(style);
        }
      }
    }
    isMultiline(token) {
      return token.type === 13 /* BoneyardOpen */ || token.type === 14 /* BoneyardClose */ || token.type === 11 /* NoteOpen */ || token.type === 12 /* NoteClose */;
    }
  };

  // ../fairfax/src/parser.ts
  var ParserOptions = class {
    constructor(isDocumentStart, isInDialogue, isInDualDialogue, nextLineIsBlank, previousLineIsBlank) {
      this.isDocumentStart = isDocumentStart ?? false;
      this.isInDialogue = isInDialogue ?? false;
      this.isInDualDialogue = isInDualDialogue ?? false;
      this.nextLineIsBlank = nextLineIsBlank ?? true;
      this.previousLineIsBlank = previousLineIsBlank ?? true;
    }
  };
  var Parser = class _Parser {
    constructor() {
      this.lexer = new Lexer();
      this.mlManager = new MultilineManager();
      this.stylizer = new Stylizer();
      this.activeStyles = /* @__PURE__ */ new Set();
      this.isInBoneyard = false;
      this.isInDualDialogue = false;
      this.isInNote = false;
      this.openTitlePageKey = "";
      this.openTitlePageValue = [];
    }
    static {
      this.typeMap = /* @__PURE__ */ new Map([
        [0 /* BlankLine */, 0 /* BlankLine */],
        [1 /* SceneHeading */, 1 /* SceneHeading */],
        [2 /* Action */, 2 /* Action */],
        [3 /* Character */, 3 /* Character */],
        [4 /* Dialogue */, 4 /* Dialogue */],
        [5 /* Parenthetical */, 5 /* Parenthetical */],
        [6 /* Lyric */, 6 /* Lyric */],
        [7 /* Transition */, 7 /* Transition */],
        [8 /* PageBreak */, 8 /* PageBreak */],
        [9 /* SectionHeading */, 9 /* SectionHeading */],
        [10 /* Synopsis */, 10 /* Synopsis */],
        [11 /* TitlePage */, 11 /* TitlePage */]
      ]);
    }
    parse(chunk, options) {
      const lexerOptions = new LexerOptions(
        options.isDocumentStart,
        options.isInDialogue,
        options.nextLineIsBlank,
        options.previousLineIsBlank
      );
      const tokens = this.lexer.lex(chunk, lexerOptions);
      const titlePage = /* @__PURE__ */ new Map();
      const blocks = [];
      this.mlManager.reset();
      this.isInDualDialogue = options.isInDualDialogue;
      if (options.isDocumentStart) {
        for (let [i, token] of tokens.entries()) {
          if (token.type === 11 /* TitlePage */) {
            this.parseTitlePageBlock(token.content, titlePage);
            this.mlManager.openTitlePage();
          } else {
            if (this.mlManager.hasOpenTitlePage) {
              this.mlManager.closeTitlePage(i);
            }
            break;
          }
        }
        if (this.openTitlePageKey) {
          titlePage.set(this.openTitlePageKey, this.openTitlePageValue.join("\n"));
          this.openTitlePageKey = "";
          this.openTitlePageValue = [];
        }
        if (this.mlManager.hasOpenTitlePage) {
          this.mlManager.closeTitlePage(tokens.length - 1);
        }
      }
      this.parseBoneyards(tokens);
      this.parseNotes(tokens);
      for (let [i, token] of tokens.entries()) {
        this.parseInlines(token.content);
        const blockType = this.isInNote ? 2 /* Action */ : _Parser.typeMap.get(token.type) ?? 2 /* Action */;
        if (blockType === 0 /* BlankLine */) this.isInDualDialogue = false;
        const runs = this.parseBlock(token.content, i);
        blocks.push(new Block(
          blockType,
          runs,
          token.centered,
          this.isInDualDialogue
        ));
      }
      return new Document(
        titlePage,
        blocks,
        this.mlManager.activeMultilines,
        this.mlManager.openMultilines
      );
    }
    parseBlock(tokens, lineIndex) {
      const runs = [];
      for (let token of tokens) {
        if (token.type === 5 /* DualDialogue */) {
          this.isInDualDialogue = true;
        }
        if (token.type === 18 /* TitlePageValue */ && Array.isArray(token.content)) {
          return [...runs, ...this.parseBlock(token.content, lineIndex)];
        }
        if (token.isMultilineStyle()) this.mlManager.manage(token, lineIndex);
        const text = typeof token.content === "string" ? token.content : "";
        const styles = this.stylizer.stylize(token);
        runs.push(new Run(text, new Set(styles)));
      }
      return runs;
    }
    parseTitlePageBlock(tokens, titlePage) {
      for (let token of tokens) {
        const text = typeof token.content === "string" ? token.content : "";
        if (token.type === 17 /* TitlePageKey */) {
          if (this.openTitlePageKey && this.openTitlePageValue) {
            titlePage.set(this.openTitlePageKey, this.openTitlePageValue.join("\n"));
          }
          this.openTitlePageKey = text;
          this.openTitlePageValue = [];
        } else if (token.type === 18 /* TitlePageValue */) {
          const value = text;
          this.openTitlePageValue.push(value);
        }
      }
    }
    parseBoneyards(tokens) {
      let openBoneyard;
      for (let blockToken of tokens) {
        for (let runToken of blockToken.content) {
          if (Array.isArray(runToken)) continue;
          if (!(runToken instanceof StyleToken)) continue;
          if (runToken.type === 13 /* BoneyardOpen */) {
            openBoneyard = runToken;
          } else if (runToken.type === 14 /* BoneyardClose */) {
            if (openBoneyard) {
              openBoneyard.active = true;
              runToken.active = true;
              openBoneyard = void 0;
            }
          }
        }
      }
    }
    parseNotes(tokens) {
      let openNote;
      let isInBoneyard = false;
      for (let blockToken of tokens) {
        for (let runToken of blockToken.content) {
          if (Array.isArray(runToken)) continue;
          if (!(runToken instanceof StyleToken)) continue;
          if (runToken.active) {
            if (runToken.type === 13 /* BoneyardOpen */) isInBoneyard = true;
            if (runToken.type === 14 /* BoneyardClose */) isInBoneyard = false;
          }
          if (isInBoneyard) continue;
          if (runToken.type === 11 /* NoteOpen */) {
            openNote = runToken;
          } else if (runToken.type === 12 /* NoteClose */) {
            if (openNote) {
              openNote.active = true;
              runToken.active = true;
              openNote = void 0;
            }
          }
        }
      }
    }
    parseInlines(tokens) {
      const openInlines = [];
      for (let token of tokens) {
        if (!(token instanceof StyleToken)) continue;
        if (token.active) {
          if (token.type === 13 /* BoneyardOpen */) this.isInBoneyard = true;
          if (token.type === 14 /* BoneyardClose */) this.isInBoneyard = false;
          if (token.type === 11 /* NoteOpen */) this.isInNote = true;
          if (token.type === 12 /* NoteClose */) this.isInNote = false;
        }
        if (this.isInBoneyard || this.isInNote) continue;
        if (token.type === 20 /* Bold */ || token.type === 19 /* Italic */ || token.type === 21 /* Underline */) {
          for (let i = openInlines.length - 1; i >= 0; i--) {
            const openInline = openInlines[i];
            if (token.type === openInline.type) {
              openInline.active = true;
              token.active = true;
              openInlines.splice(i, 1);
              break;
            }
          }
          if (!token.active) openInlines.push(token);
        }
      }
    }
  };

  // src/range.ts
  var RangeContext = class {
    constructor(range, view) {
      this.previousLine = view.getLineAt(range.start - 1);
      this.nextLine = view.getLineAt(range.end + 1);
      this.isDocumentStart = false;
      this.isInDialogue = false;
      this.isInDualDialogue = false;
      this.nextLineIsBlank = true;
      this.previousLineIsBlank = true;
      if (this.previousLine) {
        if (this.previousLine.classList.contains("Character") || this.previousLine.classList.contains("Dialogue") || this.previousLine.classList.contains("Parenthetical")) {
          this.isInDialogue = true;
          this.previousLineIsBlank = false;
          if (this.previousLine.classList.contains("Dual")) {
            this.isInDualDialogue = true;
          }
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
  };
  var LineRange = class _LineRange {
    constructor(start, end) {
      if (start <= end) {
        this.start = start;
        this.end = end;
      } else {
        this.start = end;
        this.end = start;
      }
    }
    overlaps(range) {
      return this.start <= range.end && range.start <= this.end;
    }
    includesRange(range) {
      return this.start <= range.start && this.end >= range.end;
    }
    includesIndex(index) {
      return this.start <= index && this.end >= index;
    }
    extend(range) {
      const start = Math.min(this.start, range.start);
      const end = Math.max(this.end, range.end);
      return new _LineRange(start, end);
    }
  };

  // src/multiline.ts
  var MultilineRange = class {
    constructor(type, range) {
      this.type = type;
      this.range = range;
    }
  };
  var MultilineEnd = class {
    constructor(type, index, forward) {
      this.type = type;
      this.index = index;
      this.forward = forward;
    }
    isInRange(range) {
      return range.includesIndex(this.index);
    }
  };
  var MultilineManager2 = class {
    constructor(view) {
      this.activeMultilines = /* @__PURE__ */ new Set();
      this.openMultilines = [];
      this.view = view;
    }
    manage(fairfaxDocument, range) {
      for (let multiline of this.activeMultilines) {
        if (range.includesRange(multiline.range)) {
          this.activeMultilines.delete(multiline);
        }
      }
      for (let i = this.openMultilines.length - 1; i >= 0; i--) {
        const openEnd = this.openMultilines[i];
        if (openEnd.isInRange(range)) {
          this.openMultilines.splice(i, 1);
        }
      }
      for (let structure of fairfaxDocument.activeMultilines) {
        const start = structure.start + range.start;
        const end = structure.end + range.start;
        this.activeMultilines.add(new MultilineRange(
          structure.type,
          new LineRange(start, end)
        ));
      }
      for (let structure of fairfaxDocument.openMultilines) {
        const end = new MultilineEnd(
          structure.type,
          structure.index + range.start,
          structure.forward
        );
        this.tryClosing(end);
      }
    }
    tryClosing(end) {
      if (end.forward) {
        for (let i = 0; i < this.openMultilines.length; i++) {
          const otherEnd = this.openMultilines[i];
          if (end.type === otherEnd.type && otherEnd.index > end.index && !otherEnd.forward) {
            this.close(end, otherEnd, i);
          }
        }
      } else {
        for (let i = this.openMultilines.length - 1; i >= 0; i--) {
          const otherEnd = this.openMultilines[i];
          if (end.type === otherEnd.type && otherEnd.index < end.index && otherEnd.forward) {
            this.close(otherEnd, end, i);
          }
        }
      }
      this.openMultilines.push(end);
    }
    close(start, end, index) {
      this.openMultilines.splice(index, 1);
      const range = new MultilineRange(
        start.type,
        new LineRange(start.index, end.index)
      );
      this.activeMultilines.add(range);
    }
    /* 
     * Check if the given range overlaps with any active multiline ranges. Note
     * that we exclude the case where the given range is larger than or equal to
     * an active range, as we're already processing the active range if so.
     */
    multilinesOverlap(range) {
      for (let multiline of this.activeMultilines) {
        if (multiline.range.overlaps(range) && !range.includesRange(multiline.range)) return multiline.range;
      }
      return;
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
      if (anchor.parentElement?.tagName === "SPAN") {
        anchor = anchor.parentElement;
      }
      const childNodes = Array.from(activeLine.childNodes);
      if (anchor.nodeName === "DIV") {
        this.offset = this.sumNodeLengths(
          childNodes,
          0,
          selection.anchorOffset
        );
        return;
      }
      this.offset = this.sumNodeLengths(
        childNodes,
        0,
        childNodes.indexOf(anchor)
      ) + selection.anchorOffset;
    }
    sumNodeLengths(nodes, start, end) {
      return nodes.slice(start, end).reduce(
        (sum, node) => node.textContent ? sum + node.textContent.length : sum,
        0
      );
    }
    render() {
      const activeLine = this.view.getActiveLine() ?? this.view.container;
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
          if (childNode.nodeType !== Node.TEXT_NODE) {
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
        [0 /* Bold */, "Bold"],
        [1 /* Italic */, "Italic"],
        [2 /* Underline */, "Underline"],
        [3 /* Boneyard */, "Boneyard"],
        [4 /* Note */, "Note"],
        [5 /* Special */, "Special"],
        [6 /* TitlePageKey */, "TitlePageKey"],
        [7 /* TitlePageValue */, "TitlePageValue"]
      ]);
      this.container = container2;
      this.selection = new ViewSelection(this);
      this.resetContainer();
    }
    resetContainer() {
      this.container.innerHTML = '<div class="from-reset"><br></div>';
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
      newLine.classList.add("from-insert");
      if (targetLine) {
        targetLine.before(newLine);
      } else {
        this.container.appendChild(newLine);
      }
    }
    getTextInRange(range) {
      const rangeText = [];
      for (let i = range.start; i <= range.end; i++) {
        const line = this.getLineAt(i);
        if (line) rangeText.push(this.getTextInLine(line));
      }
      return rangeText.join("\n");
    }
    getTextInLine(line) {
      let lineText = "";
      for (let i = 0; i < line.childNodes.length; i++) {
        const childNode = line.childNodes[i];
        if (childNode.nodeName === "DIV") {
          lineText += this.getTextInLine(childNode);
          if (line.childNodes[i + 1] && line.childNodes[i + 1].nodeName === "DIV") {
            lineText += "\n";
          }
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
        } else if (lineIndex > range.end) {
          this.insertLineAt(lineIndex);
        }
        let line = this.getLineAt(lineIndex);
        if (!line) return;
        if (shouldRewrite) this.writeLine(line, block);
        this.classLine(line, block);
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
      if (line.textContent === "") line.innerHTML = "<br>";
    }
    classLine(line, block) {
      const lineClass = this.blockMap.get(block.type) ?? "Action";
      line.className = lineClass;
      if (block.centered) {
        line.classList.add("Centered");
      }
      if (block.isDual) {
        line.classList.add("Dual");
      }
    }
  };

  // src/editor.ts
  var Editor = class {
    constructor(container2) {
      this.parser = new Parser();
      this.container = container2;
      this.container.setAttribute("contenteditable", "true");
      this.container.addEventListener("input", (e) => {
        this.handleInput(e);
      });
      this.view = new View(container2);
      this.mlManager = new MultilineManager2(this.view);
    }
    handleInput(e) {
      const activeLine = this.view.getActiveLine();
      if (!activeLine && this.container.querySelectorAll("div").length === 0) {
        this.view.resetContainer();
      }
      if (!activeLine) return;
      if (e.inputType === "insertParagraph") {
        const lineIndex = this.view.getLineIndex(activeLine);
        if (lineIndex === void 0) return;
        const lineRange = new LineRange(lineIndex, lineIndex);
        const overlap = this.mlManager.multilinesOverlap(lineRange);
        if (overlap) {
          console.log("Handling addition within ML");
          const extendedRange = new LineRange(overlap.start, overlap.end + 1);
          this.updateRange(lineRange.extend(extendedRange), true);
          return;
        }
      }
      this.updateLine(activeLine, true);
    }
    updateLine(line, shouldRewrite) {
      if (line.classList.contains("Dual") && line.classList.contains("Character")) {
        shouldRewrite = true;
      }
      const lineIndex = this.view.getLineIndex(line);
      if (lineIndex !== void 0) {
        this.updateRange(new LineRange(lineIndex, lineIndex), shouldRewrite);
      }
    }
    updateRange(range, shouldRewrite) {
      const text = this.view.getTextInRange(range);
      const context = new RangeContext(range, this.view);
      if (context.nextLine && context.nextLine.tagName === "BR") {
        context.nextLine.remove();
        this.updateRange(range, shouldRewrite);
        return;
      }
      const parserOptions = new ParserOptions(
        context.isDocumentStart,
        context.isInDialogue,
        context.isInDualDialogue,
        context.nextLineIsBlank,
        context.previousLineIsBlank
      );
      const [firstLineStartClass, lastLineStartClass] = this.getBorderClasses(range);
      const fairfaxDocument = this.parser.parse(text, parserOptions);
      this.mlManager.manage(fairfaxDocument, range);
      const overlap = this.mlManager.multilinesOverlap(range);
      if (overlap) {
        console.log("Overlap detected");
        this.updateRange(range.extend(overlap), true);
        return;
      }
      this.view.updateRange(range, fairfaxDocument.blocks, shouldRewrite ?? false);
      const [firstLineEndClass, lastLineEndClass] = this.getBorderClasses(range);
      if (firstLineStartClass != firstLineEndClass || lastLineStartClass != lastLineEndClass) {
        this.updateNeighbors(context);
      }
    }
    updateNeighbors(context) {
      if (context.nextLine) this.updateLine(context.nextLine);
      if (context.previousLine) this.updateLine(context.previousLine);
    }
    getBorderClasses(range) {
      const firstLine = this.view.getLineAt(range.start);
      const lastLine = this.view.getLineAt(range.end);
      return [firstLine?.className, lastLine?.className];
    }
  };

  // src/monica.ts
  var container = document.getElementById("monica");
  if (container) new Editor(container);
})();
