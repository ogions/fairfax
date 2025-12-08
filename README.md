# Fairfax

Fairfax is a lightweight, web-based Fountain editor.

To try it out, you can clone the repo and run `npm test`.

## Dependencies

Fairfax uses [Hyperion](https://github.com/ogions/hyperion), a Typescript-based parser for Fountain screenplay markup. For more information on Fountain, see [the website](https://fountain.io/).

## Usage

Fairfax uses web technology and the HTML `contenteditable` attribute. To initialize it, create a new `Editor` with a container element as an argument.

```html
<!DOCTYPE html>
<head>
    <script type="module" defer>
        import { Editor } from "./fairfax.js";
        const container = document.getElementById("fairfax");
        if (container) new Editor(container);
    </script>
</head>
<body>
    <main id="fairfax"></main>
</body>
```

Note that the `Editor` exposes `undo` and `redo` methods, but it does not bind these to keyboard shortcuts by default. A basic example setup is available in `demo/index.html`.

```javascript
container.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
            editor.redo();
        } else {
            editor.undo();
        }
    }
})
```

## Styling

Fairfax assigns classes to HTML elements, but it does not directly apply styling. In order for the displayed text to resemble a screenplay, it must be styled with CSS.

A set of reasonable defaults is available at `demo/style.css`.

## License

Fairfax is available under the MIT license.

---

Zach Lo

https://zachlo.com
