
import "@recogito/annotorious-openseadragon/dist/annotorious.min.css";
import OpenSeadragon from "openseadragon";
import React, { useContext, useEffect, useState } from "react";
import * as _ from "underscore";
import { ToolProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

import "@recogito/annotorious-openseadragon/dist/annotorious.min.css";
interface BoundingBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

const Tool = ({ handleMouseClick }: ToolProps) => {
  const {
    image: [image],
    maskImg: [maskImg, setMaskImg],
    tiledImage: [tiledImage],
  } = useContext(AppContext)!;
  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);

  useEffect(() => {
    console.log(location.origin);
    if (image) {
      const viewer = OpenSeadragon({
        id: "openseadragon-viewer",
        // prefixUrl: "/assets/newfinal_files/",
        // tileSources: "/assets/newfinal.dzi",

        prefixUrl: "/assets/image_files/",
        tileSources: "/assets/image.dzi",

        // prefixUrl: "/assets/new_image_files/",
        // tileSources: "/assets/newimage.dzi",
      });
      viewerRef.current = viewer;

      viewer.addHandler("canvas-click", (event: any) => {
        // console.log(event.position, "event.position use effect");
        // console.log();
        handleMouseClick(viewerRef, event, "osd");
      });
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [image]);

  useEffect(() => {
    // Render bounding box whenever maskImg changes
    if (maskImg) {
      setBoundingBox(renderBoundingBox());
    }
  }, [maskImg]);
  // Determine if we should shrink or grow the images to match the
  // width or the height of the page and setup a ResizeObserver to
  // monitor changes in the size of the page

  const [shouldFitToWidth, setShouldFitToWidth] = useState(true);
  const bodyEl = document.body;
  const fitToPage = () => {
    if (!image) return;
    const imageAspectRatio = image.width / image.height;
    const screenAspectRatio = window.innerWidth / window.innerHeight;
    setShouldFitToWidth(imageAspectRatio > screenAspectRatio);
  };
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === bodyEl) {
        fitToPage();
      }
    }
  });

  useEffect(() => {
    fitToPage();
    resizeObserver.observe(bodyEl);
    return () => {
      resizeObserver.unobserve(bodyEl);
    };
  }, [image]);

  const renderBoundingBox = () => {
    if (!maskImg) return null; // If mask image is not available, return null

    const canvas = document.createElement("canvas");
    canvas.width = maskImg.width;
    canvas.height = maskImg.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(maskImg, 0, 0); // Draw mask image on canvas

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    // Iterate over the pixels to find bounding box coordinates
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const alpha = pixels[index + 3]; // Alpha channel (transparency)
        if (alpha > 0) {
          // If pixel is not transparent (part of mask)
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Calculate width and height of bounding box
    const width = maxX - minX;
    const height = maxY - minY;

    // Render bounding box
    return {
      minX: minX + 310,
      minY: minY + 5,
      // minY: minY - 5,
      // minX: minX + 375,
      width,
      height,
    };
  };

  const imageClasses = "";
  const maskImageClasses = `absolute opacity-40 pointer-events-none`;

  // Render the image and the predicted mask image on top
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {image && (
        <img
          // onClick={handleMouseClick}
          onMouseOut={() => _.defer(() => setMaskImg(null))}
          // onTouchStart={handleMouseClick}
          src={image.src}
          className={`${shouldFitToWidth ? "w-300" : "h-100"} ${imageClasses}`}
        ></img>
      )}
      <br />
      <br />
      <div
        id="openseadragon-viewer"
        onClick={(e) => handleMouseClick(viewerRef, e, "osd")}
        onMouseOut={() => _.defer(() => setMaskImg(null))}
        onTouchStart={(e) => handleMouseClick(viewerRef, e, "osd")}
        style={{ width: "500px", height: "200px" }}
      >
        {boundingBox && (
          <div
            style={{
              position: "absolute",
              left: `${boundingBox.minX}px`, // Correctly position the bounding box
              top: `${boundingBox.minY}px`, // Correctly position the bounding box
              width: `${boundingBox.width}px`, // Correctly size the bounding box
              height: `${boundingBox.height}px`, // Correctly size the bounding box
              border: "2px solid red",
            }}
          ></div>
        )}
      </div>

      {maskImg && (
        <img
          src={maskImg.src}
          className="absolute opacity-40 pointer-events-none"
        ></img>
      )}
    </div>
  );
};
export default Tool;
