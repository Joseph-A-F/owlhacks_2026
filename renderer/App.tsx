import { useEffect } from 'react';
import Board from './Board';
import Sidebar from './Sidebar';
import { useStore } from './store';
import TopBar from './TopBar';

export default function App() {
  const root = useStore(state => state.root);
  const currentItems = useStore(state => state.currentItems);
  const saveLayout = useStore(state => state.saveLayout);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLayout();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveLayout]);

  return (
    <>
      <img id="bgGif" src="assets/ocean-caustics.gif" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      <div className="app">
        <Sidebar>
          <main className="main">
            <TopBar />
            <Board />
          </main>
        </Sidebar>
      </div>
    </>
  );
}
