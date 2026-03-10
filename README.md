# Rubik's Cube 3D

An interactive 3D Rubik's Cube built with React and Three.js.

> **Note:** This project is under active development and is built for learning purposes.

![Status](https://img.shields.io/badge/status-in%20development-yellow)

## About

A browser-based 3D Rubik's Cube that you can manipulate with keyboard controls. The cube features smooth rotation animations, WCA-standard face colors, and full orbit camera controls.

Built as a hands-on project to learn **React Three Fiber**, **Three.js**, and 3D math concepts like quaternion rotations and coordinate systems.

## Tech Stack

- **React 19** — UI framework
- **Three.js** — 3D rendering engine
- **React Three Fiber** — React renderer for Three.js
- **Drei** — Useful helpers for R3F (OrbitControls, etc.)
- **Vite** — Build tool and dev server

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| `R` | Rotate **Right** face clockwise |
| `L` | Rotate **Left** face clockwise |
| `U` | Rotate **Up** face clockwise |
| `D` | Rotate **Down** face clockwise |
| `F` | Rotate **Front** face clockwise |
| `B` | Rotate **Back** face clockwise |
| `Shift` + any key above | Rotate counter-clockwise |

### Mouse

- **Left drag** — Orbit camera around the cube
- **Scroll** — Zoom in / out

## Project Structure

```
src/
├── components/
│   ├── RubiksCubeScene.jsx   # Canvas, camera, lights, controls
│   └── RubiksCube.jsx        # Cube rendering and animation logic
├── utils/
│   ├── cubeState.js          # Cube state management and move logic
│   └── cubeGeometry.js       # Cubie geometry and color assignment
├── App.jsx
└── main.jsx
```

## License

MIT
# rubikCubeApp
