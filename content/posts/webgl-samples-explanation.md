---
title: "WebGL Samples Explanation"
date: 2022-03-03T10:31:38+08:00
draft: false
math: true
keywords: ["WebGL"]
tags: ["WebGL"]
categories: ["WebGL"]
---

# Context

1. Create an `HTML5` canvas
2. Get the canvas id
3. Obtain `WebGL` Context

The parameter `WebGLContextAttributes` is not mandatory.

|       Attributes        |                                                 Description                                                 | Default value |
| :---------------------: | :---------------------------------------------------------------------------------------------------------: | :-----------: |
|         `alpha`         |                                true: provide an alpha buffer to the canvas;                                 |     true      |
|         `depth`         |                      true: drawing buffer contains a depth buffer of at least 16 bits;                      |     true      |
|        `stencil`        |                     true: drawing buffer contains a stencil buffer of at least 8 bits;                      |     false     |
|       `antialias`       |                                 true: drawing buffer performs anti-aliasing                                 |     true      |
|  `premultipliedAlpha`   |                       true: drawing buffer contains colors with pre-multiplied alpha                        |     true      |
| `preserveDrawingBuffer` | true: buffers will not be cleared and will preserve their values until cleared or overwritten by the author |     false     |

```javascript
let canvas = document.getElementById("my_canvas");
let context = canvas.getContext("webgl", { antialias: false, stencil: true });
```

# Geometry

## Definition

A 2D or 3D model drawn using vertices is call a `mesh`.

Each facet in a mesh is called a polygon and a polygon is made of 3 or more vertices.

```javascript
// create a 2D triangle which lies on the coordinates {(-5, -5), (5, -5), (5, 5)}
let vertices = [
    -0.5, -0.5   // Vertex 0
    0.5, -0.5,   // Vertex 1
    0.5, 0.5,    // Vertex 2
];
```

