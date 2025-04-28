"use strict"

/// # JvGeo's Documentation
///
/// * xxx
/// {:toc}
///
/// ## Usage example
///
/// ```html
/// <div id="div-example" style="width:600px; border:2px solid #CCC"></div>
/// ```
///
/// ```js
/// document.addEventListener("jvgeo-ready", evt => {
///     const jvgeo = new evt.detail.JvGeo()
///     jvgeo.Init("div-example", 0, 6, 0, 4)
///     jvgeo.AddDragPoint("A", 4, 1)
///     jvgeo.AddDragPoint("B", 1, 2)
///     jvgeo.AddDragPoint("C", 3, 3)
///     jvgeo.AddInputRange("Thickness", 0, 200, 70, "Thickness = {} px")
///     jvgeo.MainLoop(({A,B,C,Thickness}) => {
///         jvgeo.DrawSegment(A.x, A.y, B.x, B.y, "#0004", Thickness)
///         jvgeo.DrawSegment(B.x, B.y, C.x, C.y, "#0004", Thickness)
///     })
/// })
/// ```
///
/// ## "jvgeo-ready" Event
/// The `"jvgeo-ready"` event is raised on the global `document` instance.
/// Instead of directly accessing the global `JvGeo` class,
/// you should use the constructor given as `event.detail.JvGeo`:
///
/// ```js
/// document.addEventListener("jvgeo-ready", evt => {
///     const jvgeo = new evt.detail.JvGeo()
///     ...
/// })
/// ```
///
/// ## JvGeo class
/// Main class providing the functionality. To be instantiated
/// by invoking the constructor `evt.detail.JvGeo` in "jvgeo-ready" event.
///
class JvGeo {
    // Geometry logic
    #xMin
    #xMax
    #yMin
    #yMax
    #initDragPoints
    #dragPoints
    #initInputRanges
    #inputRanges
    #initInputCheckboxes
    #inputCheckboxes

    // HTML elements
    #divId
    #domContainer
    #domInputs
    #domResetBtn
    #domCanvas
    #domHelp
    #domLink

    // Rendering state
    #drawCtx
    #bInsideUserfuncDraw

    // Mouse/Touch tracking
    #pointers
    #pointerPos

