declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
}
  
declare module '*.glsl' {
    const value: string;
    export default value;
}
  
declare module '*.vert' {
    const value: string;
    export default value;
}
  
declare module '*.frag' {
    const value: string;
    export default value;
}
  