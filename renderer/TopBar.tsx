import React from 'react';
import { useStore } from './store';

export default function TopBar() {
    const stack = useStore(state => state.stack);
    const navigateTo = useStore(state => state.navigateTo);

    return (
        <header className="topbar">
            <div className="breadcrumbs">
                {stack.map((entry, index) => (
                    <React.Fragment key={entry.path}>
                        <button
                            className={`crumb ${index === stack.length - 1 ? 'active' : ''}`}
                            onClick={() => navigateTo(index)}
                        >
                            {index === 0 ? "⌂ Home" : entry.name}
                        </button>
                        {index < stack.length - 1 && <span className="slash"> / </span>}
                    </React.Fragment>
                ))}
            </div>
            <div className="drop-hint">Drop files anywhere</div>
        </header>
    );
}

