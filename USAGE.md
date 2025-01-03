# JvGeo's Documentation

{:toc}

## Usage example

```html
<div id="div-example" style="width:600px; border:2px solid #CCC"></div>
```

```js
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
```

## "jvgeo-ready" Event
The `"jvgeo-ready"` event is raised on the global `document` instance.
Instead of directly accessing the global `JvGeo` class,
you should use the constructor given as `event.detail.JvGeo`:

```js
document.addEventListener("jvgeo-ready", evt => {
    const jvgeo = new evt.detail.JvGeo()
    ...
})
```

## JvGeo class
Main class providing the functionality. To be instantiated
by invoking the constructor `evt.detail.JvGeo` in "jvgeo-ready" event.

### JvGeo:Init(divId, width, height)

Setup the UI inside the DOM container identified by `divId`.
The container's `aspect-ratio` is forced to `width/height`.
The size of the container determines the drawing area.

- **divId** (*String*): ID of the DOM element which will contain the drawings.
  The size of the container determines the drawing area.
- **width**, **height** (*Number*): Logical dimensions, only used as relative scale
  for the initial placement of the drag points.

### JvGeo:AddDragPoint(name, initX, initY)

Adds a point draggable by user to interact with the drawings.

- **name** (*String*): Name of the draggable point, used for both display and identification.
- **initX**, **initY** (*Number*): Initial position, relative to
  `width` and `height` given to  `Init()`.

### JvGeo:AddInputRange(name, min, max, initValue, text)

Adds an input range to the drawing, such that the user can interact with.

- **name** (*String*): Name of the range, used for identification.
- **min**, **max** (*Number*): Extents of the range.
- **initValue** (*Number*): Initial value of the range.
- **text** (*String|null*): Label used for display, where `{}` is replaced by the range's value.

### JvGeo:AddCheckbox(name, initValue, text)

Adds a checkbox to the drawing, such that the user can interact with.

- **name** (*String*): Name of the checkbox, used for identification.
- **initValue** (*Boolean*): Whether the checkbox is initially checked.
- **text** (*String|null*): Label used for display.

### JvGeo:Reset()

Reinitializes the values of interactive elements (checkboxes, input ranges, draggable points...).

### JvGeo:MainLoop(userfuncDraw)

Setup the main loop which updates the drawing according to the user interactions.

- **userfuncDraw**: Function called every animation frame, 
  which is given a dictionary as first argument containing the values
  of all interactive elements, key-ed by the `name` given to
  `AddDragPoint()`, `AddInputRange()`, `AddCheckbox`...
  The coordinates of the draggable points are expressed in pixels.

### JvGeo:DrawSegment(xA, yA, xB, yB, color, thickness)

Draws a segment between the given coordinates. This function must
be called from inside the `userfuncDraw` given to `MainLoop()`.

- **xA**, **yA**, **xB**, **yB** (*Number*): Coordinates
  of the segment's endpoints, in pixels.
- **color** (*String* = `"#000"`): CSS color to be used for the stroke.
- **thickness** (*Number* = `2`): Thickness, in pixels.

### JvGeo:DrawPoint(x, B, color)

Draws a point at given coordinates. This function must
be called from inside the `userfuncDraw` given to `MainLoop()`.

- **x**, **y** (*Number*): Coordinates of the point, in pixels.
- **color** (*String*): CSS color used to fill the point.

### JvGeo:DrawLine(xA, yA, xB, yB, color, thickness)

Draws a line passing through the given coordinates. This function must
be called from inside the `userfuncDraw` given to `MainLoop()`.

- **xA**, **yA**, **xB**, **yB** (*Number*): Coordinates
  of the points defining the line, in pixels.
- **color** (*String* = `"#000"`): CSS color to be used for the stroke.
- **thickness** (*Number* = `2`): Thickness, in pixels.

### JvGeo:DrawTriangle(xA, yA, xB, yB, xC, yC, colorFG, colorBG, thickness)

Draws the triangle defined by the given coordinates. This function must
be called from inside the `userfuncDraw` given to `MainLoop()`.

- **xA**, **yA**, **xB**, **yB**, **xC**, **yC** (*Number*): Coordinates
  of the points defining the triangle, in pixels.
- **colorFG** (*String* = `"#000"`): CSS color to be used for the stroke.
- **colorBG** (*String* = `"#0004"`): CSS color to be used for the filling.
- **thickness** (*Number* = `2`): Thickness, in pixels.

### JvGeo:Intersect(x1, y1, x2, y2, x3, y3, x4, y4) -> [xI, yI]

Returns **[xI, yI]** the coordinates of the intersection point betwen two lines,
or **[NaN, NaN]** if the two lines never cross (ie. they are parallel).

- **x1**, **y1**, **x2**, **y2**, (*Number*): Coordinates of the points
  defining the first line, in pixels.
- **x3**, **y3**, **x4**, **y4**, (*Number*): Coordinates of the points
  defining the second line, in pixels.

### JvGeo:NormalizedParallelVec(x, y, len=1.0) -> [xV, yV]

Returns **[xV, yV]** the components of a vector of same direction than `(x,y)`,
but with given length.

- **x**, **y**, (*Number*): Components of the input vector.
- **len** (*Number* = `1.0`): Length of the returned vector.
  By default, returns a unit vector.

### JvGeo:NormalizedPerpendicularVec(x, y, len=1.0) -> [xV, yV]

Returns **[xV, yV]** the components of a vector perpendicular to `(x,y)`,
with given length.

- **x**, **y**, (*Number*): Components of the input vector.
- **len** (*Number* = `1.0`): Length of the returned vector.
  By default, returns a unit vector.