    /// ### JvGeo:Init(divId, xMin, xMax, yMin, yMax)
    ///
    /// Setup the UI inside the DOM container identified by `divId`.
    /// The container's `aspect-ratio` is forced to `(xMax-xMin)/(yMax-yMin)`.
    /// The size of the container determines the drawing area.
    ///
    /// - **divId** (*String*): ID of the DOM element which will contain the drawings.
    ///   The size of the container determines the drawing area.
    /// - **xMin**, **xMax**, **yMin**, **yMax** (*Number*): Logical dimensions.
    ///
    Init(divId, xMin, xMax, yMin, yMax) {
        this.#xMin = xMin
        this.#xMax = xMax
        this.#yMin = yMin
        this.#yMax = yMax
        this.#initDragPoints = {}
        this.#dragPoints = {}
        this.#initInputRanges = {}
        this.#inputRanges = {}
        this.#initInputCheckboxes = {}
        this.#inputCheckboxes = {}

        // Initialize HTML elements

        this.#divId = divId

        this.#domContainer = document.getElementById(divId)
        this.#domContainer.innerHTML = ""
        this.#domContainer.style.aspectRatio = (this.#xMax - this.#xMin) / (this.#yMax - this.#yMin)
        this.#domContainer.style.position = "relative"

        this.#domInputs = this.#domContainer.appendChild(document.createElement("div"))
        this.#domInputs.style.position = "absolute"
        this.#domInputs.style.display = "flex"

        this.#domResetBtn = this.#domInputs.appendChild(document.createElement("button"))
        this.#domResetBtn.innerText = "Reset"
        this.#domResetBtn.onclick = () => this.Reset()

        this.#domHelp = this.#domContainer.appendChild(document.createElement("p"))
        this.#domHelp.style.position = "absolute"
        this.#domHelp.style.bottom = 0
        this.#domHelp.style.margin = 0
        this.#domHelp.style.fontStyle = "italic"
        this.#domHelp.innerText = "Drag and drop the points!"

        this.#domLink = this.#domContainer.appendChild(document.createElement("p"))
        this.#domLink.style.position = "absolute"
        this.#domLink.style.bottom = 0
        this.#domLink.style.right = 0
        this.#domLink.style.margin = 0
        this.#domLink.style.fontStyle = "italic"
        // This acts as the attribution required by MIT license.
        // If you fork this code, you can change the link's text to "Based on JvGeo",
        // and add a link to your own project.
        this.#domLink.innerHTML = `
            <a href="https://github.com/J-Vernay/JvGeo" style="color: inherit">Using JvGeo</a>
        `

        this.#domCanvas = this.#domContainer.appendChild(document.createElement("canvas"))
        this.#domCanvas.style.width = "100%"
        this.#domCanvas.style.height = "100%"
        this.#domCanvas.style.touchAction = "none"
        this.#domCanvas.width = this.#domCanvas.clientWidth
        this.#domCanvas.height = this.#domCanvas.clientHeight

        // Rendering state

        this.#drawCtx = this.#domCanvas.getContext("2d")
        this.#bInsideUserfuncDraw = false

        // Using pointers API for both mouse and touches.

        this.#pointers = {}
        this.#pointerPos = null

        this.#domCanvas.onpointerdown = (evt) => {
            evt.preventDefault()
            const [x, y] = this.PixelToCoord(evt.offsetX, evt.offsetY)
            this.#pointers[evt.pointerId] = {
                originX: x,
                originY: y,
                moveX: 0,
                moveY: 0,
                dragPoint: null,
                dragPointOriginX: null,
                dragPointOriginY: null
            }
            this.#pointerPos = { x, y }
        }

        this.#domCanvas.onpointermove = (evt) => {
            evt.preventDefault()
            const [x, y] = this.PixelToCoord(evt.offsetX, evt.offsetY)
            const pointer = this.#pointers[evt.pointerId]
            if (pointer) {
                pointer.moveX = x - pointer.originX
                pointer.moveY = y - pointer.originY
            }
            this.#pointerPos = { x, y }
        }

        this.#domCanvas.onpointerup = (evt) => {
            evt.preventDefault()
            delete this.#pointers[evt.pointerId]
            const [x, y] = this.PixelToCoord(evt.offsetX, evt.offsetY)
            this.#pointerPos = { x, y }
        }
        this.#domCanvas.onpointercancel = this.#domCanvas.onpointerup

        this.#domCanvas.onpointerout = (evt) => {
            evt.preventDefault()
            delete this.#pointers[evt.pointerId]
            for (const _ in this.#pointers) {
                return // Return if dict is not empty
            }
            this.#pointerPos = null
        }
    }

    /// ### JvGeo:CoordToPixel(x,y)
    ///
    /// Returns `[x,y]`, the corresponding coordinates in pixels.
    /// JvGeo API uses logical coordinates, thus this method is for rendering stuff on your own.
    ///
    CoordToPixel(x, y) {
        return [
            ((x - this.#xMin) / (this.#xMax - this.#xMin)) * this.#domCanvas.clientWidth,
            ((y - this.#yMin) / (this.#yMax - this.#yMin)) * this.#domCanvas.clientHeight
        ]
    }

    /// ### JvGeo:PixelToCoord(x,y)
    ///
    /// Returns `[x,y]`, the corresponding logical coordinates.
    /// JvGeo API uses logical coordinates, thus this method is helpful for sending your own events.
    ///
    PixelToCoord(x, y) {
        return [
            this.#xMin + (x / this.#domCanvas.clientWidth) * (this.#xMax - this.#xMin),
            this.#yMin + (y / this.#domCanvas.clientHeight) * (this.#yMax - this.#yMin),
        ]
    }

    /// ### JvGeo:ScaleToCoord(v)
    ///
    /// Converts a distance from pixel units to logical units.
    /// JvGeo API uses logical coordinates, thus this may be useful if you have your own pixel logic.
    ///
    ScaleToCoord(v) {
        return v * (this.#yMax - this.#yMin) / this.#domCanvas.clientHeight
    }

    /// ### JvGeo:ScaleToPixel(v)
    ///
    /// Converts a distance from logical units to pixel units.
    /// JvGeo API uses logical coordinates, thus this may be useful if you have your own pixel logic.
    ///
    ScaleToPixel(v) {
        return v * this.#domCanvas.clientHeight / (this.#yMax - this.#yMin)
    }

    /// ### JvGeo:AddDragPoint(name, initX, initY)
    ///
    /// Adds a point draggable by user to interact with the drawings.
    ///
    /// - **name** (*String*): Name of the draggable point, used for both display and identification.
    /// - **initX**, **initY** (*Number*): Initial position, in logical coordinates.
    ///
    AddDragPoint(name, initX, initY) {
        this.#initDragPoints[name] = { initX, initY }
        this.#dragPoints[name] = { x: initX, y: initY, pointerId: null }
    }

    /// ### JvGeo:AddInputRange(name, min, max, initValue, text)
    ///
    /// Adds an input range to the drawing, such that the user can interact with.
    ///
    /// - **name** (*String*): Name of the range, used for identification.
    /// - **min**, **max** (*Number*): Extents of the range.
    /// - **initValue** (*Number*): Initial value of the range.
    /// - **text** (*String|null*): Label used for display, where `{}` is replaced by the range's value.
    ///
    AddInputRange(name, min, max, initValue, text = null) {
        if (text === null)
            text = `${name} = {}`
        this.#initInputRanges[name] = { min, max, initValue, text }

        let elem = this.#inputRanges[name]
        if (elem === undefined) {
            this.#domInputs.appendChild(document.createElement("div")).style.width = "16px"

            elem = this.#domInputs.appendChild(document.createElement("input"))
            this.#inputRanges[name] = elem
            elem.type = "range"
            elem.id = `${this.#divId}-${name}`

            const label = this.#domInputs.appendChild(document.createElement("label"))
            label.htmlFor = elem.id
            elem.oninput = () => { label.innerText = text.replace("{}", elem.value) }
        }
        elem.min = min
        elem.max = max
        elem.value = initValue
        elem.oninput()
    }

