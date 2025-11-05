import { Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

let tf: any = null;

if (Platform.OS === "web") {
  tf = require("@tensorflow/tfjs");
}

let isModelReady = false;
let model: any = null;

export async function initializeModel(): Promise<void> {
  if (isModelReady) return;
  
  if (Platform.OS !== "web" || !tf) {
    throw new Error("TensorFlow.js is only supported on web");
  }
  
  console.log("Initializing TensorFlow.js...");
  await tf.ready();
  console.log("TensorFlow.js ready");
  
  console.log("Loading MNIST model...");
  try {
    model = await tf.loadLayersModel(
      "https://storage.googleapis.com/tfjs-models/tfjs/mnist_conv_v1/model.json"
    );
    isModelReady = true;
    console.log("MNIST model loaded successfully");
  } catch (error) {
    console.error("Failed to load MNIST model:", error);
    throw error;
  }
}

export function isModelInitialized(): boolean {
  return isModelReady;
}

async function preprocessImage(imageUri: string): Promise<any> {
  console.log("Preprocessing image:", imageUri);
  
  const response = await fetch(imageUri);
  const imageBlob = await response.blob();
  const imageBitmap = await createImageBitmap(imageBlob);
  
  const canvas = document.createElement("canvas");
  canvas.width = 28;
  canvas.height = 28;
  const ctx = canvas.getContext("2d")!;
  
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 28, 28);
  
  ctx.drawImage(imageBitmap, 0, 0, 28, 28);
  
  const imageData = ctx.getImageData(0, 0, 28, 28);
  const data = imageData.data;
  
  const grayscale = new Float32Array(28 * 28);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r + g + b) / 3;
    grayscale[i / 4] = gray / 255.0;
  }
  
  const tensor = tf.tensor4d(grayscale, [1, 28, 28, 1]);
  return tensor;
}

export async function recognizeDigitFromCanvas(
  canvasRef: any
): Promise<{ digit: string; confidence: number } | null> {
  if (!isModelReady || !model) {
    console.warn("Model not ready");
    return null;
  }
  
  try {
    console.log("Capturing canvas...");
    const uri = await captureRef(canvasRef, {
      format: "png",
      quality: 1,
      result: "data-uri",
    });
    
    console.log("Canvas captured, preprocessing...");
    const tensor = await preprocessImage(uri);
    
    console.log("Running prediction...");
    const prediction = model.predict(tensor) as any;
    const probabilities = await prediction.data();
    
    let maxProb = -1;
    let maxIndex = -1;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }
    
    tensor.dispose();
    prediction.dispose();
    
    console.log("Prediction:", { digit: maxIndex, confidence: maxProb });
    
    if (maxProb < 0.3) {
      console.log("Confidence too low");
      return null;
    }
    
    return {
      digit: maxIndex.toString(),
      confidence: maxProb,
    };
  } catch (error) {
    console.error("Recognition error:", error);
    return null;
  }
}
