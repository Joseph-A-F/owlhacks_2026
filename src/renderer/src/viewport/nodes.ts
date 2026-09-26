export class Node {
    element: HTMLElement;
    x: number = 0;
    y: number = 0;

    constructor(public fileData: { name: string, path: string, url: string }, private parent: HTMLElement) {
        this.element = document.createElement('div');
        this.element.className = 'node';
        
        // Random initial position if not specified (could store in localstorage)
        this.x = Math.random() * 500;
        this.y = Math.random() * 500;
        this.updatePosition();

        this.renderContent();
        this.parent.appendChild(this.element);
    }

    private renderContent() {
        const ext = this.fileData.name.split('.').pop()?.toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
            const img = document.createElement('img');
            img.src = this.fileData.url;
            this.element.appendChild(img);
        } else if (['mp4', 'webm', 'ogg'].includes(ext || '')) {
            const video = document.createElement('video');
            video.src = this.fileData.url;
            video.controls = true;
            this.element.appendChild(video);
        } else {
            const icon = document.createElement('div');
            icon.innerText = '📄';
            icon.style.fontSize = '48px';
            this.element.appendChild(icon);
        }

        const label = document.createElement('div');
        label.className = 'filename';
        label.innerText = this.fileData.name;
        this.element.appendChild(label);
    }

    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    destroy() {
        this.element.remove();
    }
}
