"use strict"

/// # JvGeo's Documentation
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
///     jvgeo.Init("div-example", 6, 4)
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
    #initWidth
    #initHeight
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
    
    // Mouse tracking
    #mousePos
    #mouseClicked
    #mouseDown
    #mouseDragPoint

    /// ### JvGeo:Init(divId, width, height)
    ///
    /// Setup the UI inside the DOM container identified by `divId`.
    /// The container's `aspect-ratio` is forced to `width/height`.
    /// The size of the container determines the drawing area.
    ///
    /// - **divId** (*String*): ID of the DOM element which will contain the drawings.
    ///   The size of the container determines the drawing area.
    /// - **width**, **height** (*Number*): Logical dimensions, only used as relative scale
    ///   for the initial placement of the drag points.
    ///
    Init(divId, width, height)
    {
        this.#initWidth = width
        this.#initHeight = height
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
        this.#domContainer.style.aspectRatio = width / height
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
        this.#domCanvas.width = this.#domCanvas.clientWidth
        this.#domCanvas.height = this.#domCanvas.clientHeight

        // Rendering state

        this.#drawCtx = this.#domCanvas.getContext("2d")
        this.#bInsideUserfuncDraw = false
        
        // Mouse tracking

        this.#mousePos = {}
        this.#mouseClicked = false
        this.#mouseDown = false
        this.#mouseDragPoint = null

        this.#domCanvas.onmousedown = (evt) => {
            this.#mouseClicked = (evt.buttons === 1)
            this.#mouseDown = (evt.buttons & 1)
            this.#mousePos = { x: evt.offsetX, y: evt.offsetY }
        }
    
        this.#domCanvas.onmousemove = (evt) => {
            this.#mouseDown = (evt.buttons & 1)
            this.#mousePos = { x: evt.offsetX, y: evt.offsetY }
        }
    }

    /// ### JvGeo:AddDragPoint(name, initX, initY)
    ///
    /// Adds a point draggable by user to interact with the drawings.
    ///
    /// - **name** (*String*): Name of the draggable point, used for both display and identification.
    /// - **initX**, **initY** (*Number*): Initial position, relative to
    ///   `width` and `height` given to  `Init()`.
    ///
    AddDragPoint(name, initX, initY)
    {
        this.#initDragPoints[name] = {initX, initY}
        const x = (initX / this.#initWidth) * this.#domCanvas.clientWidth
        const y = (initY / this.#initHeight) * this.#domCanvas.clientHeight
        this.#dragPoints[name] = {x, y}
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
    AddInputRange(name, min, max, initValue, text=null)
    {
        if (text === null)
            text = `${name} = {}`
        this.#initInputRanges[name] = {min, max, initValue, text}
        
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
    AddCheckbox(name, initValue, text=null)
    {
        if (text === null)
            text = name
        this.#initInputCheckboxes[name] = {initValue, text}
        
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
    Reset()
    {
        this.#dragPoints = {}
        for (const name in this.#initDragPoints) {
            const {initX, initY} = this.#initDragPoints[name]
            const x = (initX / this.#initWidth) * this.#domCanvas.clientWidth
            const y = (initY / this.#initHeight) * this.#domCanvas.clientHeight
            this.#dragPoints[name] = {x, y}
        }
        for (const name in this.#initInputRanges) {
            const {min, max, initValue, text} = this.#initInputRanges[name]
            const domInput = this.#inputRanges[name]
            domInput.value = initValue
            domInput.oninput()
        }
        for (const name in this.#initInputCheckboxes) {
            const {initValue, text} = this.#initInputCheckboxes[name]
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
    ///   The coordinates of the draggable points are expressed in pixels.
    ///
    async MainLoop(userfuncDraw)
    {
        while (true) {
            await new Promise(requestAnimationFrame)

            const oldWidth = this.#domCanvas.width
            const newWidth = this.#domCanvas.clientWidth
            const oldHeight = this.#domCanvas.height
            const newHeight = this.#domCanvas.clientHeight
            if (newWidth !== oldWidth || newHeight !== oldHeight)
            {
                for (const name in this.#dragPoints) {
                    const dragPoint = this.#dragPoints[name]
                    dragPoint.x *= newWidth / oldWidth
                    dragPoint.y *= newHeight / oldHeight
                }
                this.#domCanvas.width = this.#domCanvas.clientWidth
                this.#domCanvas.height = this.#domCanvas.clientHeight
            }

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

            this.#drawCtx.reset()
            this.#bInsideUserfuncDraw = true
            userfuncDraw(userVars)
            for (const name in this.#dragPoints) {
                this.#DrawDragPoint(this.#dragPoints[name], name)
            }
            this.#bInsideUserfuncDraw = false
            
            this.#mouseClicked = false
            if (!this.#mouseDown)
                this.#mouseDragPoint = null
            }    
    }

    /// ### JvGeo:DrawSegment(xA, yA, xB, yB, color, thickness)
    ///
    /// Draws a segment between the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB** (*Number*): Coordinates
    ///   of the segment's endpoints, in pixels.
    /// - **color** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawSegment(xA, yA, xB, yB, color = "#000", thickness = 2)
    {
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = thickness
        ctx.moveTo(xA, yA)
        ctx.lineTo(xB, yB)
        ctx.stroke()
    }

    /// ### JvGeo:DrawPoint(x, B, color)
    ///
    /// Draws a point at given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **x**, **y** (*Number*): Coordinates of the point, in pixels.
    /// - **color** (*String*): CSS color used to fill the point.
    ///
    DrawPoint(x, y, name, color)
    {
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.fillStyle = color
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = "#000"
        ctx.font = "bold 16px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.fillText(name, x, y - 2 * 8)
    }

    /// ### JvGeo:DrawLine(xA, yA, xB, yB, color, thickness)
    ///
    /// Draws a line passing through the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB** (*Number*): Coordinates
    ///   of the points defining the line, in pixels.
    /// - **color** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawLine(xA, yA, xB, yB, color = "#000", thickness = 2)
    {
        const xAB = xB - xA, yAB = yB - yA
        const lenDiagonal = Math.hypot(this.#domCanvas.clientWidth, this.#domCanvas.clientHeight)
        const scale = lenDiagonal / Math.hypot(xAB, yAB)
        this.DrawSegment(xA - xAB * scale, yA - yAB * scale, xA + xAB * scale, yA + yAB * scale, color, thickness)
    }

    /// ### JvGeo:DrawTriangle(xA, yA, xB, yB, xC, yC, colorFG, colorBG, thickness)
    ///
    /// Draws the triangle defined by the given coordinates. This function must
    /// be called from inside the `userfuncDraw` given to `MainLoop()`.
    ///
    /// - **xA**, **yA**, **xB**, **yB**, **xC**, **yC** (*Number*): Coordinates
    ///   of the points defining the triangle, in pixels.
    /// - **colorFG** (*String* = `"#000"`): CSS color to be used for the stroke.
    /// - **colorBG** (*String* = `"#0004"`): CSS color to be used for the filling.
    /// - **thickness** (*Number* = `2`): Thickness, in pixels.
    ///
    DrawTriangle(xA, yA, xB, yB, xC, yC, colorFG = "#000", colorBG = "#0004", thickness = 2)
    {
        console.assert(this.#bInsideUserfuncDraw)
        const ctx = this.#drawCtx
        ctx.beginPath()
        ctx.fillStyle = colorBG
        ctx.strokeStyle = colorFG
        ctx.lineWidth = thickness
        ctx.moveTo(xA, yA)
        ctx.lineTo(xB, yB)
        ctx.lineTo(xC, yC)
        ctx.lineTo(xA, yA)
        ctx.fill()
        ctx.stroke()
    }

    #DrawDragPoint(pt, name) {
        let bHover = false
        if (this.#mousePos !== null) {
            bHover = Math.hypot(pt.x - this.#mousePos.x, pt.y - this.#mousePos.y) <= 8
            if (bHover && this.#mouseClicked) {
                this.#mouseDragPoint = name
            }
            if (this.#mouseDown && this.#mouseDragPoint === name) {
                pt.x = this.#mousePos.x
                pt.y = this.#mousePos.y
            }
        }
        this.DrawPoint(pt.x, pt.y, name, bHover ? "#88F" : "#00F")
    }
    
    /// ### JvGeo:Intersect(x1, y1, x2, y2, x3, y3, x4, y4) -> [xI, yI]
    ///
    /// Returns **[xI, yI]** the coordinates of the intersection point betwen two lines,
    /// or **[NaN, NaN]** if the two lines never cross (ie. they are parallel).
    ///
    /// - **x1**, **y1**, **x2**, **y2**, (*Number*): Coordinates of the points
    ///   defining the first line, in pixels.
    /// - **x3**, **y3**, **x4**, **y4**, (*Number*): Coordinates of the points
    ///   defining the second line, in pixels.
    ///
    Intersect(x1, y1, x2, y2, x3, y3, x4, y4)
    {
        // Solving
        // x1 + alpha * (x2 - x1) = x3 + beta * (x4 - x3)
        // y1 + alpha * (y2 - y1) = y3 + beta * (y4 - y3)
        const num = (y4 - y3) * (x3 - x1) - (x4 - x3) * (y3 - y1)
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
        const alpha = num / denom
        return [ x1 + alpha * (x2 - x1) , y1 + alpha * (y2 - y1) ]
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
    NormalizedParallelVec(x, y, len=1.0)
    {
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
    NormalizedPerpendicularVec(x, y, len=1.0)
    {
        const scale = len / Math.hypot(x, y)
        return [y * scale, x * -scale]
    }
}   

document.addEventListener("DOMContentLoaded", () => {
    document.dispatchEvent(new CustomEvent("jvgeo-ready", { detail: { JvGeo } }))
})