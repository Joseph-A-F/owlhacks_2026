import type { DragEvent, PointerEvent } from 'react';
import React, { useState } from 'react';
import Bubble from './Bubble';
import { useStore } from './store';

export default function Board() {
  const root = useStore(state => state.root);
  const currentItems = useStore(state => state.currentItems);
  const panX = useStore(state => state.panX);
  const panY = useStore(state => state.panY);
  const zoom = useStore(state => state.zoom);
  const setPan = useStore(state => state.setPan);
  const setZoom = useStore(state => state.setZoom);
  const openRoot = useStore(state => state.openRoot);
  const refreshCurrentFolder = useStore(state => state.refreshCurrentFolder);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [ripple, setRipple] = useState<{ x: number, y: number } | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey || (e.deltaZ !== undefined && Math.abs(e.deltaY) < 1)) {
      e.preventDefault();
      const oldZoom = zoom;
      const zoomFactor = Math.exp(-e.deltaY * 0.005);
      const newZoom = clamp(zoom * zoomFactor, 0.1, 5);

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - panX) * (newZoom / oldZoom);
      const newPanY = mouseY - (mouseY - panY) * (newZoom / oldZoom);

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY);
    }
  };

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("board") || target.id === "board-content" || target.closest(".empty-state") || (target.closest(".welcome") && target.tagName !== "BUTTON")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
    }
  };

  const handlePointerUpOrCancel = (e: PointerEvent<HTMLElement>) => {
    if (isPanning) {
      setIsPanning(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!root) return;

    const paths = [];
    for (const file of Array.from(e.dataTransfer.files)) {
      try {
        const filePath = window.api.getPathForFile(file);
        if (filePath) paths.push(filePath);
      } catch {
        // Ignore
      }
    }

    if (!paths.length) return;
    try {
      const { stack } = useStore.getState();
      const currentFolder = stack[stack.length - 1];
      await window.api.copyEntriesInto(currentFolder.path, paths);

      const rect = e.currentTarget.getBoundingClientRect();
      setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setRipple(null), 700);

      await refreshCurrentFolder();
    } catch (error) {
      console.error(error);
      alert(String(error));
    }
  };

  const handleChooseHome = async () => {
    const chosen = await window.api.chooseFolder();
    if (chosen) await openRoot(chosen);
  };

  const handleQuickTemplate = async () => {
    const chosen = await window.api.chooseFolder();
    if (chosen) {
      await window.api.createTemplate(chosen);
      await openRoot(chosen);
    }
  };

  return (
    <section
      className={`board ${isDragOver ? 'drag-over' : ''}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div id="board-content" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
        {!root ? (
          <div className="welcome">
            <div className="welcome-bubble">🫧</div>
            <h1>Bubble File Manager</h1>
            <p>Turn your folders into a visual workspace.</p>
            <button onClick={handleChooseHome}>Choose a folder to begin</button>
            <button onClick={handleQuickTemplate}>Create a sample template</button>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="empty-state">
            <div>🫧</div><strong>Nothing here yet</strong><span>Drop files here or right-click to create a folder.</span>
          </div>
        ) : (
          currentItems.map(item => <Bubble key={item.path} item={item} />)
        )}
      </div>
      {ripple && (
        <div className="drop-ripple" style={{ left: ripple.x, top: ripple.y }} />
      )}
    </section>
  );
}
