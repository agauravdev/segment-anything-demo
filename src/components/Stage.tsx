// This source code is licensed under the license found in the
// LICENSE file in the root directory of this source tree.

import React, { useContext } from "react";
import Tool from "./Tool";
import { modelInputProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

import OpenSeadragon from "openseadragon";

const Stage = () => {
  const {
    clicks: [, setClicks],
    image: [image],
  } = useContext(AppContext)!;

  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null);
  const getClick = (x: number, y: number): modelInputProps => {
    const clickType = 1;
    return { x, y, clickType };
  };

  // Get mouse position and scale the (x, y) coordinates back to the natural
  // scale of the image. Update the state of clicks with setClicks to trigger
  // the ONNX model to run and generate a new mask via a useEffect in App.tsx

  const handleMouseClick = (
    viewerRef: React.RefObject<OpenSeadragon.Viewer>,
    e: any,
    click_target: string = ''
  ) => {
    let el = e.target;
    if (el) {
      let x, y;
      // Check if the click was on the OpenSeadragon viewer
      if (click_target === 'osd' && viewerRef.current) {
        console.log("click on osd");
        // Get the click coordinates relative to the viewer
        const rect = viewerRef.current.element.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;

        // Convert the click coordinates from viewport coordinates to image coordinates
        const viewportPoint = new OpenSeadragon.Point(x, y);
        const imagePoint =
          viewerRef.current.viewport.viewportToImageCoordinates(viewportPoint);
        x = imagePoint.x;
        y = imagePoint.y;
      } else {
        console.log("click on image");
        // Handle click on the image (as before)
        const rect = el.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        console.log("x: ", x, "y: ", y);
      }

      const imageScale = image ? image.width / el.offsetWidth : 1;
      x *= imageScale;
      y *= imageScale;
      console.log("x: ", x, "y: ", y);
      const click = getClick(x, y);
      if (click) setClicks([click]);
    }
  };

  const flexCenterClasses = "flex items-center justify-center";
  return (
    <div className={`${flexCenterClasses} w-full h-full`}>
      <div className={`${flexCenterClasses} relative w-[90%] h-[90%]`}>
        <Tool handleMouseClick={handleMouseClick} viewerRef={viewerRef} />
      </div>
    </div>
  );
};

export default Stage;
