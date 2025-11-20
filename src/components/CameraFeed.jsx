import React, { useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { handTrackingService } from '../services/HandTrackingService';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';

const CameraFeed = ({ onLandmarksDetected }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

    const draw = useCallback((landmarks) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const drawingUtils = new DrawingUtils(ctx);

        for (const landmark of landmarks) {
            drawingUtils.drawConnectors(landmark, HandLandmarker.HAND_CONNECTIONS, {
                color: '#38bdf8', // accent-primary
                lineWidth: 2
            });
            drawingUtils.drawLandmarks(landmark, {
                color: '#f8fafc', // text-primary
                lineWidth: 1,
                radius: 3
            });
        }
    }, []);

    const loop = useCallback(() => {
        if (
            typeof webcamRef.current !== 'undefined' &&
            webcamRef.current !== null &&
            webcamRef.current.video.readyState === 4
        ) {
            const video = webcamRef.current.video;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            // Set canvas dimensions to match video
            if (canvasRef.current) {
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;
            }

            const results = handTrackingService.detect(video);

            if (results && results.landmarks) {
                draw(results.landmarks);
                if (onLandmarksDetected) {
                    try {
                        onLandmarksDetected(results.landmarks);
                    } catch (err) {
                        console.error("Error in onLandmarksDetected:", err);
                    }
                }
            }
        }
        requestRef.current = requestAnimationFrame(loop);
    }, [draw, onLandmarksDetected]);

    useEffect(() => {
        const init = async () => {
            await handTrackingService.initialize();
            requestRef.current = requestAnimationFrame(loop);
        };
        init();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [loop]);

    return (
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900">
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }} // Mirror the canvas to match
            />
        </div>
    );
};

export default CameraFeed;
