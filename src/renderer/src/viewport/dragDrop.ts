import { Canvas } from './canvas';
import { Node } from './nodes';

export class DragDrop {
    private isDragging = false;
    private targetNode: Node | null = null;
    private offsetX = 0;
    private offsetY = 0;

    constructor(private canvas: Canvas) {
        this.setupEvents();
    }

    private setupEvents() {
        document.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            const target = e.target as HTMLElement;
            
            const nodeElement = target.closest('.node') as HTMLElement;
            if (nodeElement) {
                this.targetNode = this.canvas.nodes.find(n => n.element === nodeElement) || null;
                if (this.targetNode) {
                    this.isDragging = true;
                    // Calculate offset taking zoom into account
                    const rect = nodeElement.getBoundingClientRect();
                    this.offsetX = (e.clientX - rect.left) / this.canvas.zoom;
                    this.offsetY = (e.clientY - rect.top) / this.canvas.zoom;
                    e.stopPropagation();
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.targetNode) {
                // Adjust position by subtracting the canvas pan offset and dividing by zoom
                const containerRect = this.canvas.container.getBoundingClientRect();
                const x = (e.clientX - containerRect.left - this.canvas.panX) / this.canvas.zoom - this.offsetX;
                const y = (e.clientY - containerRect.top - this.canvas.panY) / this.canvas.zoom - this.offsetY;
                
                this.targetNode.x = x;
                this.targetNode.y = y;
                this.targetNode.updatePosition();
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.targetNode = null;
        });
    }
}