    /// ### JvGeo:AddCheckbox(name, initValue, text)
    ///
    /// Adds a checkbox to the drawing, such that the user can interact with.
    ///
    /// - **name** (*String*): Name of the checkbox, used for identification.
    /// - **initValue** (*Boolean*): Whether the checkbox is initially checked.
    /// - **text** (*String|null*): Label used for display.
    ///
    AddCheckbox(name, initValue, text = null) {
        if (text === null)
            text = name
        this.#initInputCheckboxes[name] = { initValue, text }

        let elem = this.#inputCheckboxes[name]
        if (elem === undefined) {
            this.#domInputs.appendChild(document.createElement("div")).style.width = "16px"

            elem = this.#domInputs.appendChild(document.createElement("input"))
            this.#inputCheckboxes[name] = elem
            elem.type = "checkbox"
            elem.id = `${this.#divId}-${name}`

            const label = this.#domInputs.appendChild(document.createElement("label"))
            label.innerText = text
            label.htmlFor = elem.id
        }
        elem.checked = initValue
    }

    /// ### JvGeo:Reset()
    ///
    /// Reinitializes the values of interactive elements (checkboxes, input ranges, draggable points...).
    ///
    Reset() {
        this.#dragPoints = {}
        for (const name in this.#initDragPoints) {
            const { initX, initY } = this.#initDragPoints[name]
            this.#dragPoints[name] = { x: initX, y: initY, pointerId: null }
        }
        for (const name in this.#initInputRanges) {
            const { min, max, initValue, text } = this.#initInputRanges[name]
            const domInput = this.#inputRanges[name]
            domInput.value = initValue
            domInput.oninput()
        }
        for (const name in this.#initInputCheckboxes) {
            const { initValue, text } = this.#initInputCheckboxes[name]
            const domInput = this.#inputCheckboxes[name]
            domInput.checked = initValue
        }
    }

