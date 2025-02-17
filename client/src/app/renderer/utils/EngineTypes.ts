import { mat4, mat3 } from 'gl-matrix';

export enum AttribType {
  Float = window.WebGL2RenderingContext && WebGL2RenderingContext['FLOAT'],
  UByte = window.WebGL2RenderingContext &&
    WebGL2RenderingContext['UNSIGNED_BYTE'],
}

export enum DrawMode {
  Triangles = window.WebGL2RenderingContext &&
    WebGL2RenderingContext['TRIANGLES'],
  Lines = window.WebGL2RenderingContext && WebGL2RenderingContext['LINES'],
  Points = window.WebGL2RenderingContext && WebGL2RenderingContext['POINTS'],
}

export type AttribProps = {
  dim: number;
  type: AttribType; // gl.FLOAT, etc
  normalize: boolean;
  name: string;
};

export enum UniformType {
  Mat4,
  Mat3,
  UByte,
  Float,
  Texture,
}

export type UniformJSType = mat4 | mat3 | number;

export type UniformProps = {
  name: string;
  type: UniformType;
};

export type RGBVec = [number, number, number];

export type RGBAVec = [number, number, number, number];

export type Translation = {
  x: number;
  y: number;
};

export type Scaling = {
  x: number;
  y: number;
};
export type HSLVec = [number, number, number];

export enum TextAlign {
  Left = 0,
  Center = 0.5,
  Right = 1,
}

export enum TextAnchor {
  Top = 0,
  Middle = 0.5,
  Bottom = 1,
}

export enum RenderZIndex {
  Background = 0,
  Voyages = -1,
  Planets = -10,
  Text = -11,
  UI = -12,

  DEFAULT = -98,
  MAX = -99,
}
