import Annotorious from "@recogito/annotorious-openseadragon";
import "@recogito/annotorious-openseadragon/dist/annotorious.min.css";
import { useOpenCv } from "opencv-react-ts";
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
  const { loaded: cvLoaded, cv } = useOpenCv();
  const {
    image: [image],
    maskImg: [maskImg, setMaskImg],
    tiledImage: [tiledImage],
  } = useContext(AppContext)!;

  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null);
  const annotoriousRef = React.useRef(null);

  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [localCoords, setLocalCoords] = useState<any>([]);

  const findContourPolygon = (maskImg: HTMLImageElement) => {
    const chunk = (array: string | any[], size: number) => {
      const chunked_arr = [];
      let index = 0;
      while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
      }
      return chunked_arr;
    };
    if (cvLoaded && cv) {
      const src = cv.imread(maskImg);
      const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
      const color = new cv.Scalar(255, 255, 255); // white color

      // Convert to grayscale & threshold
      cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
      cv.threshold(src, src, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        src,
        contours,
        hierarchy,
        cv.RETR_CCOMP,
        cv.CHAIN_APPROX_NONE
      );

      let largestAreaPolygon = { area: 0, polygon: new cv.Mat() };
      //@ts-ignore
      for (let i = 0; i < contours.size(); ++i) {
        const polygon = new cv.Mat();
        const contour = contours.get(i);

        cv.approxPolyDP(contour, polygon, 1, true);

        // Compute contour areas
        const area = cv.contourArea(polygon);
        if (area > largestAreaPolygon.area)
          largestAreaPolygon = { area, polygon };
        contour.delete();
      }

      const localCoords = chunk(
        Array.from(largestAreaPolygon.polygon.data32S),
        2
      );
      setLocalCoords(localCoords);
      return localCoords;
    }
  };

  useEffect(() => {
    if (cvLoaded && cv) {
      console.log("LOADED OPENCV");
      if (!maskImg) return;

      const maskImage = new Image();
      maskImage.onload = () => {
        //starts:
        const localCoords = findContourPolygon(maskImage);
        console.log("localCoords", localCoords);
      };
      maskImage.src = maskImg.src;
    }
  }, [cvLoaded, maskImg]);

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
          clickToZoom: false,
        },
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

    const tiledImage = viewer.world.getItemAt(0); // Assuming you're interested in the first image

    const { minX, minY, width, height } = boundingBox;

    // Note: Ideally source image and tiled image should have same resolution
    const SOURCE_IMG_NATURAL_WIDTH = image?.width!;
    const SOURCE_IMG_NATURAL_HEIGHT = image?.height!;
    const TILED_IMG_WIDTH = tiledImage.source.dimensions.x;
    const TILED_IMG_HEIGHT = tiledImage.source.dimensions.y;

    const scaleX = TILED_IMG_WIDTH / SOURCE_IMG_NATURAL_WIDTH;
    const scaleY = TILED_IMG_HEIGHT / SOURCE_IMG_NATURAL_HEIGHT;

    const annotorious = annotoriousRef.current! as any;
    const points = localCoords
      .map((localCoords: any[]) =>
        [localCoords[0] * scaleX, localCoords[1] * scaleY].join(",")
      )
      .join(" ");
    console.log(points, "points");

    const w3cAnno = {
      id: Date.now(),
      type: "Annotation",
      target: {
        selector: {
          conformsTo: "http://www.w3.org/TR/media-frags/",
          // type: "FragmentSelector",
          // value: `xywh=pixel:${minX * scaleX}, ${minY * scaleY}, ${
          //   width * scaleX
          // }, ${height * scaleY}`,
          type: "SvgSelector",
          value: `<svg><polygon points='${points}'></polygon></svg>`,
        },
      },
    };
    console.log(localCoords, "localCoords");
    annotorious.clearAnnotations();
    annotorious.addAnnotation(w3cAnno, true);
  }, [boundingBox, localCoords]);

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
        // onMouseOut={() => _.defer(() => setMaskImg(null))}
        onTouchStart={(e) => handleMouseClick(viewerRef, e, "osd")}
        style={{ width: "800px", height: "400px" }}
      ></div>
      {/* 
      {maskImg && (
        <>
          <img
            src={maskImg.src}
            // className="absolute opacity-40 pointer-events-none"
          ></img>
        </>
      )} */}
    </div>
  );
};
export default Tool;
