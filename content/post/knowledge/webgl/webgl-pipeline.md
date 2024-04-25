---
title: "WebGL 中的管线"
date: 2022-03-03T10:31:22+08:00
draft: false
math: true
keywords: ["WebGL"]
tags: ["WebGL"]
categories: ["knowledge"]
url: "posts/knowledge/webgl/webgl-pipeline"
summary: "这篇博客主要学习总结了 WebGL 的管线相关的知识。"
---

# Overview

![Graphics Pipeline](https://raw.githubusercontent.com/ayamir/blog-imgs/main/webgl_graphics_pipeline.jpg)

# JavaScript

JavaScript is used to write the control code of the program, which includes the following actions:

- Initialization: initialize WebGL context.
- Arrays: create arrays to hold the data of the geometry.
- Buffer objects: create buffer objects by passing the arrays as parameters.
- Shaders: create, compile and link the shaders.
- Attributes: create attributes, enable them and associate them with buffer objects.
- Uniforms: associate the uniforms.
- Transformation matrix: create transformation matrix.

# Vertex Shader

The vertex shader is executed for each vertex provided in the vertex buffer object when start the rendering process by invoking the methods `drawElements()` and `drawArrays()`.

- It calculates the position of each vertex of a primitive polygon and stores it in the varying `gl_position`

- It calculates the other attributes such as color, texture coordinates and vertices that are normally associated with a vertex.

# Primitive Assembly

Here the triangles are assembled and passed to the rasterizer.

# Resterization

The pixels in the final image of the primitive are determined.

- Culling: Initially the orientation of the polygons is determined. All those triangles with improper orientation that are not visible in view area are discarded.
- Clipping: If a triangle is partly outside the view area, then the part outside the view area is removed.

# Fragment Shader

The fragment shader gets:

- data from the vertex shader in varying variables

- primitives from the rasterization stage

then:

- calculates the color value for each pixel between the vertices
- stores the color values of every pixel in each fragment

# Fragment Operations

The fragment operations may include:

- Depth
- Color buffer blend
- Dithering

Once all the fragments are processed, a 2D image is formed and displayed on the screen.

# Frame Buffer

Frame buffer is the final destination of the rendering pipeline.

Frame buffer is a portion of graphics memory that hold the scene data.

This buffer contains details such as width and height of the surface (in pixels), color of each pixel and depth and stencil buffers.

![Fragment Operations](https://raw.githubusercontent.com/ayamir/blog-imgs/main/fragment_operations.jpg)
