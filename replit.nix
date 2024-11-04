<<<<<<< HEAD
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
=======
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
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
} 