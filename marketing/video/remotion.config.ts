import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// H.264 + good quality default for social/web delivery.
Config.setCodec("h264");
Config.setCrf(18);
