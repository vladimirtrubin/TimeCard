{ pkgs }: {
    deps = [
        pkgs.nodejs-18_x
        pkgs.nodePackages.npm
        pkgs.yarn
        pkgs.replitPackages.jest
    ];
    env = {
        LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.libuuid
        ];
    };
} 