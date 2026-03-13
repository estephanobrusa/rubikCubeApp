// Tipos globales para el proyecto RubikCube

// Ejemplo: tipo para un cubito
export type FaceColors = {
  right?: string;
  left?: string;
  top?: string;
  bottom?: string;
  front?: string;
  back?: string;
};

export type Cubie = {
  id: string;
  position: [number, number, number];
  faceColors: FaceColors;
};
