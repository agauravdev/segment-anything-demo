import Annotorious from "@recogito/annotorious-openseadragon";
import "@recogito/annotorious-openseadragon/dist/annotorious.min.css";
import OpenSeadragon from "openseadragon";
import React, { useContext, useEffect, useState } from "react";
import * as _ from "underscore";
import { ToolProps } from "./helpers/Interfaces";
import AppContext from "./hooks/createContext";

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
  const annotoriousRef = React.useRef(null);

  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = "/assets/data/newfinal.jpg";
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
  }, []);


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
      minX,
      minY,

      width,
      height,
    };
  };

  // Initialize the OSD viewer
  useEffect(() => {
    if (image) {
      const viewer = OpenSeadragon({
        id: "openseadragon-viewer",
        prefixUrl: "/assets/newfinal_files/",
        tileSources: "/assets/newfinal.dzi",

        // prefixUrl: "/assets/image_files/",
        // tileSources: "/assets/image.dzi",

        // prefixUrl: "/assets/new_image_files/",
        // tileSources: "/assets/newimage.dzi",

        gestureSettingsMouse: {
          clickToZoom: false
        }
      });
      viewerRef.current = viewer;

      viewer.addHandler("canvas-click", (event: any) => {
        handleMouseClick(viewerRef, event, "osd");
      });

      const config = {
        disableEditor: true,
        readOnly: false,
        widgets: [],
      };

      // init annnotorious
      annotoriousRef.current = Annotorious(viewer, config);
    }
    return () => {
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [image]);


  // Render bbox on OSD whenever segmentation happens
  useEffect(() => {

    if (!boundingBox) {
      return;
    }

    const viewer = viewerRef.current as OpenSeadragon.Viewer;

    const { minX, minY, width, height } = boundingBox;

    const point: OpenSeadragon.Point = new OpenSeadragon.Point(
      boundingBox.minX,
      boundingBox.minY
    );
    const viewPixel = viewer.viewport.pixelFromPoint(point);

    console.log("boundingBox", boundingBox);
    const point1 = viewer.viewport.imageToViewportCoordinates(point);

    const point2 = viewer.viewport.imageToViewportCoordinates(
      minX + width,
      minY + height
    );

    console.log("point1", point1, "point2", point2);

    const viewerMinX = point1.x;
    const viewerMinY = point1.y;
    const viewerWidth = point2.x;
    const viewerHeight = point2.y;

    const annotorious = annotoriousRef.current! as any;

    const w3cAnno = {
      id: Date.now(),
      type: "Annotation",
      target: {
        selector: {
          conformsTo: "http://www.w3.org/TR/media-frags/",
          type: "FragmentSelector",
          value: `xywh=pixel:${boundingBox.minX + 1750},${
            boundingBox.minY + 750
          },${boundingBox.width + 600},${boundingBox.height + 400}`,

          // value: `xywh=pixel:${viewerMinX},${viewerMinY},${viewerWidth},${viewerHeight}`,
          // left, top, Width, Height
        },
      },
    };

    annotorious.clearAnnotations();
    annotorious.addAnnotation(w3cAnno, true);

  }, [boundingBox]);

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

  const imageClasses = "";
  const maskImageClasses = `absolute opacity-40 pointer-events-none`;

  // Render the image and the predicted mask image on top
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {image && (
        <div style={{ position: "relative" }}>
          <img
            // onClick={handleMouseClick}
            onMouseOut={() => _.defer(() => setMaskImg(null))}
            // onTouchStart={handleMouseClick}
            src={image.src}
            className={`${
              shouldFitToWidth ? "w-300" : "h-100"
            } ${imageClasses}`}
          ></img>
          {boundingBox && (
            <>
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
            </>
          )}
        </div>
      )}
      <br />
      <br />
      <div
        id="openseadragon-viewer"
        onClick={(e) => handleMouseClick(viewerRef, e, "osd")}
        onMouseOut={() => _.defer(() => setMaskImg(null))}
        onTouchStart={(e) => handleMouseClick(viewerRef, e, "osd")}
        style={{ width: "800px", height: "400px" }}
      ></div>

      {maskImg && (
        <>
          <img
            src={maskImg.src}
            className="absolute opacity-40 pointer-events-none"
          ></img>
        </>
      )}
    </div>
  );
};
export default Tool;
