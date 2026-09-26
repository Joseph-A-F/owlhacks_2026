import { Node } from './nodes';
import { DragDrop } from './dragDrop';

export class Canvas {
    public nodes: Node[] = [];
    public plane: HTMLElement;
    
    public panX = 0;
    public panY = 0;
    public zoom = 1;

    private isPanning = false;
    private startPanX = 0;
    private startPanY = 0;

    constructor(public container: HTMLElement) {
        this.plane = document.getElementById('canvas-plane')!;
        new DragDrop(this);
        this.setupEvents();
    }

    private setupEvents() {
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target === this.plane) {
                this.isPanning = true;
                this.startPanX = e.clientX - this.panX;
                this.startPanY = e.clientY - this.panY;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startPanX;
                this.panY = e.clientY - this.startPanY;
                this.updateTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
        });

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomAmount = -e.deltaY * 0.001;
            const newZoom = Math.min(Math.max(0.1, this.zoom + zoomAmount), 5);
            
            // Zoom towards mouse pointer
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
            
            this.updateTransform();
        });
    }

    private updateTransform() {
        this.plane.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    async loadFiles() {
        const files = await window.api.getFiles();
        
        // Simple diffing logic to only add new files
        const currentFileNames = new Set(this.nodes.map(n => n.fileData.name));
        
        for (const file of files) {
            if (!currentFileNames.has(file.name)) {
                const node = new Node(file, this.plane);
                this.nodes.push(node);
            }
        }
    }

    async removeNode(node: Node) {
        await window.api.deleteFile(node.fileData.name);
        node.destroy();
        this.nodes = this.nodes.filter(n => n !== node);
    }
}
