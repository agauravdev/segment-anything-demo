import React, { useContext, useEffect, useState } from "react";
import Tool from "./Tool";
import { modelInputProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

import { OpenCvProvider } from "opencv-react-ts";
import OpenSeadragon from "openseadragon";
const Stage = () => {
  const {
    clicks: [clicks, setClicks],
    image: [image],
  } = useContext(AppContext)!;
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const viewerRef = React.useRef<OpenSeadragon.Viewer>;
  const getClick = (x: number, y: number,  mouseButtonType: number): modelInputProps => {
    // const clickType = 1;
    return { x, y, clickType: mouseButtonType };
  };
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/data/newfinal.jpg";
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
  }, []);
  // Get mouse position and scale the (x, y) coordinates back to the natural
  // scale of the image. Update the state of clicks with setClicks to trigger
  // the ONNX model to run and generate a new mask via a useEffect in App.tsx

  const handleMouseClick = (
      viewerRef: React.RefObject<OpenSeadragon.Viewer>,
      e: any,
      click_target: string = ""
  ) => {
    let el = e.target;

    if (el) {
      let x, y;
      // Determine the mouse button (left click = 1, right click = 0)
      const isCtrlClick = e.shiftKey && e.button === 0;
      const mouseButtonType = isCtrlClick ? 0 : 1;
      // Check if the click was on the OpenSeadragon viewer
      if (click_target === "osd" && viewerRef.current) {
        // console.log("click on osd");
        // Get the click coordinates relative to the viewer
        const rect = viewerRef.current.element.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        // Convert the click coordinates from viewport coordinates to image coordinates
        const webPoint = new OpenSeadragon.Point(x, y);
        const viewportPoint = viewerRef.current.viewport.pointFromPixel(webPoint);
        const imagePoint = viewerRef.current.viewport.viewportToImageCoordinates(viewportPoint);
        const imageActual = viewerRef.current.world.getItemAt(0).getContentSize();
        x = imagePoint.x / (imageActual.x / imageSize.width);
        y = imagePoint.y / (imageActual.y / imageSize.height);
      } else {
        // Handle click on other elements (as before)
        const rect = el.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        // console.log("x: ", x, "y: ", y);
      }

      if (mouseButtonType !== null) {
        const click = getClick(x, y, mouseButtonType);
        if (click) {
          // @ts-ignore
          if (clicks) setClicks([...clicks, click]);
          else setClicks([click]);
        }
      }
    }
  };


  const flexCenterClasses = "flex items-center justify-center";
  return (
    <div className={`${flexCenterClasses} w-full h-full`}>
      <div className={`${flexCenterClasses} relative w-[90%] h-[90%]`}>
        <OpenCvProvider openCvPath="/opencv/opencv.js">
          <Tool handleMouseClick={handleMouseClick} />
        </OpenCvProvider>
      </div>
    </div>
  );
};

export default Stage;
