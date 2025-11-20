import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

class HandTrackingService {
    constructor() {
        this.handLandmarker = null;
        this.runningMode = 'VIDEO';
        this.isInitializing = false;
    }

    async initialize() {
        if (this.handLandmarker || this.isInitializing) return;

        this.isInitializing = true;
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: this.runningMode,
                numHands: 1, // Focus on one hand for clarity in basic letters
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            console.log('HandLandmarker initialized');
        } catch (error) {
            console.error('Error initializing HandLandmarker:', error);
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    detect(videoElement) {
        if (!this.handLandmarker) return null;

        // Ensure the video has data
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return null;

        try {
            return this.handLandmarker.detectForVideo(videoElement, performance.now());
        } catch (error) {
            console.error('Error during detection:', error);
            return null;
        }
    }
}

export const handTrackingService = new HandTrackingService();