![Geometry](https://raw.githubusercontent.com/ayamir/blog-imgs/main/geometry.jpg)

Similarly, we can create an array for the indices follow the sequence.

```javascript
let indices = [0, 1, 2];
```

-   `drawArrays()`: pass the vertices of the primitive using JavaScript arrays.
-   `drawElements()`: pass both vertices and indices of the primitive using JavaScript arrays.

## Buffer Objects

A buffer object indicates a memory area allocated in GPU.

We can store data of the models corresponding to vertices, indices, color and etc.

There are 2 types of buffer objects:

-   Vertex Buffer Object(VBO): It holds the per-vertex data of the graphical model that is going to be rendered.
-   Index Buffer Object(IBO): It holds the indices of the graphical model that is going to be rendered.

After defining the required geometry and storing them in JavaScript arrays, we need to pass these arrays to the buffer objects, from where the data will be passed to the shader programs.

1. Create an empty buffer.

    ```javascript
    let vertex_buffer = gl.createBuffer();
    let index_buffer = gl.createBuffer();
    ```

2. Bind an appropriate array object to the empty buffer.

    ```javascript
    void bindBuffer(enum target, Object buffer);

    // ARRAY_BUFFER represents vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    // ELEMENT_ARRAY_BUFFER represent index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    ```

3. Pass the data (vertices/indices) to the buffer using one of the typed arrays.

    ```javascript
    void bufferData(enum target, Object data, enum usage);
    // Usage specifies how to use the buffer object data to draw shapes
    // gl.STATIC_DRAW -- Data will be specified once and used many times.
    // gl.STREAM_DRAW -- Data will be specified once and used a few times.
    // gl.DYNAMIC_DRAW -- Data will be specified repeatedly and used many times.

    // vertex buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    // index buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    ```

4. Unbind the buffer (Optional/Recommended).

    ```javascript
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    ```

# Shader

Shaders are written in ES SL which has variables of its own data types, qualifiers, built-in inputs and outputs.

## Data Types

|           Type            |            Description            |
| :-----------------------: | :-------------------------------: |
|          `void`           |            empty value            |
|          `bool`           |           true or false           |
|           `int`           |          signed integer           |
|          `float`          |          floating scalar          |
|  `vec2`, `vec3`, `vec4`   | n-component floating point vector |
| `bvec2`, `bvec3`, `bvec4` |          boolean vector           |
| `ivec2`, `ivec3`, `ivec4` |       signed integer vector       |
|  `mat2`, `mat3`, `mat4`   |    2x2, 3x3, 4x4 float matrix     |
|        `sampler2D`        |        access a 2D texture        |
|       `samplerCube`       |    access cube mapped texture     |

## Qualifiers

|  Qualifier  |                                                                                                         Description                                                                                                          |
| :---------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| `attribute` |                                            acts as a link between a vertex shader and OpenGL ES for per-vertex data. Its value changes for every execution of the vertex shader.                                             |
|  `uniform`  |                        links shader programs and the WebGL application. Its value is `read-only`. It can be used for to declare a variable with any basic data types: `uniform vec4 lightPosition;`.                         |
|  `varying`  | forms a link between a vertex shader and fragment shader for interpolated data. It can be used with the following data types: `float`, `vec2`, `vec3`, `vec4`, `mat2`, `mat3`, `mat4`, `arrays` like: `varying vec3 normal;` |

## Vertex Shader

Vertex shader is a program code, which is called on every vertex. Programmer have to define `attribute` in code of vertex shader to handle data. The `attribute` point to a VBO written in JavaScript.

### Predefined Variables

OpenGL ES SL provides the following predefined variables for every vertex shader

|          Variables           |           Description            |
| :--------------------------: | :------------------------------: |
|   `highp vec4 gl_Position`   | Holds the position of the vertex |
| `mediump float gl_PointSize` | Holds the transformed point size |

```glsl
attribute vec2 coordinates;

void main(void) {
    gl_Position = vec4(coordinates, 0.0, 1.0);
}
```

`gl_Position` is the predefined variable which is available only in the vertex shader. It contains the vertex position. As vertex shader is a per-vertex operation, the `gl_Position` value is calculated for each vertex.

## Fragment Shader

A mesh is formed by multiple triangles, and the surface of each triangle is known as a fragment.

Fragment shader is the code that runs on every pixel on each fragment. This is written to calculate and fill the color on individual pixels.

### Predefined Variables

|           Variables            |                         Description                         |
| :----------------------------: | :---------------------------------------------------------: |
|  `mediump vec4 gl_FragCoord;`  |     Holds the fragment position within the frame buffer     |
|     `bool gl_FrontFacing;`     | Holds the fragment that belongs to a front-facing primitive |
| `mediump vec2 gl_PointCoord;`  |         Holds the fragment position within a point          |
|  `mediump vec4 gp_FragColor;`  |     Holds the output fragment color value of the shader     |
| `mediump vec4 gl_FragData[n];` |       Holds the fragment color for color attachment n       |

```glsl
void main(void) {
    gl_FragColor = vec4(0, 0.8, 0, 1);
}
```

## Store and Compiling

```javascript
let vertCode =
    "attribute vec2 coordinates;" +
    "void main(void) {" +
    "gl_Postion = vec4(coordinates, 0.0, 1.0);" +
    "}";

let fragCode = "void main(void) {" + "gl_FragColor = vec4(0, 0.8, 0, 1);" + "}";
```

Compilation involves following 3 steps

-   Creating the shader object
-   Attaching the source code to the created shader object
-   Compiling the program

```javascript
let vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);
```

Same process for fragment shader

```javascript
let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);
```

## Combined Program

-   Create a program object
-   Attach both the shaders
-   Link both the shaders
-   Use the program

```javascript
let shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);
```

# Associating Attributes & Buffer Objects

-   Get the attribute location
-   Point the attributes to a vertex buffer object
-   Enable the attribute

```javascript
// ulong getAttribLocation(Object program, string name)
let coordinatesVar = gl.getAttribLocation(shaderProgram, "coordinates");

// void vertexAttribPointer(location, int size, enum type, bool normalized, long stride, long offset)
gl.vertexAttribPointer(coordinatesVar, 3, gl.FLOAT, false, 0, 0);

gl.enableVertexAttribArray(coordinatesVar);
```

# Drawing a Model

## drawArrays()

```glsl
void drawArrays(enum mode, int first, long count);
```

-   mode: `gl.POINTS`, `gl.LINE_STRIP`, `gl.LINE_LOOP`, `gl.LINES`, `gl.TRIANGLE_STRIP`, `gl.TRANGLE_FAN`, `gl.TRIANGLES`.
-   first: specified the starting element in the enabled arrays. (Non-negative)
-   count: specifies the number of elements to be rendered.

`WebGL` will create the geometry in the order in which the vertex coordinates while rendering the shapes.

draw a triangle:

```javascript
let vertices = [-0.5, -0.5, -0.25, 0.5, 0.0, -0.5];
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

![Triangle](https://raw.githubusercontent.com/ayamir/blog-imgs/main/triangle.jpg)

draw two contiguous triangles:

```javascript
let vertices = [
    -0.5, -0.5, -0.25, 0.5, 0.0, -0.5, 0.0, -0.5, 0.25, 0.5, 0.5, -0.5
];
gl.drawArrays(gl.TRIANGLES, 0, 6);
```

![Triangle 1](https://raw.githubusercontent.com/ayamir/blog-imgs/main/triangles_1.jpg)

## drawElements()

```glsl
void drawElements(enum mode, long count, enum type, long offset);
```

-   mode: same as `drawArrays()`;
-   count: same as `drawArrays()`;
-   type: specifies the data type of the indices which must be `UNSIGNED_BYTE` or `UNSIGNED_SHORT`;
-   offset: specifies the starting point for rendering, usually the first element (0);

If use `drawElements()` to draw a model, then index buffer object should also be created along with the vertex buffer object. The vertex data will be processed once and used as many time as mentioned in the indices.

draw a triangle:

```javascript
let vertices = [-0.5, -0.5, 0.0, -0.25, 0.5, 0.0, 0.0, -0.5, 0.0];
let indices = [0, 1, 2];

gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
```

![Triangle](https://raw.githubusercontent.com/ayamir/blog-imgs/main/triangle-16462062700213.jpg)

draw two contagious triangles:

```javascript
let vertices = [
    -0.5, -0.5, 0.0, -0.25, 0.5, 0.0, 0.0, -0.5, 0.0, 0.25, 0.5, 0.0, 0.5, -0.5,
    0.0
];
let indices = [0, 1, 2, 2, 3, 4];

gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
```

![Triangle 1](https://raw.githubusercontent.com/ayamir/blog-imgs/main/triangles_1-16462064099025.jpg)
