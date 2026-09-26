export default {
    main: {
        build: {
            lib: {
                entry: 'src/main/index.ts'
            }
        }
    },
    renderer: {
        root: 'src/renderer',
        build: {
            rollupOptions: {
                input: 'src/renderer/index.html'
            }
        }
    }
}