    /// ### JvGeo:MainLoop(userfuncDraw)
    ///
    /// Setup the main loop which updates the drawing according to the user interactions.
    ///
    /// - **userfuncDraw**: Function called every animation frame,
    ///   which is given a dictionary as first argument containing the values
    ///   of all interactive elements, key-ed by the `name` given to
    ///   `AddDragPoint()`, `AddInputRange()`, `AddCheckbox`...
    ///   The positions of the draggable points are expressed in logical coordinate.
    ///
    async MainLoop(userfuncDraw) {
        while (true) {
            await new Promise(requestAnimationFrame)

            // Resize if needed

            const oldWidth = this.#domCanvas.width
            const newWidth = this.#domCanvas.clientWidth
            const oldHeight = this.#domCanvas.height
            const newHeight = this.#domCanvas.clientHeight
            if (newWidth !== oldWidth || newHeight !== oldHeight) {
                for (const name in this.#dragPoints) {
                    const dragPoint = this.#dragPoints[name]
                    dragPoint.x *= newWidth / oldWidth
                    dragPoint.y *= newHeight / oldHeight
                }
                this.#domCanvas.width = this.#domCanvas.clientWidth
                this.#domCanvas.height = this.#domCanvas.clientHeight
            }

            // Update the drag points

            let bDragging = false
            for (const pointerId in this.#pointers) {
                const pointer = this.#pointers[pointerId]
                if (pointer.dragPoint === null) {
                    // Find nearest drag point
                    let minDist = Infinity
                    for (const name in this.#dragPoints) {
                        const dragPoint = this.#dragPoints[name]
                        const dist = Math.hypot(pointer.originX - dragPoint.x, pointer.originY - dragPoint.y)
                        if (dist < minDist) {
                            minDist = dist
                            pointer.dragPoint = dragPoint
                        }
                    }
                    if (pointer.dragPoint === null) {
                        continue // Not found...
                    }
                    pointer.dragPointOriginX = pointer.dragPoint.x
                    pointer.dragPointOriginY = pointer.dragPoint.y
                    pointer.dragPoint.pointerId = pointerId
                }
                pointer.dragPoint.x = pointer.dragPointOriginX + pointer.moveX
                pointer.dragPoint.y = pointer.dragPointOriginY + pointer.moveY
                bDragging = true
            }

            // Find nearest point from cursor (irrelevant of drag state)

            let nearestDragPointName = null
            let minDist = Infinity
            if (this.#pointerPos) {
                for (const name in this.#dragPoints) {
                    const dragPoint = this.#dragPoints[name]
                    const dist = Math.hypot(this.#pointerPos.x - dragPoint.x, this.#pointerPos.y - dragPoint.y)
                    if (dist < minDist) {
                        minDist = dist
                        nearestDragPointName = name
                    }
                }
            }

            // Create user vars

            const userVars = {}
            Object.assign(userVars, this.#dragPoints)
            for (const name in this.#inputRanges) {
                const domInput = this.#inputRanges[name]
                userVars[name] = Number(domInput.value)
            }
            for (const name in this.#inputCheckboxes) {
                const domInput = this.#inputCheckboxes[name]
                userVars[name] = domInput.checked
            }

            // Draw

            this.#drawCtx.reset()
            this.#bInsideUserfuncDraw = true
            userfuncDraw(userVars)
            for (const name in this.#dragPoints) {
                const pt = this.#dragPoints[name]
                if (!(pt.pointerId in this.#pointers))
                    pt.pointerId = null
                const bIsDragged = pt.pointerId !== null
                const bIsNearest = name === nearestDragPointName
                const bHighlighted = bDragging && bIsDragged || !bDragging && bIsNearest
                this.DrawPoint(pt.x, pt.y, name, bHighlighted ? "#88F" : "#00F")
            }
            this.#bInsideUserfuncDraw = false
        }
    }

    /// ### JvGeo:DrawSegment(xA, yA, xB, yB, color, thickness)
    ///
    /// Draws a segment between the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB** (*Number*):
    ///   Logical coordinates of the segment's endpoints, in pixels.
    /// - **color** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawSegment(xA, yA, xB, yB, color = "#000", thickness = 2) {
        const [pxA, pyA] = this.CoordToPixel(xA, yA)
        const [pxB, pyB] = this.CoordToPixel(xB, yB)
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = thickness
        ctx.moveTo(pxA, pyA)
        ctx.lineTo(pxB, pyB)
        ctx.stroke()
    }

    /// ### JvGeo:DrawPoint(x, B, color)
    ///
    /// Draws a point at given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **x**, **y** (*Number*): Logical coordinates of the point.
    /// - **color** (*String*): CSS color used to fill the point.
    ///
    DrawPoint(x, y, name, color) {
        const [px, py] = this.CoordToPixel(x, y)
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.fillStyle = color
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2
        ctx.arc(px, py, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = "#000"
        ctx.font = "bold 16px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.fillText(name, px, py - 2 * 8)
    }

    /// ### JvGeo:DrawLine(xA, yA, xB, yB, color, thickness)
    ///
    /// Draws a line passing through the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB** (*Number*):
    ///    Logical coordinates of the points defining the line, in pixels.
    /// - **color** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawLine(xA, yA, xB, yB, color = "#000", thickness = 2) {
        const xAB = xB - xA, yAB = yB - yA
        const lenDiagonal = Math.hypot(this.#xMax - this.#xMin, this.#yMax - this.#yMin)
        const scale = lenDiagonal / Math.hypot(xAB, yAB)
        this.DrawSegment(xA - xAB * scale, yA - yAB * scale, xA + xAB * scale, yA + yAB * scale, color, thickness)
    }

    /// ### JvGeo:DrawTriangle(xA, yA, xB, yB, xC, yC, colorFG, colorBG, thickness)
    ///
    /// Draws the triangle defined by the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB**, **xC**, **yC** (*Number*):
    ///   Logical coordinates of the points defining the triangle, in pixels.
    /// - **colorFG** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **colorBG** (*String* = `"#0004"`): CSS color to be used for the filling.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawTriangle(xA, yA, xB, yB, xC, yC, colorFG = "#000", colorBG = "#0004", thickness = 2) {
        console.assert(this.#bInsideUserfuncDraw)
        const [pxA, pyA] = this.CoordToPixel(xA, yA)
        const [pxB, pyB] = this.CoordToPixel(xB, yB)
        const [pxC, pyC] = this.CoordToPixel(xC, yC)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.fillStyle = colorBG
        ctx.strokeStyle = colorFG
        ctx.lineWidth = thickness
        ctx.moveTo(pxA, pyA)
        ctx.lineTo(pxB, pyB)
        ctx.lineTo(pxC, pyC)
        ctx.lineTo(pxA, pyA)
        ctx.fill()
        ctx.stroke()
    }


    /// ### JvGeo:DrawCoordSystem()
    ///
    /// Draws the cartesian coordinate system grid and axes.
    ///
    DrawCoordSystem() {
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx

        for (let x = this.#xMin; x < this.#xMax; ++x) {
            this.DrawSegment(x, this.#yMin, x, this.#yMax, "#CCC", 2)
            if (x == 0)
                continue
            const [px, py] = this.CoordToPixel(x, 0)
            ctx.fillStyle = "#555"
            ctx.strokeStyle = "#FFF"
            ctx.lineWidth = 5
            ctx.font = "bold 12px sans-serif"
            ctx.textAlign = "center"
            ctx.textBaseline = "bottom"
            ctx.strokeText(`${x}`, px, py - 2)
            ctx.fillText(`${x}`, px, py - 2)

        }
        for (let y = this.#yMin; y < this.#yMax; ++y) {
            this.DrawSegment(this.#xMin, y, this.#xMax, y, "#CCC", 2)
            if (y == 0)
                continue
            const [px, py] = this.CoordToPixel(0, y)
            ctx.fillStyle = "#555"
            ctx.strokeStyle = "#FFF"
            ctx.lineWidth = 5
            ctx.font = "bold 12px sans-serif"
            ctx.textAlign = "right"
            ctx.textBaseline = "middle"
            ctx.strokeText(`${y}`, px - 4, py)
            ctx.fillText(`${y}`, px - 4, py)
        }

        const [px0, py0] = this.CoordToPixel(0, 0)
        const pxMax = this.#domCanvas.clientWidth
        const pyMax = this.#domCanvas.clientHeight

        // X-Axis
        ctx.beginPath()
        ctx.fillStyle = "#555"
        ctx.lineWidth = 0
        ctx.moveTo(0, py0 - 2)
        ctx.lineTo(pxMax - 10, py0 - 2)
        ctx.lineTo(pxMax - 10, py0 - 10)
        ctx.lineTo(pxMax, py0)
        ctx.lineTo(pxMax - 10, py0 + 10)
        ctx.lineTo(pxMax - 10, py0 + 2)
        ctx.lineTo(0, py0 + 2)
        ctx.closePath()
        ctx.fill()

        // Y-Axis
        ctx.beginPath()
        ctx.fillStyle = "#555"
        ctx.lineWidth = 0
        ctx.moveTo(px0 - 2, 0)
        ctx.lineTo(px0 - 2, pyMax - 10)
        ctx.lineTo(px0 - 10, pyMax - 10)
        ctx.lineTo(px0, pyMax)
        ctx.lineTo(px0 + 10, pyMax - 10)
        ctx.lineTo(px0 + 2, pyMax - 10)
        ctx.lineTo(px0 + 2, 0)
        ctx.closePath()
        ctx.fill()
    }

    /// ### JvGeo:Intersect(x1, y1, x2, y2, x3, y3, x4, y4) -> [xI, yI]
    ///
    /// Returns **[xI, yI]** the coordinates of the intersection point between two lines,
    /// or **[NaN, NaN]** if the two lines never cross (ie. they are parallel).
    ///
    /// - **x1**, **y1**, **x2**, **y2**, (*Number*): Coordinates of the points
    ///   defining the first line.
    /// - **x3**, **y3**, **x4**, **y4**, (*Number*): Coordinates of the points
    ///   defining the second line.
    ///
    Intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Solving
        // x1 + alpha * (x2 - x1) = x3 + beta * (x4 - x3)
        // y1 + alpha * (y2 - y1) = y3 + beta * (y4 - y3)
        const num = (y4 - y3) * (x3 - x1) - (x4 - x3) * (y3 - y1)
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
        const alpha = num / denom
        return [x1 + alpha * (x2 - x1), y1 + alpha * (y2 - y1)]
    }

    /// ### JvGeo:NormalizedParallelVec(x, y, len=1.0) -> [xV, yV]
    ///
    /// Returns **[xV, yV]** the components of a vector of same direction than `(x,y)`,
    /// but with given length.
    ///
    /// - **x**, **y**, (*Number*): Components of the input vector.
    /// - **len** (*Number* = `1.0`): Length of the returned vector.
    ///   By default, returns a unit vector.
    ///
    NormalizedParallelVec(x, y, len = 1.0) {
        const scale = len / Math.hypot(x, y)
        return [x * scale, y * scale]
    }

    /// ### JvGeo:NormalizedPerpendicularVec(x, y, len=1.0) -> [xV, yV]
    ///
    /// Returns **[xV, yV]** the components of a vector perpendicular to `(x,y)`,
    /// with given length.
    ///
    /// - **x**, **y**, (*Number*): Components of the input vector.
    /// - **len** (*Number* = `1.0`): Length of the returned vector.
    ///   By default, returns a unit vector.
    ///
    NormalizedPerpendicularVec(x, y, len = 1.0) {
        const scale = len / Math.hypot(x, y)
        return [y * scale, x * -scale]
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.dispatchEvent(new CustomEvent("jvgeo-ready", { detail: { JvGeo } }))
})
