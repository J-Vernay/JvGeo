# JvGeo

`JvGeo` is a small implementation of an interactive geometrical drawing, fully client-side,
which can be used to add interactive visuals for geometry discussions
and blog posts. For an example of what `JvGeo` is capable of,
[here is the blog post from which JvGeo originated](https://jvernay.fr/en/blog/polyline-triangulation/).

[The API is documented in USAGE.md](USAGE.md).

## Getting started

Add `jvgeo.js` to your website, and include a `<script>` tag in your HTML page:

```html
<script src="jvgeo.js" defer></script>
```

Then, in your HTML page, add a `<div>` tag which serves as the drawing's destination,
and a `<script>` tag which is your drawing's script.

Use CSS to resize the `<div>` to the size of your liking, the canvas will adapt automatically.

```html
<div id="div-example" style="width:600px; border:2px solid #CCC"></div>
<script>
document.addEventListener("jvgeo-ready", evt => {
    const jvgeo = new evt.detail.JvGeo()
    jvgeo.Init("div-example", 6, 4)
    jvgeo.AddDragPoint("A", 4, 1)
    jvgeo.AddDragPoint("B", 1, 2)
    jvgeo.AddDragPoint("C", 3, 3)
    jvgeo.AddInputRange("Thickness", 0, 200, 70, "Thickness = {} px")
    jvgeo.MainLoop(({A,B,C,Thickness}) => {
        jvgeo.DrawSegment(A.x, A.y, B.x, B.y, "#0004", Thickness)
        jvgeo.DrawSegment(B.x, B.y, C.x, C.y, "#0004", Thickness)
    })
})
</script>
```

And voilà! The interactive drawing is shown. 😎

<div id="div-example" style="width:600px; border:2px solid #CCC"></div>
<script>
document.addEventListener("jvgeo-ready", evt => {
    const jvgeo = new evt.detail.JvGeo()
    jvgeo.Init("div-example", 6, 4)
    jvgeo.AddDragPoint("A", 4, 1)
    jvgeo.AddDragPoint("B", 1, 2)
    jvgeo.AddDragPoint("C", 3, 3)
    jvgeo.AddInputRange("Thickness", 0, 200, 70, "Thickness = {} px")
    jvgeo.MainLoop(({A,B,C,Thickness}) => {
        jvgeo.DrawSegment(A.x, A.y, B.x, B.y, "#0004", Thickness)
        jvgeo.DrawSegment(B.x, B.y, C.x, C.y, "#0004", Thickness)
    })
})
</script>
<script src="jvgeo.js" defer></script>

<noscript><strong>You need Javascript activated to see JvGeo interactive demo.</strong></noscript>
