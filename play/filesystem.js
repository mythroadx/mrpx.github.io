var Module = typeof Module !== 'undefined' ? Module : {};
(function () {
    const packageName = GetQueryString('name') || 'dsm_gm.mrp';
    if (!/^[^/\\:\0]+\.mrp$/i.test(packageName)) {
        throw new Error('Invalid MRP package name');
    }
    Module.arguments = ['--mrp', packageName];
    async function runWithFS() {
        addRunDependency('vmrp-runtime-manifest');
        try {
            const response = await fetch('./runtime/manifest.json');
            if (!response.ok) throw new Error(`Runtime manifest: HTTP ${response.status}`);
            const { files } = await response.json();
            const custom = GetQueryString('f');
            for (const file of files) {
                const path = '/' + file;
                const parent = path.substring(0, path.lastIndexOf('/')) || '/';
                const name = path.substring(path.lastIndexOf('/') + 1);
                FS.mkdirTree(parent);
                if (custom && packageName !== 'dsm_gm.mrp' && name === packageName) continue;
                if (custom && name === 'dsm_gm.mrp') {
                    FS.createPreloadedFile(parent, packageName, custom, true, true);
                } else {
                    FS.createPreloadedFile(parent, name, './runtime/' + file, true, true);
                }
            }
        } catch (error) {
            abort(`Unable to preload runtime assets: ${error.message}`);
        } finally {
            removeRunDependency('vmrp-runtime-manifest');
        }
    }

    if (!Module['preRun']) Module['preRun'] = [];
    Module["preRun"].push(runWithFS);
})();
