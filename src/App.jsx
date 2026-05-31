import { Slider } from "./components/Slider.jsx";
import { projects } from "./demo-data.js";

export default function App() {
  return (
    <main className="page">
      <header className="page__header">
        <h1>Selected Work</h1>
        <p>Drag or scroll the panels. Click the centered one to zoom in.</p>
      </header>
      <Slider items={projects} />
    </main>
  );
}
