import React, { useState, useRef } from 'react';
import init, { predict } from 'brique-demo-wasm';
import './App.css';

  
function SquaredGrid({n, data}: {n: number, data: number[]}) {
  const elements = Array.from({length: n}, (_, index) => (
    <div key={index} className='box' style={{opacity: data[index]/255}}>{index}</div>
  ));
  return <div className='grid'>{elements}</div>
} 

function DrawingCanvas({penWidth} : {penWidth: number}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const initialPixelMap = new Array(28*28).fill(0);
  const [pixelMap, setPixelMap] = useState<number[]>(initialPixelMap);
  const [prediction, setPrediction] = useState<number>(0);
  const [prob, setProb] = useState<number>(0);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
    getPixelMap();
  }

  function stopDrawing() {
    setDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    ctx.clearRect(0,0, canvas.width, canvas.height);
    getPixelMap();
  }

  function getPixelMap() {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let rawPixelMap: number[] = [];
    
    for (let i = 3; i < imageData.data.length; i += 4) {
       rawPixelMap.push(imageData.data[i]);
    }

    const newPixelMap = resizeBitmap(rawPixelMap, canvas.width, canvas.height);
    setPixelMap(newPixelMap);
  }

  
  function resizeBitmap(
    src: number[], 
    srcWidth: number, 
    srcHeight: number, 
    targetWidth: number = 28, 
    targetHeight: number = 28
  ): number[] {
    const dst = new Array(targetWidth * targetHeight).fill(0);
    const scaleX = srcWidth / targetWidth;
    const scaleY = srcHeight / targetHeight;
  
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Map target pixel to source position
        const srcX = x * scaleX;
        const srcY = y * scaleY;
        
        // Get integer coordinates
        const x0 = Math.floor(srcX);
        const x1 = Math.min(x0 + 1, srcWidth - 1);
        const y0 = Math.floor(srcY);
        const y1 = Math.min(y0 + 1, srcHeight - 1);
  
        // Get fractional parts
        const dx = srcX - x0;
        const dy = srcY - y0;
  
        // Get pixel values
        const p00 = src[y0 * srcWidth + x0];
        const p10 = src[y0 * srcWidth + x1];
        const p01 = src[y1 * srcWidth + x0];
        const p11 = src[y1 * srcWidth + x1];
  
        // Bilinear interpolation
        const interpolated =
          p00 * (1 - dx) * (1 - dy) +
          p10 * dx * (1 - dy) +
          p01 * (1 - dx) * dy +
          p11 * dx * dy;
  
        dst[y * targetWidth + x] = Math.round(interpolated);
      }
    }
  
    return dst;
  }


  function readBinaryFile(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(new Uint8Array(reader.result));
            } else {
                reject(new Error("Failed to read file as ArrayBuffer"));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
  }

  async function processModel() {
      const response = await fetch("mnist_128x128_0.9775.brq"); 
      const blob = await response.blob(); 
  
      const byteArray = await readBinaryFile(blob);
      return byteArray;
  }

  function getIndexOfMaxValue(arr: Float64Array): number {
    if (arr.length === 0) {
      throw new Error("Array is empty");
    }

    return arr.reduce((maxIndex, currentValue, currentIndex, array) => {
      return currentValue > array[maxIndex] ? currentIndex : maxIndex;
    }, 0);
  }

  function getMaxValue(arr:Float64Array): number {
    return arr.reduce((max, current) => {
      return current > max ? current : max;}, arr[0]);
  }

  async function modelEvaluation() {
    let output = await processModel()
    await init();
     let image_input = Float64Array.from(pixelMap);
     let model_output = predict(output, image_input);
    
    setPrediction(getIndexOfMaxValue(model_output));
    setProb(getMaxValue(model_output));
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ border: "1px solid black", background: "white" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      <button onClick={clear}>Clear</button>
      <button onClick={modelEvaluation}>Predict</button>
      <p style={{color: "black"}}>I think it's a {prediction}</p>
      <p style={{color: "black"}}>Certainty : {prob*100}%</p>
      <SquaredGrid n={28*28} data={pixelMap}/>
    </div>
  );
}

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <DrawingCanvas penWidth={30}/>
      </header>
    </div>
  );
}

export default App;
