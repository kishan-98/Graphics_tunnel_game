// Game global variables

var level = 1;
var max_level = 2;
var speed_level = [0, 3, 5];
var pause = 0;
var move = 1;
var quit = 0;
var toggleColour = 0; //0 for keep it as it is, 1 for toggle
var colour = 0; //0 for original, 1 for shader
var frames = 0;
var level_frames = 1200;
var shakey_frames = 120;
var score = 0;
var game_over = 0;
var amplitude = 0.007;
var current_rotation = 0;

// Shapes global variables

var radius_object = 1;
var count_shapes = 15;
var shapes_offset = 5*radius_object;
var count_obstacles = 2;
var count_type_obstacles = 2;

// Shader global variables

var ambient_factor = 5;
var source_ambient_color = [0.2, 0.2, 0.2];
var source_diffuse_color = [1.0, 1.0, 1.0];
var source_specular_color = [1.0, 1.0, 1.0];
var source_rotation = 0;
var source_direction = [0.0, 0*0.5*radius_object*Math.cos(source_rotation), -radius_object];
var shaderProgram;
var programInfo;

// [1.0,  0.0,  0.0,  1.0],    // Right face: red
// [0.0,  0.0,  0.0,  1.0],    // Top Right face: black
// [0.0,  0.0,  1.0,  1.0],    // Top face: blue
// [0.0,  0.0,  0.0,  1.0],    // Top Left Right face: black
// [1.0,  0.0,  0.0,  1.0],    // Left face: red
// [0.0,  0.0,  0.0,  1.0],    // Bottom Left face: black
// [0.0,  1.0,  0.0,  1.0],    // Bottom face: green
// [0.0,  0.0,  0.0,  1.0],    // Bottom Right face: black

// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Right face: white
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Top Right face: black
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Top face: white
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Top Left Right face: black
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Left face: white
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Bottom Left face: black
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Bottom face: white
// [Math.random(),  Math.random(),  Math.random(),  1.0],    // Bottom Right face: black

// Vertex shader program

const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec4 aVertexColor;
  attribute vec3 aNormal;

  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform vec3 uSourceAmbientColor;
  uniform vec3 uSourceDiffuseColor;
  uniform vec3 uSourceSpecularColor;
  uniform vec3 uSourceDirection;

  varying lowp vec4 vColor;
  varying lowp vec3 vNormal;
  varying lowp vec3 vView;
  varying lowp vec3 sAColor;
  varying lowp vec3 sDColor;
  varying lowp vec3 sSColor;
  varying lowp vec3 sDirection;

  void main(void) {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;;
    vColor = aVertexColor;
    vNormal = vec3(uModelMatrix * vec4(aNormal, 0.0));
    vView = vec3(uViewMatrix * uModelMatrix * aVertexPosition);
    sAColor = uSourceAmbientColor;
    sDColor = uSourceDiffuseColor;
    sSColor = uSourceSpecularColor;
    sDirection = vec3(uModelMatrix * aVertexPosition) - uSourceDirection;
  }
`;

// Fragment shader program for lighting

const fsLSource = `
  precision lowp float;
  varying lowp vec4 vColor;
  varying lowp vec3 vNormal;
  varying lowp vec3 vView;
  varying lowp vec3 sAColor;
  varying lowp vec3 sDColor;
  varying lowp vec3 sSColor;
  varying lowp vec3 sDirection;

  void main(void) {
      vec3 source_ambient_color = sAColor;
      vec3 source_diffuse_color = sDColor;
      vec3 source_specular_color = sSColor;

      vec3 mat_ambient_color = vColor.xyz;
      vec3 mat_diffuse_color = vColor.xyz;
      vec3 mat_specular_color = vColor.xyz;
      float mat_shininess = 10.0;

      vec3 I_ambient = source_ambient_color * mat_ambient_color;
      vec3 I_diffuse = source_diffuse_color * mat_diffuse_color * max(0.0, -dot(vNormal, sDirection));
      vec3 R = reflect(sDirection, vNormal);
      vec3 V = normalize(vView);
      vec3 I_specular = source_specular_color * mat_specular_color * pow(max(dot(R,V), 0.0), mat_shininess);
      vec3 I = I_ambient + I_diffuse;
      gl_FragColor = vec4(I, 1.0)*vColor;
  }
`;

// Fragment shader program without lighting

const fsSource = `
  precision lowp float;
  varying lowp vec4 vColor;
  varying lowp vec3 vNormal;
  varying lowp vec3 vView;

  void main(void) {
      gl_FragColor = vColor;
  }
