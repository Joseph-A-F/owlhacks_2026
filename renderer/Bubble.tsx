import type { PointerEvent } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { FileSystemItem } from './types';

interface BubbleProps {
    item: FileSystemItem;
}

export default function Bubble({ item }: BubbleProps) {
    const zoom = useStore(state => state.zoom);
    const updateItemPosition = useStore(state => state.updateItemPosition);
    const updateItemSize = useStore(state => state.updateItemSize);
    const navigateInto = useStore(state => state.navigateInto);
    const refreshCurrentFolder = useStore(state => state.refreshCurrentFolder);

    const [imgSrc, setImgSrc] = useState<string>('');
    const [textContent, setTextContent] = useState<string>('');

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const dragStart = useRef({ x: 0, y: 0, originalX: 0, originalY: 0, originalWidth: 0, originalHeight: 0 });

    useEffect(() => {
        let mounted = true;
        if (item.type === 'image') {
            window.api.readImage(item.path).then((src: string) => {
                if (mounted) setImgSrc(src);
            });
        } else if (item.type === 'text') {
            if (item.preview) {
                setTextContent(item.preview);
            } else {
                setTextContent("(empty text file)");
            }
        }
        return () => { mounted = false; };
    }, [item]);

    const handlePointerDownCard = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || (e.target as HTMLElement).classList.contains('resize')) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            originalX: item.x || 0,
            originalY: item.y || 0,
            originalWidth: 0,
            originalHeight: 0
        };
        setIsDragging(true);
    };

    const handlePointerMoveCard = (e: PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            const dx = (e.clientX - dragStart.current.x) / zoom;
            const dy = (e.clientY - dragStart.current.y) / zoom;
            updateItemPosition(item.path, dragStart.current.originalX + dx, dragStart.current.originalY + dy);
        }
    };

    const handlePointerUpCard = (e: PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            setIsDragging(false);
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            // scheduleSave logic could be added here if needed, or rely on beforeunload/debounce
        }
    };

    const handlePointerDownResize = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const card = e.currentTarget.parentElement as HTMLElement;
        card.setPointerCapture(e.pointerId);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            originalX: 0,
            originalY: 0,
            originalWidth: item.width || 150,
            originalHeight: item.height || 150
        };
        setIsResizing(true);
    };

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const handlePointerMoveResize = (e: PointerEvent<HTMLDivElement>) => {
        if (isResizing) {
            const dx = (e.clientX - dragStart.current.x) / zoom;
            const dy = (e.clientY - dragStart.current.y) / zoom;
            updateItemSize(
                item.path,
                clamp(dragStart.current.originalWidth + dx, 90, 420),
                clamp(dragStart.current.originalHeight + dy, 90, 420)
            );
        }
    };

    const handlePointerUpResize = (e: PointerEvent<HTMLDivElement>) => {
        if (isResizing) {
            setIsResizing(false);
            const card = e.currentTarget.parentElement as HTMLElement;
            card.releasePointerCapture(e.pointerId);
        }
    };

    const handleDoubleClick = async (e: React.MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).classList.contains('resize')) return;
        if (item.type === "folder") {
            navigateInto(item);
        } else {
            await window.api.openPath(item.path);
        }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // In a real app, you might want a proper context menu component.
        // For now, we use a simple confirm dialog to replicate deletion.
        if (window.confirm(`Delete ${item.name}?`)) {
            window.api.deleteItem(item.path).then(() => {
                refreshCurrentFolder();
            }).catch((err: any) => alert(String(err)));
        }
    };

    return (
        <article
            className={`bubble ${item.type} ${isDragging ? 'dragging' : ''}`}
            title="Drag to move • drag the corner to resize • double-click to open"
            style={{ left: item.x || 0, top: item.y || 0 }}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
        >
            <div
                className={`card ${isResizing ? 'resizing' : ''}`}
                style={{ width: item.width || 150, height: item.height || 150 }}
                onPointerDown={handlePointerDownCard}
                onPointerMove={isDragging ? handlePointerMoveCard : isResizing ? handlePointerMoveResize : undefined}
                onPointerUp={isDragging ? handlePointerUpCard : isResizing ? handlePointerUpResize : undefined}
                onPointerCancel={isDragging ? handlePointerUpCard : isResizing ? handlePointerUpResize : undefined}
            >
                <div className="card-content">
                    {item.type === 'image' && imgSrc && <img src={imgSrc} alt={item.name} />}
                    {item.type === 'text' && <div className="text-preview">{textContent}</div>}
                    {item.type === 'folder' && <div className="folder-icon">📁</div>}
                    {item.type !== 'image' && item.type !== 'text' && item.type !== 'folder' && <div className="other-icon">📦</div>}
                </div>
                <div
                    className="resize"
                    title="Resize"
                    onPointerDown={handlePointerDownResize}
                />
            </div>
            <div className="name">{item.name}</div>
        </article>
    );
}

