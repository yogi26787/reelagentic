import React from "react";
import {Composition, Still} from "remotion";
import {Cover} from "./Cover";
import {Reel} from "./Reel";
import type {Story} from "./types";

const demo: Story = {fps: 30, width: 1080, height: 1920, duration: 3, video: "cut.mp4", moments: []};

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel as any} defaultProps={demo as any} fps={30} width={1080} height={1920} durationInFrames={90}
      calculateMetadata={({props}: any) => ({durationInFrames: Math.max(1, Math.round(props.duration * props.fps)), fps: props.fps, width: props.width, height: props.height})} />
    <Still id="Cover" component={Cover as any} defaultProps={demo as any} width={1080} height={1920} />
  </>
);
