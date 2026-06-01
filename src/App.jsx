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
      <div className="grid">
        <div className="subgrid">
          <header className="page__header">
            <h1>Gallery</h1>
            <p>Drag, scroll or arrow keys to navigate. Click to open lightbox.</p>
          </header>
        </div>
      </div>
      {projects ? (
        <Slider items={projects} />
      ) : (
        <div className="grid">
          <div className="subgrid">
            <p className="page__status">Loading artworks from The Met…</p>
          </div>
        </div>
      )}
    </main>
  );
}
