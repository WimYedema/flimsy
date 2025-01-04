import { default as displaySpec } from "./display.json";
import { default as particleSpec } from "./particle.json";
import { Scene } from "./scene";

export const scene = new Scene(displaySpec, particleSpec);
