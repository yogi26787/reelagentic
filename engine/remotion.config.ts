import {Config} from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// ANGLE gives headless Chrome a working WebGL on macOS and Windows (needed by the 3D effects)
Config.setChromiumOpenGlRenderer("angle");
