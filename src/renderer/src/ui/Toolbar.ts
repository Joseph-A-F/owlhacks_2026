import { Canvas } from '../viewport/canvas';

export class Toolbar {
    constructor(private container: HTMLElement, private canvas: Canvas) {
        this.render();
    }

    private render() {
        const categories = ['Files', 'Images', 'Art', 'Misc'];
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.innerText = cat;
            if (cat === 'Images') {
                btn.classList.add('active-category');
            }
            this.container.appendChild(btn);
        });

        // Dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';

        const addBtn = document.createElement('button');
        addBtn.innerText = '+';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        };

        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'dropdown-content';

        const uploadBtn = document.createElement('button');
        uploadBtn.innerText = 'Upload';
        uploadBtn.disabled = true; // unclickable for now
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.cursor = 'not-allowed';

        const templateBtn = document.createElement('button');
        templateBtn.innerText = 'Template';
        templateBtn.onclick = async (e) => {
            e.stopPropagation();
            dropdown.classList.remove('active');
            const filename = await window.api.addFile();
            if (filename) {
                this.canvas.loadFiles();
            }
        };

        dropdownContent.appendChild(uploadBtn);
        dropdownContent.appendChild(templateBtn);

        dropdown.appendChild(addBtn);
        dropdown.appendChild(dropdownContent);

        this.container.appendChild(dropdown);

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
    }
}
