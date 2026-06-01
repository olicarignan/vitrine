import { useEffect, useState } from "react";
import { Slider } from "./components/Slider.jsx";
import { fetchRandomProjects } from "./demo-data.js";

export default function App() {
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchRandomProjects(6).then((items) => {
      if (!cancelled) setProjects(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <header className="page__header">
        <h1>Selected Work</h1>
        <p>Drag or scroll the panels. Click the centered one to zoom in.</p>
      </header>
      {projects ? (
        <Slider items={projects} />
      ) : (
        <p className="page__status">Loading artworks from The Met…</p>
      )}
    </main>
  );
}
