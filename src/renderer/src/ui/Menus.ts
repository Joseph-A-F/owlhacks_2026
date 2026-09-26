import { Canvas } from '../viewport/canvas';
import { Node } from '../viewport/nodes';

export class Menus {
    private menuElement: HTMLElement;
    private targetNode: Node | null = null;

    constructor(private canvas: Canvas) {
        this.menuElement = document.getElementById('context-menu')!;
        this.setupEvents();
    }

    private setupEvents() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            const target = e.target as HTMLElement;
            const nodeElement = target.closest('.node') as HTMLElement;
            if (nodeElement) {
                this.targetNode = this.canvas.nodes.find(n => n.element === nodeElement) || null;

                this.menuElement.style.display = 'flex';
                this.menuElement.style.left = `${e.clientX}px`;
                this.menuElement.style.top = `${e.clientY}px`;
            } else {
                this.hideMenu();
            }
        });

        document.addEventListener('click', () => this.hideMenu());

        document.getElementById('menu-delete')!.onclick = () => {
            if (this.targetNode) {
                this.canvas.removeNode(this.targetNode);
                this.hideMenu();
            }
        };

        document.getElementById('menu-info')!.onclick = () => {
            if (this.targetNode) {
                alert(`File info for node at ${this.targetNode.x}, ${this.targetNode.y}`);
                this.hideMenu();
            }
        };
    }

    private hideMenu() {
        this.menuElement.style.display = 'none';
        this.targetNode = null;
    }
}