`;

function create_octagon(radius){
    var neg_radius = -radius;
    return {'position'  : [0, 0, 0],
    'radius' : 1/Math.cos(Math.PI/8),
    'positions' : [
      // Right face
      radius, radius*Math.tan(Math.PI/8), radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), radius,

      // Top Right face
      radius*Math.tan(Math.PI/8), radius, radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(Math.PI/8), radius,

      // Top faces
      -radius*Math.tan(Math.PI/8), radius, radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, radius,

      // Top Left face
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      -radius*Math.tan(Math.PI/8), radius, radius,

      // Left fact
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), radius,

      // Bottom Left face
      -radius*Math.tan(Math.PI/8), -radius, radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius, -radius*Math.tan(Math.PI/8), -radius,
      -radius, -radius*Math.tan(Math.PI/8), radius,

      // Bottom faces
      radius*Math.tan(Math.PI/8), -radius, radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, radius,

      // Bottom Right face
      radius, -radius*Math.tan(Math.PI/8), radius,
      radius, -radius*Math.tan(Math.PI/8), -radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      radius*Math.tan(Math.PI/8), -radius, radius,
    ],

    'normals' : [
      // Right face
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Top Right face
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Top faces
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Top Left face
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Left fact
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Bottom Left face
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Bottom faces
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,

      // Bottom Right face
      neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
    ],

    'faceColors' : [
            [1.0,  0.0,  0.0,  1.0],    // Right face: red
            [0.0,  0.0,  0.0,  1.0],    // Top Right face: black
            [0.0,  0.0,  1.0,  1.0],    // Top face: blue
            [0.0,  0.0,  0.0,  1.0],    // Top Left Right face: black
            [1.0,  0.0,  0.0,  1.0],    // Left face: red
            [0.0,  0.0,  0.0,  1.0],    // Bottom Left face: black
            [0.0,  1.0,  0.0,  1.0],    // Bottom face: green
            [0.0,  0.0,  0.0,  1.0],    // Bottom Right face: black
    ],

    'indices' : [
      0,  1,  2,      0,  2,  3,    // right
      4,  5,  6,      4,  6,  7,    // right top
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // top left
      16, 17, 18,     16, 18, 19,   // left
      20, 21, 22,     20, 22, 23,   // bottom left
      24, 25, 26,     24, 26, 27,   // bottom
      28, 29, 30,     28, 30, 31,   // bottom right
    ],

    'numComponentsPosition' : 3,
    'numComponentsColor' : 4,
    'vertexCount' : 48,
    'rotationX' : 0,
    'rotationY' : 0,
    'rotationZ' : 0,
    'speed'     : 7*radius,
    'rotation'  : 0.05,
    'category'  : 2,}
}

function create_octagon0(radius){
    var neg_radius = -radius;
    return {'position'  : [0, 0, 0],
    'radius' : 1/Math.cos(Math.PI/8),
    'positions' : [
      // Right face
      radius, radius*Math.tan(Math.PI/8), radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), radius,

      // Top Right face
      radius*Math.tan(Math.PI/8), radius, radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(Math.PI/8), radius,

      // Top faces
      -radius*Math.tan(Math.PI/8), radius, radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, radius,

      // Top Left face
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      -radius*Math.tan(Math.PI/8), radius, radius,

      // Left fact
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), radius,

      // Bottom Left face
      -radius*Math.tan(Math.PI/8), -radius, radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius, -radius*Math.tan(Math.PI/8), -radius,
      -radius, -radius*Math.tan(Math.PI/8), radius,

      // Bottom faces
      radius*Math.tan(Math.PI/8), -radius, radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, radius,

      // Bottom Right face
      radius, -radius*Math.tan(Math.PI/8), radius,
      radius, -radius*Math.tan(Math.PI/8), -radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      radius*Math.tan(Math.PI/8), -radius, radius,
    ],

    'normals' : [
      // Right face
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Top Right face
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Top faces
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Top Left face
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Left fact
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Bottom Left face
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Bottom faces
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,

      // Bottom Right face
      neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
    ],

    'faceColors' : [
      [1.0,  1.0,  1.0,  1.0],    // Right face: white
      [0.0,  0.0,  0.0,  1.0],    // Top Right face: black
      [1.0,  1.0,  1.0,  1.0],    // Top face: white
      [0.0,  0.0,  0.0,  1.0],    // Top Left Right face: black
      [1.0,  1.0,  1.0,  1.0],    // Left face: white
      [0.0,  0.0,  0.0,  1.0],    // Bottom Left face: black
      [1.0,  1.0,  1.0,  1.0],    // Bottom face: white
      [0.0,  0.0,  0.0,  1.0],    // Bottom Right face: black
    ],

    'indices' : [
      0,  1,  2,      0,  2,  3,    // right
      4,  5,  6,      4,  6,  7,    // right top
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // top left
      16, 17, 18,     16, 18, 19,   // left
      20, 21, 22,     20, 22, 23,   // bottom left
      24, 25, 26,     24, 26, 27,   // bottom
      28, 29, 30,     28, 30, 31,   // bottom right
    ],

    'numComponentsPosition' : 3,
    'numComponentsColor' : 4,
    'vertexCount' : 48,
    'rotationX' : 0,
    'rotationY' : 0,
    'rotationZ' : 0,
    'speed'     : 7*radius,
    'rotation'  : 0.05,
    'category'  : 0,}
}

function create_octagon1(radius){
    var neg_radius = -radius;
    return {'position'  : [0, 0, 0],
    'radius' : 1/Math.cos(Math.PI/8),
    'positions' : [
      // Right face
      radius, radius*Math.tan(Math.PI/8), radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), -radius,
      radius, radius*Math.tan(-Math.PI/8), radius,

      // Top Right face
      radius*Math.tan(Math.PI/8), radius, radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius, radius*Math.tan(Math.PI/8), -radius,
      radius, radius*Math.tan(Math.PI/8), radius,

      // Top faces
      -radius*Math.tan(Math.PI/8), radius, radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, -radius,
      radius*Math.tan(Math.PI/8), radius, radius,

      // Top Left face
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius*Math.tan(Math.PI/8), radius, -radius,
      -radius*Math.tan(Math.PI/8), radius, radius,

      // Left fact
      -radius, radius*Math.tan(Math.PI/8), radius,
      -radius, radius*Math.tan(Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), -radius,
      -radius, radius*Math.tan(-Math.PI/8), radius,

      // Bottom Left face
      -radius*Math.tan(Math.PI/8), -radius, radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius, -radius*Math.tan(Math.PI/8), -radius,
      -radius, -radius*Math.tan(Math.PI/8), radius,

      // Bottom faces
      radius*Math.tan(Math.PI/8), -radius, radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, -radius,
      -radius*Math.tan(Math.PI/8), -radius, radius,

      // Bottom Right face
      radius, -radius*Math.tan(Math.PI/8), radius,
      radius, -radius*Math.tan(Math.PI/8), -radius,
      radius*Math.tan(Math.PI/8), -radius, -radius,
      radius*Math.tan(Math.PI/8), -radius, radius,
    ],

    'normals' : [
      // Right face
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Top Right face
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Top faces
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Top Left face
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), neg_radius, neg_radius,

      // Left fact
      -neg_radius, neg_radius*Math.tan(Math.PI/8), neg_radius,
      -neg_radius, neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), -neg_radius,
      -neg_radius, neg_radius*Math.tan(-Math.PI/8), neg_radius,

      // Bottom Left face
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      -neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,

      // Bottom faces
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      -neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,

      // Bottom Right face
      neg_radius, -neg_radius*Math.tan(Math.PI/8), neg_radius,
      neg_radius, -neg_radius*Math.tan(Math.PI/8), -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, -neg_radius,
      neg_radius*Math.tan(Math.PI/8), -neg_radius, neg_radius,
    ],

    'faceColors' : [
      [0.0,  0.0,  0.0,  1.0],    // Right face: white
      [1.0,  1.0,  1.0,  1.0],    // Top Right face: black
      [0.0,  0.0,  0.0,  1.0],    // Top face: white
      [1.0,  1.0,  1.0,  1.0],    // Top Left Right face: black
      [0.0,  0.0,  0.0,  1.0],    // Left face: white
      [1.0,  1.0,  1.0,  1.0],    // Bottom Left face: black
      [0.0,  0.0,  0.0,  1.0],    // Bottom face: white
      [1.0,  1.0,  1.0,  1.0],    // Bottom Right face: black
    ],

    'indices' : [
      0,  1,  2,      0,  2,  3,    // right
      4,  5,  6,      4,  6,  7,    // right top
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // top left
      16, 17, 18,     16, 18, 19,   // left
      20, 21, 22,     20, 22, 23,   // bottom left
      24, 25, 26,     24, 26, 27,   // bottom
      28, 29, 30,     28, 30, 31,   // bottom right
    ],

    'numComponentsPosition' : 3,
    'numComponentsColor' : 4,
    'vertexCount' : 48,
    'rotationX' : 0,
    'rotationY' : 0,
    'rotationZ' : 0,
    'speed'     : 7*radius,
    'rotation'  : 0.05,
    'category'  : 1,}
}

function create_cuboid(radius){
    var len = radius * Math.tan(Math.PI/8)/3, height = radius, wid = radius * Math.tan(Math.PI/8)/50;
    var type = Math.floor(Math.random()*2)*2 - 1;
    return {'position'  : [0, 0, -20*radius],
    'positions' : [
      // Right face
      len, height, wid,
      len, height, -wid,
      len, -height, -wid,
      len, -height, wid,

      // Left face
      -len, height, wid,
      -len, height, -wid,
      -len, -height, -wid,
      -len, -height, wid,

      // Top faces
      -len, height, wid,
      len, height, wid,
      len, height, -wid,
      -len, height, -wid,

      // Bottom faces
      -len, -height, wid,
      len, -height, wid,
      len, -height, -wid,
      -len, -height, -wid,

      // Front face
      -len, height, wid,
      len, height, wid,
      len, -height, wid,
      -len, -height, wid,

      // Back face
      -len, height, -wid,
      len, height, -wid,
      len, -height, -wid,
      -len, -height, -wid,
    ],

    'normals' : [
      // Right face
      len, height, wid,
      len, height, -wid,
      len, -height, -wid,
      len, -height, wid,

      // Left face
      -len, height, wid,
      -len, height, -wid,
      -len, -height, -wid,
      -len, -height, wid,

      // Top faces
      -len, height, wid,
      len, height, wid,
      len, height, -wid,
      -len, height, -wid,

      // Bottom faces
      -len, -height, wid,
      len, -height, wid,
      len, -height, -wid,
      -len, -height, -wid,

      // Front face
      -len, height, wid,
      len, height, wid,
      len, -height, wid,
      -len, -height, wid,

      // Back face
      -len, height, -wid,
      len, height, -wid,
      len, -height, -wid,
      -len, -height, -wid,
    ],

    'faceColors' : [
      [1.0,  0.0,  0.0,  1.0],    // Right face: red
      [1.0,  0.0,  0.0,  1.0],    // Left face: red
      [1.0,  0.0,  0.0,  1.0],    // Top face: red
      [1.0,  0.0,  0.0,  1.0],    // Bottom face: red
      [1.0,  0.0,  0.0,  1.0],    // Front face: red
      [1.0,  0.0,  0.0,  1.0],    // Back face: red
    ],

    'indices' : [
      0,  1,  2,      0,  2,  3,    // right
      4,  5,  6,      4,  6,  7,    // left
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // front
      20, 21, 22,     20, 22, 23,   // back
    ],

    'numComponentsPosition' : 3,
    'numComponentsColor' : 4,
    'vertexCount' : 36,
    'rotationX' : 0,
    'rotationY' : 0,
    'rotationZ' : 0,
    'speed'     : 7*radius,
    'rotation'  : type * Math.PI / 2.5 * Math.floor(Math.random() * (speed_level[level] + 1)),}
}

function create_2triangles(radius){
    var len = radius * Math.tan(Math.PI/8), height = radius, wid = radius * Math.tan(Math.PI/8)/50;
    var type = Math.floor(Math.random()*2)*2 - 1;
    return {'position'  : [0, 0, -20*radius],
    'positions' : [
      // Top triangle
      // Right face
      0, 0, wid,
      0, 0, -wid,
      len, height, -wid,
      len, height, wid,

      // Left face
      0, 0, wid,
      0, 0, -wid,
      -len, height, -wid,
      -len, height, wid,

      // Top faces
      -len, height, wid,
      len, height, wid,
      len, height, -wid,
      -len, height, -wid,

      // Front face
      -len, height, wid,
      len, height, wid,
      0, 0, wid,
      len, height, wid,

      // Back face
      -len, height, -wid,
      len, height, -wid,
      0, 0, -wid,
      len, height, -wid,

      // Bottom triangle
      // Right face
      0, 0, wid,
      0, 0, -wid,
      len, -height, -wid,
      len, -height, wid,

      // Left face
      0, 0, wid,
      0, 0, -wid,
      -len, -height, -wid,
      -len, -height, wid,

      // Top faces
      -len, -height, wid,
      len, -height, wid,
      len, -height, -wid,
      -len, -height, -wid,

      // Front face
      -len, -height, wid,
      len, -height, wid,
      0, 0, wid,
      len, -height, wid,

      // Back face
      -len, -height, -wid,
      len, -height, -wid,
      0, 0, -wid,
      len, -height, -wid,
    ],

    'normals' : [
      // Top triangle
      // Right face
      0, 0, wid,
      0, 0, -wid,
      len, height, -wid,
      len, height, wid,

      // Left face
      0, 0, wid,
      0, 0, -wid,
      -len, height, -wid,
      -len, height, wid,

      // Top faces
      -len, height, wid,
      len, height, wid,
      len, height, -wid,
      -len, height, -wid,

      // Front face
      -len, height, wid,
      len, height, wid,
      0, 0, wid,
      len, height, wid,

      // Back face
      -len, height, -wid,
      len, height, -wid,
      0, 0, -wid,
      len, height, -wid,

      // Bottom triangle
      // Right face
      0, 0, wid,
      0, 0, -wid,
      len, -height, -wid,
      len, -height, wid,

      // Left face
      0, 0, wid,
      0, 0, -wid,
      -len, -height, -wid,
      -len, -height, wid,

      // Top faces
      -len, -height, wid,
      len, -height, wid,
      len, -height, -wid,
      -len, -height, -wid,

      // Front face
      -len, -height, wid,
      len, -height, wid,
      0, 0, wid,
      len, -height, wid,

      // Back face
      -len, -height, -wid,
      len, -height, -wid,
      0, 0, -wid,
      len, -height, -wid,
    ],

    'faceColors' : [
      // Top triangle
      [1.0,  0.0,  0.0,  1.0],    // Right face: red
      [1.0,  0.0,  0.0,  1.0],    // Left face: red
      [1.0,  0.0,  0.0,  1.0],    // Top face: red
      [1.0,  0.0,  0.0,  1.0],    // Front face: red
      [1.0,  0.0,  0.0,  1.0],    // Back face: red
      // Bottom triangle
      [1.0,  0.0,  0.0,  1.0],    // Right face: red
      [1.0,  0.0,  0.0,  1.0],    // Left face: red
      [1.0,  0.0,  0.0,  1.0],    // Top face: red
      [1.0,  0.0,  0.0,  1.0],    // Front face: red
      [1.0,  0.0,  0.0,  1.0],    // Back face: red
    ],

    'indices' : [
      // Top triangle
      0,  1,  2,      0,  2,  3,    // right
      4,  5,  6,      4,  6,  7,    // left
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // front
      16, 17, 18,     16, 18, 19,   // back
      // Bottom triangle
      20, 21, 22,     20, 22, 23,   // right
      24, 25, 26,     24, 26, 27,    // left
      28, 29, 30,     28, 30, 31,   // top
      32, 33, 34,     32, 34, 35,   // front
      36, 37, 38,     36, 38, 39,   // back
    ],

    'numComponentsPosition' : 3,
    'numComponentsColor' : 4,
    'vertexCount' : 60,
    'rotationX' : 0,
    'rotationY' : 0,
    'rotationZ' : 0,
    'speed'     : 7*radius,
    'rotation'  : type * Math.PI / 2.5 * Math.floor(Math.random() * (speed_level[level] + 1)),}
}

main();

//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  changeShader(gl);

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.

  shapes = [];
  buffer_shapes = [];
  for (var i = 0; i < count_shapes; i++){
      if(i&1){
        shapes.push(create_octagon0(radius_object));
      }
      else{
        shapes.push(create_octagon1(radius_object));
      }
      shapes[i].position[2] = -2*i*radius_object - shapes_offset;
      buffer_shapes.push(initBuffers(gl, shapes[i]));
  }

  obstacles = [];
  buffer_obstacles = [];
  for (var i = 0; i < count_obstacles; i++){
      var type = Math.floor(Math.random()*count_type_obstacles);
      switch (type) {
          case 0:{
              obstacles.push(create_cuboid(radius_object));
              break;
          }
          case 1:{
              obstacles.push(create_2triangles(radius_object));
              break;
          }
          default:
              break;
      }
      obstacles[i].position[2] -= 10*(i-1)*radius_object + shapes_offset;
      obstacles[i].rotationZ = i*Math.PI/count_obstacles;
      buffer_obstacles.push(initBuffers(gl, obstacles[i]));
  }

  var then = 0;

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  var theta = 0;
  // Draw the scene repeatedly
  function shakey_screen(now) {
    // requestAnimationFrame(render);
    frames++;
    shakey_frames--;
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;
    const projectionMatrix = clearScene(gl);
    for (var i = 0; i < count_shapes; i++){
        shapes[i].position[0] = amplitude * Math.sin(2 * Math.PI * frames / 4);
        drawScene(gl, projectionMatrix, shapes[i], programInfo, buffer_shapes[i], deltaTime);
    }
    for (var i = 0; i < count_obstacles; i++){
        obstacles[i].position[0] = amplitude * Math.sin(2 * Math.PI * frames / 4);
        drawScene(gl, projectionMatrix, obstacles[i], programInfo, buffer_obstacles[i], deltaTime);
    }
    if(!quit && shakey_frames > 0){
        requestAnimationFrame(shakey_screen);
    }
  }

  // Draw the scene repeatedly
  function render(now) {
    // requestAnimationFrame(render);
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    frames++;
    if(frames % level_frames == 0){
        level = Math.min(level + 1, max_level);
    }
    print_data(deltaTime);
    // console.log("deltaTime");
    // console.log(deltaTime);
    then = now;
    refresh_tunnel(gl, shapes, buffer_shapes);
    refresh_obstacles(gl, obstacles, buffer_obstacles);
    handleKeys(shapes, obstacles);
    if(toggleColour){
        colour = 1 - colour;
        changeShader(gl);
        toggleColour = 0;
    }
    const projectionMatrix = clearScene(gl);
    for (var i = 0; i < count_shapes; i++){
        shapes[i].position[2] += move * (1 - pause) * shapes[i].speed * deltaTime;
        drawScene(gl, projectionMatrix, shapes[i], programInfo, buffer_shapes[i], deltaTime);
    }
    for (var i = 0; i < count_obstacles; i++){
        obstacles[i].position[2] += move * (1 - pause) * obstacles[i].speed * deltaTime;
        obstacles[i].rotationZ += (1 - pause) * obstacles[i].rotation * deltaTime;
        drawScene(gl, projectionMatrix, obstacles[i], programInfo, buffer_obstacles[i], deltaTime);
    }
    if(!quit && !detect_collision(shapes, obstacles)){
        requestAnimationFrame(render);
    }
    else if(!quit){
        frames = 0;
        shakey_screen(gl, shapes, buffer_shapes, obstacles, buffer_obstacles);
    }
  }
  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple three-dimensional cube.
//

function print_data(deltaTime){
    var element = document.getElementById("frames");
    element.innerHTML = "frames: " + frames.toString();
    element = document.getElementById("level");
    element.innerHTML = "level: " + level.toString();
    score = Math.round(60 * frames / 60 * 100)/100;
    element = document.getElementById("score");
    element.innerHTML = "score: " + score.toString();
    speed = Math.round(1 / deltaTime * 100)/100;
    element = document.getElementById("speed");
    element.innerHTML = "speed: " + speed.toString();
}

function detect_collision(shapes, obstacles){
    for (var i = 0; i < count_obstacles; i++){
        if(obstacles[i].position[2] > -0.5*radius_object){
            var theta = obstacles[i].rotationZ - Math.floor(obstacles[i].rotationZ / Math.PI) * Math.PI;
            var alpha = shapes[0].rotationZ - Math.floor(shapes[0].rotationZ / Math.PI) * Math.PI;
            if(-Math.PI / 8 <= theta && theta <= Math.PI / 8){
                return true;
            }
            // theta = theta*180/Math.PI;
            // alpha = alpha*180/Math.PI;
            // var element = document.getElementById("alpha");
            // element.innerHTML = "alpha: " + alpha.toString();
            // element = document.getElementById("theta");
            // element.innerHTML = "theta: " + theta.toString();
        }
    }
    return false;
}

// Dictionary that keeps the track of the status of keys
var statusKeys = {};

function handleKeyDown(event){
    statusKeys[event.keyCode] = true;
}

function handleKeyUp(event){
    if(event.keyCode == 81){
        // Q Key
        quit = 1;
    }
    else if(event.keyCode == 80){
        // P Key
        pause = 1 - pause;
    }
    else if(event.keyCode == 77){
        // M Key
        move = 1 - move;
    }
    else if(event.keyCode == 67){
        // C Key
        toggleColour = 1;
    }
    else if(event.keyCode == 74){
        // J Key
        for(var i = 0; i < count_shapes; i++){
            shapes[i].rotationZ += Math.PI;
        }
        for(var i = 0; i < count_obstacles; i++){
            obstacles[i].rotationZ += Math.PI;
        }
    }
    else if(48 <= event.keyCode && event.keyCode < 58){
        set_source_color(event.keyCode - 48);
    }
    else{
        statusKeys[event.keyCode] = false;
    }
}

function handleKeys(shapes, obstacles){
    if(!pause){
        if(statusKeys[38]){
            // Up Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].position[2] += shapes[i].speed / speed * 3;
            }
            for(var i = 0; i < count_obstacles; i++){
                obstacles[i].position[2] += obstacles[i].speed / speed * 3;
            }
        }
        if(statusKeys[40]){
            // Down Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].position[2] -= shapes[i].speed / speed * 3;
            }
            for(var i = 0; i < count_obstacles; i++){
                obstacles[i].position[2] -= obstacles[i].speed / speed * 3;
            }
        }
        if(statusKeys[37]){
            // Left Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].rotationZ += shapes[i].rotation;
            }
            for(var i = 0; i < count_obstacles; i++){
                obstacles[i].rotationZ += shapes[0].rotation;
            }
            source_rotation += shapes[0].rotation;
            // source_direction[1] = 0.5*radius_object*Math.cos(source_rotation);
        }
        if(statusKeys[39]){
            // Right Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].rotationZ -= shapes[i].rotation;
            }
            for(var i = 0; i < count_obstacles; i++){
                obstacles[i].rotationZ -= shapes[0].rotation;
            }
            source_rotation -= shapes[0].rotation;
            // source_direction[1] = 0.5*radius_object*Math.cos(source_rotation);
        }
        // if(statusKeys[32]){
        //     // Space Key
        //     for(var i = 0; i < count_shapes; i++){
        //         shapes[i].rotationZ += Math.PI;
        //     }
        //     for(var i = 0; i < count_obstacles; i++){
        //         obstacles[i].rotationZ += Math.PI;
        //     }
        // }
        if(statusKeys[87]){
            // W Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].rotationX -= shapes[i].rotation;
                shapes[i].position[2] -= 0.1;
            }
            // for(var i = 0; i < count_obstacles; i++){
            //     obstacles[i].rotationX -= obstacles[i].rotation;
            //     obstacles[i].position[2] -= 0.1;
            // }
        }
        if(statusKeys[83]){
            // S Key
            for(var i = 0; i < count_shapes; i++){
                shapes[i].rotationX += shapes[i].rotation;
                shapes[i].position[2] += 0.1;
            }
            // for(var i = 0; i < count_obstacles; i++){
            //     obstacles[i].rotationX += obstacles[i].rotation;
            //     obstacles[i].position[2] += 0.1;
            // }
        }
    }
}

function set_source_color(key){
    if(0 <= key && key < 8){
        source_diffuse_color = [(key&4)*0.25, (key&2)*0.5, (key&1)*1.0];
        source_ambient_color = [source_diffuse_color[0] / ambient_factor, source_diffuse_color[1] / ambient_factor, source_diffuse_color[2] / ambient_factor];
    }
    else if(key == 8 || key == 9){
        source_diffuse_color = [Math.random(), Math.random(), Math.random()];
        source_ambient_color = [source_diffuse_color[0] / ambient_factor, source_diffuse_color[1] / ambient_factor, source_diffuse_color[2] / ambient_factor];
    }
    console.log(source_diffuse_color);
    console.log(source_ambient_color);
}

function refresh_tunnel(gl, shapes, buffers){
    if(shapes.length && shapes[0].position[2] > 2*shapes_offset){
        shapes.shift();
        buffers.shift();
        count_shapes--;
        // if(shapes[count_shapes-1].category){
        //     shapes.push(create_octagon0());
        // }
        // else{
        //     shapes.push(create_octagon1());
        // }
        shapes.push(create_octagon(radius_object));
        count_shapes++;
        shapes[count_shapes - 1].position[2] = shapes[count_shapes - 2].position[2] - 2*radius_object;
        shapes[count_shapes - 1].rotationX = shapes[count_shapes - 2].rotationX;
        shapes[count_shapes - 1].rotationY = shapes[count_shapes - 2].rotationY;
        shapes[count_shapes - 1].rotationZ = shapes[count_shapes - 2].rotationZ;
        buffers.push(initBuffers(gl, shapes[count_shapes - 1]));
    }
}

function refresh_obstacles(gl, obstacles, buffer_obstacles){
    if((obstacles.length > 0 && obstacles[0].position[2] > 1*radius_object)){
        obstacles.shift();
        buffer_obstacles.shift();
        count_obstacles--;
        var type = Math.floor(Math.random()*(count_type_obstacles+1));
        // type = count_type_obstacles;
        // console.log("type");
        // console.log(type);
        switch (type) {
            case 0:{
                obstacles.push(create_cuboid(radius_object));
                count_obstacles++;
                obstacles[count_obstacles - 1].rotationZ = Math.random()*Math.PI;
                buffer_obstacles.push(initBuffers(gl, obstacles[count_obstacles - 1]));
                break;
            }
            case 1:{
                obstacles.push(create_2triangles(radius_object));
                count_obstacles++;
                obstacles[count_obstacles - 1].rotationZ = Math.random()*Math.PI;
                buffer_obstacles.push(initBuffers(gl, obstacles[count_obstacles - 1]));
                break;
            }
            default:
                break;
        }
    }
    else if(obstacles.length == 0){
        var type = Math.floor(Math.random()*count_type_obstacles);
        // type = count_type_obstacles;
        // console.log("type0");
        // console.log(type);
        switch (type) {
            case 0:{
                obstacles.push(create_cuboid(radius_object));
                count_obstacles++;
                obstacles[count_obstacles - 1].rotationZ = Math.random()*Math.PI;
                buffer_obstacles.push(initBuffers(gl, obstacles[count_obstacles - 1]));
                break;
            }
            case 1:{
                obstacles.push(create_2triangles(radius_object));
                count_obstacles++;
                obstacles[count_obstacles - 1].rotationZ = Math.random()*Math.PI;
                buffer_obstacles.push(initBuffers(gl, obstacles[count_obstacles - 1]));
                break;
            }
            default:
                break;
        }
    }
}

function clearScene(gl){
    gl.clearColor(0.5, 0.5, 0.5, 1.0);  // Clear to gray, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
    return projectionMatrix;
}

function initBuffers(gl, shape) {

  // Create a buffer for the cube's vertex positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  const positions = shape.positions;

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a buffer for the cube's normal positions.

  const normalBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

  const normals = shape.normals;

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  // Now set up the colors for the faces. We'll use solid colors
  // for each face.

  const faceColors = shape.faceColors;

  // Convert the array of colors into a table for all the vertices.

  var colors = [];

  for (var j = 0; j < faceColors.length; ++j) {
    const c = faceColors[j];

    // Repeat each color numComponentsColor times for the numComponentsColor vertices of the face
    for (var i = 0; i < shape.numComponentsColor; ++i) {
        colors = colors.concat(c);
    }
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex arrays for each face's vertices.

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = shape.indices;

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
    normal: normalBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, projectionMatrix, shape, programInfo, buffers, deltaTime) {
  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelMatrix = mat4.create();

  // var camera_position = Vec3(0.0, 0.0, 0.0);
  // var camera_target = Vec3(0.0, 0.0, 1.0);
  // var camera_up = Vec3(0.0, 1.0, 0.0);

  const viewMatrix = mat4.create();//mat4.lookAt(camera_position, camera_target, camera_up);

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelMatrix,     // destination matrix
                 modelMatrix,     // matrix to translate
                 shape.position);  // amount to translate
  mat4.rotate(modelMatrix,  // destination matrix
              modelMatrix,  // matrix to rotate
              shape.rotationX,     // amount to rotate in radians
              [1, 0, 0]);       // axis to rotate around (X)
  mat4.rotate(modelMatrix,  // destination matrix
              modelMatrix,  // matrix to rotate
              shape.rotationY,// amount to rotate in radians
              [0, 1, 0]);       // axis to rotate around (Y)
  mat4.rotate(modelMatrix,  // destination matrix
              modelMatrix,  // matrix to rotate
              shape.rotationZ,// amount to rotate in radians
              [0, 0, 1]);       // axis to rotate around (Z)

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = shape.numComponentsPosition;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL how to pull out the normals from the vertex buffer
  // into the vertexNormal attribute.
  {
    const numComponents = shape.numComponentsPosition;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexNormal);
  }

  // Tell WebGL how to pull out the colors from the color buffer
  // into the vertexColor attribute.
  {
    const numComponents = shape.numComponentsColor;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
  }

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.viewMatrix,
      false,
      viewMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      modelMatrix);
  gl.uniform3f(
      programInfo.uniformLocations.sourceAmbientColor,
      source_ambient_color[0],
      source_ambient_color[1],
      source_ambient_color[2]);
  gl.uniform3f(
      programInfo.uniformLocations.sourceDiffuseColor,
      source_diffuse_color[0],
      source_diffuse_color[1],
      source_diffuse_color[2]);
  gl.uniform3f(
      programInfo.uniformLocations.sourceSpecularColor,
      source_specular_color[0],
      source_specular_color[1],
      source_specular_color[2]);
  gl.uniform3f(
      programInfo.uniformLocations.sourceDirection,
      source_direction[0],
      source_direction[1],
      source_direction[2]);

  {
    const vertexCount = shape.vertexCount;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }

  // Update the rotation for the next draw
  // cubeRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function changeShader(gl){
    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    shaderProgram = (colour ? initShaderProgram(gl, vsSource, fsLSource) : initShaderProgram(gl, vsSource, fsSource));

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        vertexNormal: gl.getAttribLocation(shaderProgram, 'aNormal'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
        modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
        sourceAmbientColor: gl.getUniformLocation(shaderProgram, 'uSourceAmbientColor'),
        sourceDiffuseColor: gl.getUniformLocation(shaderProgram, 'uSourceDiffuseColor'),
        sourceSpecularColor: gl.getUniformLocation(shaderProgram, 'uSourceSpecularColor'),
        sourceDirection: gl.getUniformLocation(shaderProgram, 'uSourceDirection'),
      },
    };
}
