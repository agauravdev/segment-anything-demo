// This source code is licensed under the license found in the
// LICENSE file in the root directory of this source tree.

import React, { useContext, useEffect, useState } from "react";
import Tool from "./Tool";
import { modelInputProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

import OpenSeadragon from "openseadragon";
const Stage = () => {
  const {
    clicks: [, setClicks],
    image: [image],
  } = useContext(AppContext)!;
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const viewerRef = React.useRef<OpenSeadragon.Viewer>;
  const getClick = (x: number, y: number): modelInputProps => {
    const clickType = 1;
    return { x, y, clickType };
  };
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/data/image.jpg";
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
  }, []);
  console.log(imageSize);
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
      // Check if the click was on the OpenSeadragon viewer
      if (click_target === "osd" && viewerRef.current) {
        console.log(e, "e.position");
        console.log(viewerRef.current, "viewerRef");
        // console.log("click on osd");
        // Get the click coordinates relative to the viewer
        const rect = viewerRef.current.element.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        console.log("x: ", x, "y: ", y);
        // Convert the click coordinates from viewport coordinates to image coordinates
        const webPoint = new OpenSeadragon.Point(x, y);
        console.log(webPoint, "webpoint");
        const viewportPoint =
          viewerRef.current.viewport.pointFromPixel(webPoint);
        const imagePoint =
          viewerRef.current.viewport.viewportToImageCoordinates(viewportPoint);
        console.log(imagePoint, "imagepoint");
        console.log(viewportPoint, "viewportpoint");
        console.log(imageSize.width, imageSize.height, "image size");
        const imageActual = viewerRef.current.world
          .getItemAt(0)
          .getContentSize();
        console.log(imageActual, "imageactual");
        x = imagePoint.x / (imageActual.x / imageSize.width); //1.801
        y = imagePoint.y / (imageActual.y / imageSize.height);

        console.log(imagePoint.x / imageSize.width, "ans");

        // x = imagePoint.x / 1.801; //1.801
        // y = imagePoint.y / 1.801;

        // Adjust for zoom level and pan
        // const zoom = viewerRef.current.viewport.getZoom(true);
        // console.log(zoom, "zoom");
        // x /= zoom;
        // y /= zoom;

        console.log("x: ", x, "y: ", y, "if osd coordinates");
      } else {
        console.log("click on image");
        // Handle click on the image (as before)
        const rect = el.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        // console.log("x: ", x, "y: ", y);
      }
      // const imageScale = image ? image.width / el.offsetWidth : 1;
      // x *= imageScale;
      // y *= imageScale;
      console.log("x: ", x, "y: ", y, "final coordinates to pass");
      const click = getClick(x, y);
      if (click) setClicks([click]);
    }
  };

  const flexCenterClasses = "flex items-center justify-center";
  return (
    <div className={`${flexCenterClasses} w-full h-full`}>
      <div className={`${flexCenterClasses} relative w-[90%] h-[90%]`}>
        <Tool handleMouseClick={handleMouseClick} />
      </div>
    </div>
  );
};

export default Stage;
