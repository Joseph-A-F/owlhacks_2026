export default {
    main: {
        build: {
            lib: {
                entry: 'main.js'
            }
        }
    },
    renderer: {
        root: 'renderer',
        build: {
            rollupOptions: {
                input: 'renderer/index.html'
            }
        }
    }
}

