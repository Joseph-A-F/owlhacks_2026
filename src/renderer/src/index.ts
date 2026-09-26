import { Chrome } from './ui/Chrome';
import { Menus } from './ui/Menus';
import { Toolbar } from './ui/Toolbar';
import { Canvas } from './viewport/canvas';

document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.getElementById('canvas-container')!;
    const canvas = new Canvas(canvasContainer);

    const toolbarContainer = document.getElementById('sidebar')!;
    new Toolbar(toolbarContainer, canvas);

    const chromeContainer = document.getElementById('chrome')!;
    new Chrome(chromeContainer);

    new Menus(canvas);

    // Load existing files
    canvas.loadFiles();
});
